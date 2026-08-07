<script setup lang="ts">
import { computed } from 'vue'
import { useDiaryStore } from '../../stores/diary'
import { useUiStore } from '../../stores/ui'
import { todayKey, toDateKey } from '../../types'
import { monthPrefix } from '../../services/stats'
import { holidayOf } from '../../services/holiday'
import { NIcon } from 'naive-ui'
import { CalendarOutline, CloseOutline, DocumentTextOutline, TrendingUpOutline } from '@vicons/ionicons5'

defineEmits<{ close: [] }>()

const diary = useDiaryStore()
const ui = useUiStore()

const s = computed(() => diary.statsSummary)
const thisMonth = computed(() => monthPrefix(todayKey()))
const monthCount = computed(() =>
  diary.allDiaries.filter((d) => d.date.startsWith(thisMonth.value)).length,
)

/** 最近 3 篇（排除当前日期） */
const recent = computed(() =>
  diary.allDiaries
    .filter((d) => d.date !== diary.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3),
)

/** 本月天数（点阵用） */
const monthDays = computed(() => {
  const [y, m] = thisMonth.value.split('-')
  return new Date(Number(y), Number(m), 0).getDate()
})

/** 某天的完整日期 + 周几（hover 提示） */
function dayTitle(i: number) {
  const key = `${thisMonth.value}-${String(i).padStart(2, '0')}`
  const d = new Date(key + 'T00:00:00')
  const base = `${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]}`
  const h = holidayOf(key)
  return h ? `${base}（${h.name}）` : base
}

/** 今天（直接显示，不隐藏） */
const todayLabel = computed(() => {
  const d = new Date(todayKey() + 'T00:00:00')
  const base = `${d.getMonth() + 1}月${d.getDate()}日 · 星期${'日一二三四五六'[d.getDay()]}`
  const h = holidayOf(todayKey())
  return h ? `${base} · ${h.name}` : base
})

/** 点阵中某天 */
function dayInfo(i: number) {
  const key = `${thisMonth.value}-${String(i).padStart(2, '0')}`
  return { key, holiday: holidayOf(key) }
}

/** 本周一到周五 */
const weekDays = computed(() => {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))
  const keys: string[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    keys.push(toDateKey(d))
  }
  return keys
})

const weekDone = computed(() => weekDays.value.filter((k) => diary.datesWithDiary.has(k)).length)
</script>

<template>
  <aside class="write-sidebar">
    <!-- 今日概览（flomo 式：写一条亮一格，激励坚持） -->
    <div class="ws-card app-card">
      <div class="ws-head">
        <n-icon :component="TrendingUpOutline" :size="15" />
        <span>今日概览</span>
        <button class="ws-close" title="收起" @click="$emit('close')">
          <n-icon :component="CloseOutline" :size="14" />
        </button>
      </div>
      <div class="ws-today">{{ todayLabel }}</div>
      <div class="ws-stats">
        <div class="ws-stat">
          <span class="ws-num">{{ s.streak }}</span>
          <span class="ws-label">连续打卡（天）</span>
        </div>
        <div class="ws-stat">
          <span class="ws-num">{{ s.todayWords }}</span>
          <span class="ws-label">今日字数</span>
        </div>
        <div class="ws-stat">
          <span class="ws-num">{{ monthCount }}</span>
          <span class="ws-label">本月篇数</span>
        </div>
      </div>
      <div class="ws-progress">
        <div class="ws-progress-track">
          <div
            class="ws-progress-fill"
            :style="{ width: Math.min(100, (monthCount / monthDays) * 100) + '%' }"
          />
        </div>
        <div class="ws-progress-meta">
          <span>{{ monthCount }} 篇</span>
          <span>共 {{ monthDays }} 天</span>
        </div>
      </div>
      <div class="ws-days">
        <span
          v-for="i in monthDays"
          :key="i"
          class="ws-day"
          :class="{
            filled: diary.datesWithDiary.has(dayInfo(i).key),
            today: dayInfo(i).key === todayKey(),
            holiday: dayInfo(i).holiday?.type === 'holiday',
            workday: dayInfo(i).holiday?.type === 'workday',
          }"
          :title="dayTitle(i)"
        >
          {{ i }}
        </span>
      </div>
    </div>

    <!-- 最近日记 -->
    <div class="ws-card app-card">
      <div class="ws-head">
        <n-icon :component="CalendarOutline" :size="15" />
        <span>最近日记</span>
      </div>
      <div v-if="recent.length" class="ws-recent">
        <button
          v-for="d in recent"
          :key="d.date"
          class="ws-recent-item"
          @click="diary.goToDate(d.date)"
        >
          <span class="wri-date">{{ d.date.slice(5) }}<i>周{{ '日一二三四五六'[new Date(d.date + 'T00:00:00').getDay()] }}</i></span>
          <span class="wri-mood">{{ d.mood }}</span>
          <span class="wri-preview">{{ diary.diaryExcerpt(d, 16) || '（空）' }}</span>
        </button>
      </div>
      <div v-else class="ws-empty">还没有写过日记</div>
    </div>

    <!-- 本周周报（方案 F：进度 + 一键跳转） -->
    <div class="ws-card app-card">
      <div class="ws-head">
        <n-icon :component="DocumentTextOutline" :size="15" />
        <span>本周周报</span>
        <span class="ws-count">{{ weekDone }} / 5 天</span>
      </div>
      <div class="ws-progress-track">
        <div class="ws-progress-fill" :style="{ width: (weekDone / 5) * 100 + '%' }" />
      </div>
      <div class="ws-progress-meta">
        <span>本周已写 {{ weekDone }} 天</span>
        <span>周一 ~ 周五</span>
      </div>
      <button class="ws-weekly-btn" @click="ui.go('weekly')">去生成周报</button>
    </div>

  </aside>
