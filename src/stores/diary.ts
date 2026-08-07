import { defineStore } from 'pinia'
import type { Diary } from '../types'
import { countWords, excerpt, stripMarkdown, todayKey, toDateKey } from '../types'
import { getBackend, type DiaryBackend } from '../services/db'
import { reminder } from '../services/reminder'
import { summary } from '../services/stats'
import { useSettingsStore } from './settings'

export type SaveState = 'idle' | 'saving' | 'saved'

/** 自动保存定时器（模块级，避免 Pinia 状态序列化） */
let saveTimer: ReturnType<typeof setTimeout> | null = null

interface SearchFilters {
  keyword: string
  tags: string[]
  from: string | null
  to: string | null
}

export const useDiaryStore = defineStore('diary', {
  state: () => ({
    backend: null as DiaryBackend | null,
    ready: false,

    // 当前编辑中的日记
    date: todayKey(),
    content: '',
    mood: '',
    tags: [] as string[],
    saveState: 'idle' as SaveState,
    loadedDate: todayKey(),

    // 缓存
    allDiaries: [] as Diary[],
    datesWithDiary: new Set<string>(),

    // 搜索
    search: {
      keyword: '',
      tags: [] as string[],
      from: null as string | null,
      to: null as string | null,
    } as SearchFilters,

    // 提醒
    bannerVisible: false,
    reminderToastVisible: false,
  }),

  getters: {
    todayWritten(state): boolean {
      return state.datesWithDiary.has(todayKey())
    },
    currentDiary(state): Diary | null {
      return state.allDiaries.find((d) => d.date === state.date) ?? null
    },
    currentDirty(state): boolean {
      const cur = state.allDiaries.find((d) => d.date === state.date)
      return (
        state.content !== (cur?.content ?? '') ||
        state.mood !== (cur?.mood ?? '') ||
        JSON.stringify(state.tags) !== JSON.stringify(cur?.tags ?? [])
      )
    },
    currentWords(): number {
      return countWords(this.content)
    },
    /** 搜索过滤结果（基于本地缓存，倒序） */
    searchResults(state): Diary[] {
      const kw = state.search.keyword.trim().toLowerCase()
      const tags = state.search.tags
      return state.allDiaries
        .filter((d) => {
          if (kw && !d.content.toLowerCase().includes(kw)) return false
          if (tags.length && !tags.every((t) => d.tags.includes(t))) return false
          if (state.search.from && d.date < state.search.from) return false
          if (state.search.to && d.date > state.search.to) return false
          return true
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    },
    /** 全历史标签 */
    allTags(state): string[] {
      const set = new Set<string>()
      for (const d of state.allDiaries) d.tags.forEach((t) => set.add(t))
      return [...set].sort()
    },
    statsSummary(state) {
      return summary(state.allDiaries)
    },
  },

  actions: {
    /* ---------- 初始化 ---------- */
    async init() {
      if (this.ready) return
      this.backend = await getBackend()
      await this.reload()
      // 直接加载当前日期（今天）的日记内容，不走 saveNow，避免覆盖已有内容
      const existing = this.allDiaries.find((d) => d.date === this.date)
      if (existing) {
        this.content = existing.content
        this.mood = existing.mood
        this.tags = [...existing.tags]
      }
      this.saveState = 'saved'
      // 提醒
      reminder.setTodayStatus(!this.todayWritten)
      reminder.onFire(() => {
        this.reminderToastVisible = true
        setTimeout(() => (this.reminderToastVisible = false), 6000)
      })
      reminder.start()
      this.ready = true
    },

    async reload() {
      if (!this.backend) return
      this.allDiaries = await this.backend.listAll()
      this.datesWithDiary = new Set(this.allDiaries.map((d) => d.date))
    },

    /* ---------- 编辑 ---------- */
    setContent(v: string) {
      this.content = v
      this.scheduleSave()
    },
    setMood(v: string) {
      this.mood = v
      this.scheduleSave()
    },
    setTags(v: string[]) {
      this.tags = v
      this.scheduleSave()
    },

    /** 3 秒无操作自动保存（模块级定时器，避免 Pinia 序列化） */
    scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer)
      this.saveState = 'idle'
      saveTimer = setTimeout(() => void this.saveNow(), 3000)
    },

    /** 立即保存当前编辑内容 */
    async saveNow(force = false) {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
      if (!force && !this.currentDirty) {
        this.saveState = 'saved'
        return
      }
      if (!this.content && !this.mood && this.tags.length === 0) {
        // 全空 → 视为未写，不落库
        this.saveState = 'saved'
        return
      }
      this.saveState = 'saving'
      try {
        const now = new Date().toISOString()
        await this.backend!.upsert({
          date: this.date,
          content: this.content,
          mood: this.mood,
          tags: this.tags,
          updated_at: now,
        })
        this.saveState = 'saved'
        await this.reload()
        this.loadedDate = this.date
        reminder.clear()
      } catch (e) {
        console.error('save failed', e)
        this.saveState = 'idle'
      }
    },

    /** 切换日期（保存旧日期内容后加载新日期） */
    async goToDate(dateKey: string) {
      if (!this.backend) return
      await this.saveNow(true)
      this.date = dateKey
      this.content = ''
      this.mood = ''
      this.tags = []
      this.loadedDate = dateKey
      const existing = this.allDiaries.find((d) => d.date === dateKey)
      if (existing) {
        this.content = existing.content
        this.mood = existing.mood
        this.tags = [...existing.tags]
      }
      this.saveState = 'saved'
    },

    goPrevDay() {
      const d = new Date(this.date + 'T00:00:00')
      d.setDate(d.getDate() - 1)
      void this.goToDate(toDateKey(d))
    },
    goNextDay() {
      const d = new Date(this.date + 'T00:00:00')
      d.setDate(d.getDate() + 1)
      void this.goToDate(toDateKey(d))
    },

    /* ---------- 搜索 ---------- */
    setSearchKeyword(kw: string) {
      this.search.keyword = kw
    },
    setSearchTags(tags: string[]) {
      this.search.tags = tags
    },
    setSearchRange(from: string | null, to: string | null) {
      this.search.from = from
      this.search.to = to
    },

    /* ---------- 提醒 ---------- */
    snoozeReminder() {
      const minutes = useSettingsStore().settings.snoozeMinutes
      reminder.snooze(minutes)
      this.bannerVisible = false
    },
    dismissBanner() {
      reminder.clear()
      this.bannerVisible = false
    },

    /* ---------- 统计辅助 ---------- */
    diaryExcerpt(d: Diary, len = 90) {
      return excerpt(d.content, len)
    },
    diaryTextLen(d: Diary) {
      return stripMarkdown(d.content).length
    },
  },
})
