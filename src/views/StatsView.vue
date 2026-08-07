<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NDatePicker, NIcon, NModal, useMessage } from 'naive-ui'
import { ShuffleOutline } from '@vicons/ionicons5'
import { useDiaryStore } from '../stores/diary'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import { buildMonthlyReview, monthLabel, monthHeat, monthlyReviewToMarkdown, monthPrefix, projectStats } from '../services/stats'
import { countWords, todayKey, type Diary } from '../types'
import { mdToHtml } from '../lib/markdown'
import { saveTextFile } from '../services/export'

const diary = useDiaryStore()
const settings = useSettingsStore()
const ui = useUiStore()
const message = useMessage()

const s = computed(() => diary.statsSummary)
const thisMonth = computed(() => monthPrefix(todayKey()))
const heat = computed(() => monthHeat(diary.allDiaries, thisMonth.value))

/** 本月热力格子（1-31，按字数分级） */
const heatCells = computed(() => {
  const [y, m] = thisMonth.value.split('-')
  const days = new Date(Number(y), Number(m), 0).getDate()
  const cells: { date: string; words: number; level: number }[] = []
  for (let d = 1; d <= days; d++) {
    const key = `${thisMonth.value}-${String(d).padStart(2, '0')}`
    const w = heat.value[key] ?? 0
    let level = 0
    if (w > 0) level = 1
    if (w >= 100) level = 2
    if (w >= 300) level = 3
    if (w >= 600) level = 4
    cells.push({ date: key, words: w, level })
  }
  return cells
})

/** 最近 12 个月柱状 */
const monthBars = computed(() => {
  const now = new Date()
  const bars: { label: string; count: number; words: number; active: boolean }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const inMonth = diary.allDiaries.filter((x) => monthPrefix(x.date) === prefix)
    bars.push({
      label: `${d.getMonth() + 1}月`,
      count: inMonth.length,
      words: inMonth.reduce((sum, x) => sum + countWords(x.content), 0),
      active: prefix === thisMonth.value,
    })
  }
  return bars
})

const maxBarCount = computed(() => Math.max(1, ...monthBars.value.map((b) => b.count)))

const statCards = computed(() => {
  const thisMonthCount = Object.values(heat.value).filter((w) => w > 0).length
  return [
    { label: '连续打卡', value: `${s.value.streak}`, unit: '天', icon: '🔥', tint: 'orange' },
    { label: '今日字数', value: `${s.value.todayWords}`, unit: '字', icon: '✍️', tint: 'blue' },
    { label: '本月篇数', value: `${thisMonthCount}`, unit: '篇', icon: '📅', tint: 'green' },
    { label: '累计日记', value: `${s.value.totalCount}`, unit: '篇', icon: '📚', tint: 'purple' },
  ]
})

/* ---------- 按项目统计 ---------- */
const projectData = computed(() => projectStats(diary.allDiaries, settings.settings.projectRules))
const maxProjectCount = computed(() => Math.max(1, ...projectData.value.map((p) => p.count)))

/* ---------- 月度回顾 ---------- */
const reviewMonth = ref(monthPrefix(todayKey()))
const review = computed(() =>
  buildMonthlyReview(diary.allDiaries, reviewMonth.value, settings.settings.projectRules),
)

async function exportReview() {
  const ok = await saveTextFile(
    monthlyReviewToMarkdown(review.value),
    `月度回顾-${reviewMonth.value}.md`,
  )
  if (ok) message.success('已导出月度回顾')
}

/* ---------- 随机回顾 ---------- */
const randomOpen = ref(false)
const randomDiary = ref<Diary | null>(null)

function openRandom() {
  const list = diary.allDiaries
  if (!list.length) {
    message.info('还没有日记')
    return
  }
  randomDiary.value = list[Math.floor(Math.random() * list.length)]
  randomOpen.value = true
}

const randomHtml = computed(() => (randomDiary.value ? mdToHtml(randomDiary.value.content) : ''))

function gotoRandom() {
  if (!randomDiary.value) return
  void diary.goToDate(randomDiary.value.date)
  ui.go('write')
  randomOpen.value = false
}
</script>

