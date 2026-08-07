<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { NIcon, NButton, NDatePicker, NDropdown, NDynamicTags, NPopover, useMessage, useDialog } from 'naive-ui'
import { ArrowBackOutline, ArrowForwardOutline, CalendarOutline, CreateOutline, EllipsisHorizontalOutline, EyeOutline } from '@vicons/ionicons5'
import MoodPicker from './MoodPicker.vue'
import { useDiaryStore } from '../../stores/diary'
import { useSettingsStore } from '../../stores/settings'
import { todayKey, toDateKey } from '../../types'
import { mdToHtml } from '../../lib/markdown'
import { copyTodayDone, saveTextFile, diaryToMarkdown } from '../../services/export'
import { holidayOf } from '../../services/holiday'

const diary = useDiaryStore()
const settings = useSettingsStore()
const message = useMessage()
const dialog = useDialog()
const editorRef = ref<HTMLTextAreaElement | null>(null)
const previewMode = ref(false)
const datePop = ref(false)

const phraseOptions = computed(() =>
  settings.settings.quickPhrases.map((p, i) => ({ label: p, key: String(i) })),
)

/** 最近几天快捷跳转（补写场景） */
const recentDays = computed(() => {
  const now = new Date()
  return [
    { label: '今天', offset: 0 },
    { label: '昨天', offset: 1 },
    { label: '前天', offset: 2 },
    { label: '三天前', offset: 3 },
  ].map(({ label, offset }) => {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    return { label, key: toDateKey(d) }
  })
})

const dateLabel = computed(() => {
  const d = new Date(diary.date + 'T00:00:00')
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${week}`
})

/** 当前日期的节假日标注（放假如为紫、调休上班为蓝） */
const holidayTag = computed(() => holidayOf(diary.date))

const isToday = computed(() => {
  const now = new Date()
  const t = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  return diary.date === t
})

const saveText = computed(() => {
  switch (diary.saveState) {
    case 'saving':
      return '保存中…'
    case 'saved':
      return '已保存'
    default:
      return '编辑中…'
  }
})

/** 常用标签推荐（历史出现频次最高的前 8 个） */
const commonTags = computed(() => {
  const freq = new Map<string, number>()
  for (const d of diary.allDiaries) {
    for (const t of d.tags) freq.set(t, (freq.get(t) ?? 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 8)
})

function addTag(t: string) {
  if (!diary.tags.includes(t)) diary.setTags([...diary.tags, t])
}

/** 在光标处插入文本 */
function insertAtCursor(text: string) {
  const el = editorRef.value
  const pos = el?.selectionStart ?? diary.content.length
  const next = diary.content.slice(0, pos) + text + diary.content.slice(pos)
  diary.setContent(next)
  void nextTick(() => {
    if (el) el.selectionStart = el.selectionEnd = pos + text.length
  })
}

function onPhraseSelect(key: string) {
  const p = settings.settings.quickPhrases[Number(key)]
  if (p) insertAtCursor(p)
}

/** 输入完 "1. " 后回车自动接 "2. " */
async function onKeydown(e: KeyboardEvent) {
  if (e.isComposing || e.key !== 'Enter') return
  const el = e.target as HTMLTextAreaElement
  const pos = el.selectionStart
  const lineStart = el.value.lastIndexOf('\n', pos - 1) + 1
  const line = el.value.slice(lineStart, pos)
  const m = line.match(/^\s*(\d+)([.、])(\s?)/)
  if (!m) return
  const rest = el.value.slice(pos)
  if (rest && !rest.startsWith('\n')) return // 光标不在行尾，不做续号
  e.preventDefault()
  const n = Number(m[1]) + 1
  const insert = `\n${n}${m[2]}${m[3]}`
  diary.setContent(el.value.slice(0, pos) + insert + el.value.slice(pos))
  await nextTick()
  el.selectionStart = el.selectionEnd = pos + insert.length
}

function focusEditor() {
  if (!previewMode.value) editorRef.value?.focus()
}

function togglePreview() {
  previewMode.value = !previewMode.value
}

/** 弹出日历选择具体日期 */
function onPickDate(v: string | null) {
  if (!v) return
  void diary.goToDate(v)
  datePop.value = false
}

/** 全局快捷键：Ctrl+S 保存、Ctrl+Enter 保存并下一天、Alt+←/→ 切日期、Alt+P 预览 */
function onShortcut(e: KeyboardEvent) {
  if (e.isComposing) return
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    void diary.saveNow(true)
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    void diary.saveNow(true)
    diary.goNextDay()
  } else if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault()
    diary.goPrevDay()
  } else if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault()
    diary.goNextDay()
  } else if (e.altKey && e.key.toLowerCase() === 'p') {
    e.preventDefault()
    togglePreview()
  }
}

const rendered = computed(() => mdToHtml(diary.content))

async function handleCopyTodayDone() {
  const ok = await copyTodayDone(diary.content)
  if (ok) message.success('已复制「今日完成」')
  else message.info('当前内容中没有「今日完成」章节')
}

async function handleExportMd() {
  await diary.saveNow(true)
  const cur = diary.currentDiary
  if (!cur || !cur.content.trim()) {
    message.info('当前日期还没有内容可导出')
    return
  }
  const ok = await saveTextFile(diaryToMarkdown(cur), `日报-${cur.date}.md`)
  if (ok) message.success('已导出 md')
}

function handleDelete() {
  dialog.warning({
    title: '删除此篇',
    content: `确定删除 ${diary.date} 的日报吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await diary.backend?.deleteByDate(diary.date)
      await diary.reload()
      await diary.goToDate(diary.date)
      message.success('已删除')
    },
  })
}

