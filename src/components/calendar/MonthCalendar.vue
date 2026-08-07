<script setup lang="ts">
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import { ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import { useDiaryStore } from '../../stores/diary'
import { useUiStore } from '../../stores/ui'
import { todayKey } from '../../types'
import { holidayOf, type HolidayInfo } from '../../services/holiday'

const diary = useDiaryStore()
const ui = useUiStore()

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const now = new Date()
const cursor = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const today = todayKey()

const year = computed(() => cursor.value.getFullYear())
const month = computed(() => cursor.value.getMonth())

const title = computed(() => `${year.value}年${month.value + 1}月`)

/** 本月有日记的日期集合 */
const monthDates = computed(() => {
  const prefix = `${year.value}-${String(month.value + 1).padStart(2, '0')}`
  return new Set(
    diary.allDiaries.filter((d) => d.date.startsWith(prefix)).map((d) => d.date),
  )
})

interface Cell {
  key: string
  date: string | null
  isCurrent: boolean
  hasDiary: boolean
  isToday: boolean
  isSelected: boolean
  holiday: HolidayInfo | null
}

const cells = computed<Cell[]>(() => {
  const first = new Date(year.value, month.value, 1)
  // 周一为一周起始：getDay() 周日=0 → 偏移
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const mKey = (d: number) => `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const out: Cell[] = []
  for (let i = 0; i < lead; i++) out.push({ key: 'b' + i, date: null, isCurrent: false, hasDiary: false, isToday: false, isSelected: false, holiday: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const key = mKey(d)
    out.push({
      key,
      date: key,
      isCurrent: true,
      hasDiary: monthDates.value.has(key),
      isToday: key === today,
      isSelected: key === diary.date,
      holiday: holidayOf(key),
    })
  }
  // 补齐 6 行，保持稳定高度
  while (out.length % 7 !== 0) out.push({ key: 't' + out.length, date: null, isCurrent: false, hasDiary: false, isToday: false, isSelected: false, holiday: null })
  return out
})

function prev() {
  cursor.value = new Date(year.value, month.value - 1, 1)
}
function next() {
  cursor.value = new Date(year.value, month.value + 1, 1)
}
function goToday() {
  cursor.value = new Date(now.getFullYear(), now.getMonth(), 1)
  openDate(today)
}

function openDate(dateKey: string) {
  void diary.goToDate(dateKey)
  ui.go('write')
}

</script>

<template>
  <div class="calendar-card app-card">
    <div class="cal-head">
      <div class="cal-nav">
        <button class="cal-btn" @click="prev"><n-icon :component="ChevronBackOutline" :size="17" /></button>
        <h2 class="cal-title">{{ title }}</h2>
        <button class="cal-btn" @click="next"><n-icon :component="ChevronForwardOutline" :size="17" /></button>
        <button class="today-btn" @click="goToday">今天</button>
      </div>
      <div class="cal-head-right">
        <div class="cal-legend">
          <span class="lg-dot lg-holiday" />法定假日
          <span class="lg-dot lg-workday" />调休上班
        </div>
        <div class="cal-hint" v-if="monthDates.size">
          <span class="hint-dot" />{{ monthDates.size }} 天有记录
        </div>
      </div>
    </div>

    <div class="cal-week">
      <div v-for="w in WEEKDAYS" :key="w" class="cal-weekday">{{ w }}</div>
    </div>

    <div class="cal-grid">
      <template v-for="cell in cells" :key="cell.key">
        <div
          v-if="cell.date"
          class="cal-cell"
          :class="{
            selected: cell.isSelected,
            today: cell.isToday,
            has: cell.hasDiary,
            holiday: cell.holiday?.type === 'holiday',
            workday: cell.holiday?.type === 'workday',
          }"
          @click="openDate(cell.date)"
        >
          <span class="cell-num">{{ Number(cell.date.slice(8)) }}</span>
          <span v-if="cell.holiday" class="cell-holiday">{{ cell.holiday.name }}</span>
          <span class="cell-dot" v-if="cell.hasDiary" />
        </div>
        <div v-else class="cal-cell blank" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.calendar-card {
  padding: 22px 26px 26px;
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.cal-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cal-title {
  margin: 0 8px;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.2px;
  min-width: 130px;
  text-align: center;
}
.cal-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: var(--bg-inset);
  color: var(--text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--dur-fast) var(--ease-apple);
}
.cal-btn:hover {
  background: var(--bg-active);
  color: var(--text-1);
}
.today-btn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 7px;
  transition: all var(--dur-fast);
}
.today-btn:hover {
  background: var(--accent-soft);
}
.cal-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-3);
}
.cal-head-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.cal-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-3);
}
.lg-dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  margin-left: 8px;
}
.lg-dot:first-child {
  margin-left: 0;
}
.lg-holiday {
  background: var(--holiday);
  opacity: 0.75;
}
.lg-workday {
  background: var(--workday);
  opacity: 0.75;
}
.hint-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.8;
}

.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}
.cal-weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  padding: 6px 0;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.cal-cell {
  position: relative;
  height: 54px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 10px;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-apple), transform var(--dur-fast);
  user-select: none;
}
.cal-cell:hover {
  background: var(--bg-hover);
}
.cal-cell:active {
  transform: scale(0.96);
}
.cal-cell.blank {
  cursor: default;
}
.cal-cell.selected {
  background: var(--accent);
  color: #fff;
}
.cal-cell.selected:hover {
  background: var(--accent-hover);
}
.cal-cell.holiday {
  background: var(--holiday-soft);
}
.cal-cell.holiday:hover,
.cal-cell.workday:hover {
  background: var(--bg-hover);
}
.cal-cell.workday {
  background: var(--workday-soft);
}
.cal-cell.holiday .cell-num,
.cal-cell.workday .cell-num {
  font-weight: 600;
}
.cal-cell.holiday .cell-num,
.cal-cell.holiday .cell-holiday {
  color: var(--holiday);
}
.cal-cell.workday .cell-num,
.cal-cell.workday .cell-holiday {
  color: var(--workday);
}
.cell-holiday {
  font-size: 9.5px;
  line-height: 1;
  font-weight: 600;
}
.cell-num {
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
}
.cal-cell.today:not(.selected) .cell-num {
  color: var(--accent);
  font-weight: 700;
}
.cal-cell.today:not(.selected) {
  box-shadow: inset 0 0 0 1.5px var(--accent);
}
.cal-cell.today:not(.selected).holiday .cell-num,
.cal-cell.today:not(.selected).holiday .cell-holiday {
  color: var(--holiday);
}
.cal-cell.today:not(.selected).workday .cell-num,
.cal-cell.today:not(.selected).workday .cell-holiday {
  color: var(--workday);
}
.cal-cell.selected .cell-num,
.cal-cell.selected .cell-holiday {
  color: #fff;
}
.cell-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.85;
}
.cal-cell.selected .cell-dot {
  background: #fff;
}
</style>