</template>

<style scoped>
.write-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  height: 100%;
}
.ws-card {
  padding: 16px 18px;
  flex-shrink: 0;
}
.ws-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 12px;
}
.ws-head .n-icon {
  color: var(--accent);
}
.ws-today {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 10px;
}
.ws-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
}
.ws-close {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  transition: all var(--dur-fast);
}
.ws-close:hover {
  background: var(--bg-hover);
  color: var(--text-1);
}

.ws-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ws-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 12px;
  background: var(--bg-inset);
}
.ws-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}
.ws-label {
  font-size: 10.5px;
  color: var(--text-3);
  text-align: center;
}

.ws-progress-track {
  height: 8px;
  border-radius: 4px;
  background: var(--bg-inset);
  overflow: hidden;
  margin-top: 12px;
}
.ws-progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  transition: width 0.5s var(--ease-apple);
}
.ws-progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-3);
  margin-top: 6px;
}

/* flomo 式打卡点阵：写了实心点亮，今天描边高亮 */
.ws-days {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  margin-top: 10px;
}
.ws-day {
  height: 24px;
  border-radius: 6px;
  font-size: 10px;
  display: grid;
  place-items: center;
  color: var(--text-3);
  background: var(--bg-inset);
}
.ws-day.holiday {
  background: var(--holiday-soft);
  color: var(--holiday);
  font-weight: 600;
}
.ws-day.workday {
  background: var(--workday-soft);
  color: var(--workday);
  font-weight: 600;
}
.ws-day.filled {
  background: var(--accent);
  opacity: 0.85;
  color: #fff;
}
.ws-day.holiday.filled {
  box-shadow: inset 0 0 0 1.5px var(--holiday);
}
.ws-day.workday.filled {
  box-shadow: inset 0 0 0 1.5px var(--workday);
}
.ws-day.today {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.ws-recent {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ws-recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-1);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-apple);
}
.ws-recent-item:hover {
  background: var(--bg-hover);
}
.wri-date {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  white-space: nowrap;
}
.wri-date i {
  font-style: normal;
  font-weight: 400;
  color: var(--text-3);
  margin-left: 3px;
  font-size: 11px;
}
.wri-mood {
  font-size: 14px;
}
.wri-preview {
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.ws-empty {
  font-size: 12.5px;
  color: var(--text-3);
  text-align: center;
  padding: 12px 0;
}

/* 本周周报 */
.ws-weekly-btn {
  width: 100%;
  margin-top: 12px;
  border: none;
  border-radius: var(--radius-pill);
  background: linear-gradient(180deg, var(--accent-hover), var(--accent));
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 0;
  cursor: pointer;
  transition: filter var(--dur-fast);
}
.ws-weekly-btn:hover {
  filter: brightness(1.08);
}
</style>