<template>
  <div class="stats-view">
    <div class="stats-grid">
      <div v-for="card in statCards" :key="card.label" class="stat-card app-card">
        <div class="sc-icon" :data-tint="card.tint">{{ card.icon }}</div>
        <div class="sc-value">
          {{ card.value }}<span class="sc-unit">{{ card.unit }}</span>
        </div>
        <div class="sc-label">{{ card.label }}</div>
      </div>
    </div>

    <div class="stat-block app-card">
      <div class="sb-head">
        <h3>{{ monthLabel(thisMonth) }} 记录热力</h3>
        <span class="sb-sub">按每日字数着色</span>
      </div>
      <div class="heat-grid">
        <div
          v-for="cell in heatCells"
          :key="cell.date"
          class="heat-cell"
          :class="`lv-${cell.level}`"
          :title="`${cell.date}：${cell.words} 字`"
        >
          <span class="hc-num">{{ Number(cell.date.slice(8)) }}</span>
        </div>
      </div>
      <div class="heat-legend">
        <span>少</span>
        <i class="lg lv-0" /><i class="lg lv-1" /><i class="lg lv-2" /><i class="lg lv-3" /><i class="lg lv-4" />
        <span>多</span>
      </div>
    </div>

    <div class="stat-block app-card">
      <div class="sb-head">
        <h3>最近 12 个月篇数</h3>
        <span class="sb-sub">累计 {{ s.totalCount }} 篇 · {{ s.totalWords }} 字</span>
      </div>
      <div class="bars">
        <div v-for="b in monthBars" :key="b.label" class="bar-col">
          <div class="bar-track">
            <div
              class="bar"
              :class="{ active: b.active }"
              :style="{ height: `${Math.max(4, (b.count / maxBarCount) * 100)}%` }"
              :title="`${b.label}：${b.count} 篇 · ${b.words} 字`"
            />
          </div>
          <span class="bar-label" :class="{ active: b.active }">{{ b.label }}</span>
          <span class="bar-count">{{ b.count || '' }}</span>
        </div>
      </div>
    </div>

    <!-- 按项目统计 -->
    <div class="stat-block app-card" v-if="projectData.length">
      <div class="sb-head">
        <h3>项目工作量</h3>
        <span class="sb-sub">按关键词自动归类统计</span>
      </div>
      <div class="project-bars">
        <div v-for="p in projectData" :key="p.project" class="pbar">
          <span class="pbar-name">{{ p.project }}</span>
          <div class="pbar-track">
            <div
              class="pbar-fill"
              :style="{ width: `${Math.max(4, (p.count / maxProjectCount) * 100)}%` }"
            />
          </div>
          <span class="pbar-count">{{ p.count }} 条 · {{ p.words }} 字</span>
        </div>
      </div>
    </div>

    <!-- 月度回顾 -->
    <div class="stat-block app-card">
      <div class="sb-head">
        <h3>月度回顾</h3>
        <div class="sb-actions">
          <n-date-picker
            type="month"
            :formatted-value="reviewMonth"
            value-format="yyyy-MM"
            style="width: 150px"
            @update:formatted-value="(v: string | null) => v && (reviewMonth = v)"
          />
          <n-button size="small" secondary @click="exportReview">导出 md</n-button>
        </div>
      </div>
      <div class="review-grid">
        <div class="review-stat"><span class="rs-num">{{ review.days }}</span><span class="rs-label">记录天数</span></div>
        <div class="review-stat"><span class="rs-num">{{ review.count }}</span><span class="rs-label">日记篇数</span></div>
        <div class="review-stat"><span class="rs-num">{{ review.words }}</span><span class="rs-label">总字数</span></div>
        <div class="review-stat"><span class="rs-num">{{ review.problems.length }}</span><span class="rs-label">问题条数</span></div>
      </div>
      <div v-if="review.projects.length" class="review-projects">
        <span v-for="p in review.projects" :key="p.project" class="review-chip">
          {{ p.project }} · {{ p.count }} 条
        </span>
      </div>
    </div>

    <!-- 随机回顾 -->
    <div class="stat-block app-card">
      <div class="sb-head">
        <h3>随机回顾</h3>
        <span class="sb-sub">翻一篇过去的日报</span>
      </div>
      <n-button secondary @click="openRandom">
        <template #icon><n-icon :component="ShuffleOutline" /></template>
        随机翻一篇
      </n-button>
    </div>

    <!-- 随机回顾弹窗 -->
    <n-modal
      v-model:show="randomOpen"
      preset="card"
      :title="randomDiary ? randomDiary.date : ''"
      style="width: 640px"
    >
      <div v-if="randomDiary" class="random-body">
        <div class="random-meta">
          <span class="random-mood">{{ randomDiary.mood }}</span>
          <span v-for="t in randomDiary.tags" :key="t" class="dc-tag">#{{ t }}</span>
          <span class="random-words">{{ diary.diaryTextLen(randomDiary) }} 字</span>
        </div>
        <div class="random-content" v-html="randomHtml" />
      </div>
      <template #footer>
        <div class="random-actions">
          <n-button quaternary @click="randomOpen = false">关闭</n-button>
          <n-button secondary @click="openRandom">再翻一篇</n-button>
          <n-button type="primary" @click="gotoRandom">去编辑</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.stats-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
}
.stat-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform var(--dur-fast) var(--ease-apple), box-shadow var(--dur-fast);
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-pop);
}
.sc-icon {
  font-size: 22px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--bg-inset);
}
.sc-icon[data-tint='orange'] {
  background: color-mix(in srgb, var(--orange) 16%, transparent);
}
.sc-icon[data-tint='blue'] {
  background: var(--accent-soft);
}
.sc-icon[data-tint='green'] {
  background: color-mix(in srgb, var(--green) 16%, transparent);
}
.sc-icon[data-tint='purple'] {
  background: color-mix(in srgb, var(--purple) 16%, transparent);
}
.sc-value {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.3px;
  line-height: 1.1;
}
.sc-unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-3);
  margin-left: 4px;
}
.sc-label {
  font-size: 12.5px;
  color: var(--text-3);
}