const menuOptions = [
  { label: '复制今日完成', key: 'copy' },
  { label: '导出 md', key: 'export' },
  { type: 'divider' as const, key: 'd1' },
  { label: '删除此篇', key: 'delete' },
]

function onMenuSelect(key: string) {
  if (key === 'copy') void handleCopyTodayDone()
  else if (key === 'export') void handleExportMd()
  else if (key === 'delete') handleDelete()
}

onMounted(focusEditor)
watch(() => diary.date, focusEditor)
</script>

<template>
  <div class="editor-shell" @keydown="onShortcut">
    <!-- 顶栏：日期切换 + 保存状态 + 更多操作 -->
    <div class="editor-toolbar app-card no-print">
      <div class="date-nav">
        <button class="day-btn" title="前一天" @click="diary.goPrevDay()">
          <n-icon :component="ArrowBackOutline" :size="16" />
        </button>
        <div class="date-title">
          <n-popover
            v-model:show="datePop"
            trigger="click"
            placement="bottom-start"
            :show-arrow="false"
          >
            <template #trigger>
              <button class="date-pick-btn" data-no-drag title="选择日期">
                <n-icon :component="CalendarOutline" :size="15" />
                <span class="dt-main">{{ dateLabel }}</span>
                <span v-if="holidayTag" class="dt-holiday" :class="holidayTag.type">
                  {{ holidayTag.name }}
                </span>
              </button>
            </template>
            <n-date-picker
              type="date"
              panel
              :formatted-value="diary.date"
              value-format="yyyy-MM-dd"
              @update:formatted-value="onPickDate"
            />
          </n-popover>
          <button v-if="!isToday" class="dt-back" @click="diary.goToDate(todayKey())">
            今天
          </button>
        </div>
        <button class="day-btn" title="后一天" @click="diary.goNextDay()">
          <n-icon :component="ArrowForwardOutline" :size="16" />
        </button>
      </div>
      <div class="tb-right">
        <div class="tb-save">
          <span
            class="save-dot"
            :class="diary.saveState === 'saved' ? 'save-dot--saved' : diary.saveState === 'saving' ? 'save-dot--saving' : 'save-dot--idle'"
          />
          <span class="save-text">{{ saveText }}</span>
        </div>
        <n-dropdown :options="menuOptions" @select="onMenuSelect">
          <n-button quaternary circle size="small" title="更多操作">
            <template #icon><n-icon :component="EllipsisHorizontalOutline" :size="17" /></template>
          </n-button>
        </n-dropdown>
      </div>
    </div>

    <!-- 轻量行：心情 + 标签 -->
    <div class="editor-meta app-card no-print">
      <div class="meta-group">
        <span class="meta-label">心情</span>
        <MoodPicker :model-value="diary.mood" @update:model-value="diary.setMood" />
      </div>
      <div class="meta-group">
        <span class="meta-label">标签</span>
        <n-dynamic-tags
          :value="diary.tags"
          placeholder="+ 添加"
          size="small"
          style="min-width: 140px"
          @update:value="diary.setTags"
        />
        <div v-if="commonTags.length" class="common-tags">
          <span
            v-for="t in commonTags"
            :key="t"
            class="ct-chip"
            :class="{ on: diary.tags.includes(t) }"
            @click="addTag(t)"
          >
            #{{ t }}
          </span>
        </div>
      </div>
      <div class="meta-group">
        <span class="meta-label">短语</span>
        <n-dropdown :options="phraseOptions" @select="onPhraseSelect">
          <n-button size="small" secondary>短语</n-button>
        </n-dropdown>
        <span v-if="!phraseOptions.length" class="meta-empty">在设置页添加常用短语</span>
      </div>
    </div>

    <!-- 正文：大输入框（回车自动续号）或预览 -->
    <div class="editor-body app-card">
      <button class="preview-toggle" :title="previewMode ? '返回编辑' : '预览'" @click="togglePreview">
        <n-icon :component="previewMode ? CreateOutline : EyeOutline" :size="16" />
        {{ previewMode ? '编辑' : '预览' }}
      </button>
      <textarea
        v-if="!previewMode"
        ref="editorRef"
        class="plain-editor"
        :value="diary.content"
        :placeholder="'1.\n2.\n3.'"
        @input="diary.setContent(($event.target as HTMLTextAreaElement).value)"
        @keydown="onKeydown"
      />
      <div v-else class="preview-pane" v-html="rendered" />
      <div class="editor-footer">
        <span class="ef-left">{{ diary.currentWords }} 字 · 连续打卡 {{ diary.statsSummary.streak }} 天</span>
        <div class="ef-days">
          <button
            v-for="d in recentDays"
            :key="d.key"
            class="ef-day"
            :class="{ active: diary.date === d.key }"
            @click="diary.goToDate(d.key)"
          >
            {{ d.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.editor-toolbar {
  padding: 10px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}
.date-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
.day-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: var(--bg-inset);
  color: var(--text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--dur-fast) var(--ease-apple);
}
.day-btn:hover {
  background: var(--bg-active);
  color: var(--text-1);
}
.date-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.date-pick-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: transparent;
  color: var(--text-1);
  font-family: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all var(--dur-fast) var(--ease-apple);
}
.date-pick-btn:hover {
  background: var(--bg-hover);
}
.date-pick-btn .n-icon {
  color: var(--text-3);
}
.dt-main {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.dt-holiday {
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.4;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.dt-holiday.holiday {
  background: var(--holiday-soft);
  color: var(--holiday);
}
.dt-holiday.workday {
  background: var(--workday-soft);
  color: var(--workday);
}
.dt-back {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}
.dt-back:hover {
  background: var(--accent-soft);
}
.tb-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tb-save {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-3);
  font-size: 12px;
}

/* 轻量行：心情 + 标签 */
.editor-meta {
  padding: 8px 18px;
  display: flex;
  align-items: center;
  gap: 18px 28px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.meta-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.meta-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
}
.meta-empty {
  font-size: 12px;
  color: var(--text-3);
}
.common-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.ct-chip {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-inset);
  color: var(--text-3);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-apple);
}
.ct-chip:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.ct-chip.on {
  background: var(--accent-soft);
  color: var(--accent);
}