.stat-block {
  padding: 20px 22px;
}
.sb-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.sb-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.sb-sub {
  font-size: 12px;
  color: var(--text-3);
}

.heat-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.heat-cell {
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-size: 11px;
  transition: all var(--dur-fast);
}
.hc-num {
  opacity: 0.55;
}
.heat-cell.lv-0 {
  background: var(--bg-inset);
  color: var(--text-3);
}
.heat-cell.lv-1 {
  background: color-mix(in srgb, var(--accent) 24%, transparent);
  color: var(--text-1);
}
.heat-cell.lv-2 {
  background: color-mix(in srgb, var(--accent) 45%, transparent);
  color: #fff;
}
.heat-cell.lv-3 {
  background: color-mix(in srgb, var(--accent) 68%, transparent);
  color: #fff;
}
.heat-cell.lv-4 {
  background: var(--accent);
  color: #fff;
}
.heat-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--text-3);
  justify-content: flex-end;
}
.lg {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}
.lg.lv-0 {
  background: var(--bg-inset);
}
.lg.lv-1 {
  background: color-mix(in srgb, var(--accent) 24%, transparent);
}
.lg.lv-2 {
  background: color-mix(in srgb, var(--accent) 45%, transparent);
}
.lg.lv-3 {
  background: color-mix(in srgb, var(--accent) 68%, transparent);
}
.lg.lv-4 {
  background: var(--accent);
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 150px;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  gap: 4px;
}
.bar-track {
  flex: 1;
  width: 100%;
  max-width: 34px;
  display: flex;
  align-items: flex-end;
}
.bar {
  width: 100%;
  border-radius: 6px 6px 3px 3px;
  background: var(--bg-inset);
  transition: height 0.4s var(--ease-apple), background var(--dur-fast);
  min-height: 4px;
}
.bar.active {
  background: var(--accent);
}
.bar-label {
  font-size: 10.5px;
  color: var(--text-3);
}
.bar-label.active {
  color: var(--accent);
  font-weight: 600;
}
.bar-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
  height: 14px;
}

/* 按项目统计 */
.project-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pbar-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  min-width: 90px;
  white-space: nowrap;
}
.pbar-track {
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: var(--bg-inset);
  overflow: hidden;
}
.pbar-fill {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  transition: width 0.4s var(--ease-apple);
}
.pbar-count {
  font-size: 11.5px;
  color: var(--text-3);
  min-width: 86px;
  text-align: right;
  white-space: nowrap;
}

/* 月度回顾 */
.sb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.review-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.review-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 12px;
  background: var(--bg-inset);
}
.rs-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}
.rs-label {
  font-size: 11px;
  color: var(--text-3);
}
.review-projects {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.review-chip {
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
}

/* 随机回顾 */
.random-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.random-mood {
  font-size: 20px;
}
.random-words {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
}
.random-content {
  max-height: 55vh;
  overflow: auto;
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-1);
  text-shadow: var(--text-shadow);
}
.random-content :deep(h1),
.random-content :deep(h2),
.random-content :deep(h3) {
  margin: 0.7em 0 0.3em;
}
.random-content :deep(p) {
  margin: 6px 0;
}
.random-content :deep(ul),
.random-content :deep(ol) {
  padding-left: 22px;
  margin: 6px 0;
}
.random-content :deep(blockquote) {
  border-left: 3px solid var(--border-strong);
  padding-left: 12px;
  color: var(--text-3);
  margin: 8px 0;
}
.random-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