/* 正文 */
.editor-body {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.preview-toggle {
  position: absolute;
  top: 12px;
  right: 14px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: var(--bg-inset);
  color: var(--text-2);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-apple);
}
.preview-toggle:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.plain-editor {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text-1);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 2;
  padding: 18px 24px 52px;
  text-shadow: var(--text-shadow);
}
.plain-editor::placeholder {
  color: var(--text-3);
  opacity: 0.65;
}

/* 预览 */
.preview-pane {
  height: 100%;
  overflow: auto;
  padding: 18px 24px 52px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-1);
  text-shadow: var(--text-shadow);
}
.preview-pane :deep(h1),
.preview-pane :deep(h2),
.preview-pane :deep(h3),
.preview-pane :deep(h4) {
  margin: 0.8em 0 0.4em;
  line-height: 1.4;
}
.preview-pane :deep(h1) {
  font-size: 1.4em;
}
.preview-pane :deep(h2) {
  font-size: 1.25em;
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
}
.preview-pane :deep(h3) {
  font-size: 1.1em;
}
.preview-pane :deep(p) {
  margin: 6px 0;
}
.preview-pane :deep(ul),
.preview-pane :deep(ol) {
  padding-left: 22px;
  margin: 6px 0;
}
.preview-pane :deep(li) {
  margin: 3px 0;
}
.preview-pane :deep(blockquote) {
  border-left: 3px solid var(--border-strong);
  padding-left: 12px;
  color: var(--text-3);
  margin: 8px 0;
}
.preview-pane :deep(pre) {
  background: var(--bg-inset);
  border-radius: 8px;
  padding: 10px 12px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 12.5px;
}
.preview-pane :deep(code) {
  font-family: var(--font-mono);
  background: var(--bg-inset);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12.5px;
}
.preview-pane :deep(pre code) {
  background: transparent;
  padding: 0;
}
.preview-pane :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 14px 0;
}
.preview-pane :deep(.table-row) {
  margin: 2px 0;
}
.preview-pane :deep(.task) {
  opacity: 1;
}

/* 底部工具条 */
.editor-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 24px;
  font-size: 12px;
  color: var(--text-3);
  background: linear-gradient(transparent, var(--bg-elevated) 35%);
}
.ef-days {
  display: flex;
  gap: 6px;
}
.ef-day {
  border: none;
  background: var(--bg-inset);
  color: var(--text-3);
  font-family: inherit;
  font-size: 12px;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-apple);
}
.ef-day:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.ef-day.active {
  background: var(--accent);
  color: #fff;
}
</style>
