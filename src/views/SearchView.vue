<script setup lang="ts">
import { computed, ref } from 'vue'
import { NInput, NSelect, NDatePicker, NDropdown, NButton, NIcon, useMessage } from 'naive-ui'
import { SearchOutline, DownloadOutline } from '@vicons/ionicons5'
import DiaryCard from '../components/list/DiaryCard.vue'
import PrintDialog from '../components/print/PrintDialog.vue'
import { useDiaryStore } from '../stores/diary'
import {
  batchMarkdown,
  saveTextFile,
  currentWeekRange,
  currentMonth,
} from '../services/export'
import { monthLabel } from '../services/stats'
import type { Diary } from '../types'

const diary = useDiaryStore()
const message = useMessage()
const printOpen = ref(false)
const printDiaries = ref<Diary[]>([])
const printTitle = ref('')

const results = computed(() => diary.searchResults)

/** 把 store 的 from/to 转成 date-picker 可接受的类型 */
const dateRange = computed<[string, string] | null>(() => {
  const { from, to } = diary.search
  if (!from && !to) return null
  return [from ?? '', to ?? '']
})

const exportOptions = [
  { label: '本周 · 导出 md', key: 'week-md' },
  { label: '本月 · 导出 md', key: 'month-md' },
  { label: '本周 · 打印 / PDF', key: 'week-pdf' },
  { label: '本月 · 打印 / PDF', key: 'month-pdf' },
]

async function handleExport(key: string) {
  const { from, to } = currentWeekRange()
  const month = currentMonth()
  let list: Diary[] = []
  let label = ''
  if (key.includes('week')) {
    list = await diary.backend!.getRange(from, to)
    label = `${from} ~ ${to}`
  } else {
    const nextMonth = `${month.slice(0, 4)}-${String(Number(month.slice(5)) + 1).padStart(2, '0')}`
    list = await diary.backend!.getRange(month + '-01', nextMonth + '-01')
    label = monthLabel(month)
  }
  if (!list.length) {
    message.info('该区间没有日记')
    return
  }
  if (key.endsWith('-md')) {
    const ok = await saveTextFile(batchMarkdown(list), `日报-${label}.md`)
    if (ok) message.success('导出成功')
  } else {
    printTitle.value = label
    printDiaries.value = list
    printOpen.value = true
  }
}
</script>

<template>
  <div class="search-view">
    <div class="search-panel app-card">
      <div class="sp-main">
        <div class="search-box">
          <n-icon :component="SearchOutline" :size="18" class="search-icon" />
          <n-input
            v-model:value="diary.search.keyword"
            placeholder="搜索日记内容…"
            size="large"
            clearable
          />
        </div>
        <n-dropdown :options="exportOptions" @select="handleExport">
          <n-button secondary class="export-btn">
            <template #icon><n-icon :component="DownloadOutline" /></template>
            批量导出
          </n-button>
        </n-dropdown>
      </div>

      <div class="sp-filters">
        <div class="sp-filter">
          <span class="sp-label">标签</span>
          <n-select
            v-model:value="diary.search.tags"
            :options="diary.allTags.map((t) => ({ label: t, value: t }))"
            multiple
            filterable
            clearable
            placeholder="按标签筛选"
            style="min-width: 220px; max-width: 360px"
          />
        </div>
        <div class="sp-filter">
          <span class="sp-label">日期</span>
          <n-date-picker
            type="daterange"
            clearable
            :formatted-value="dateRange"
            value-format="yyyy-MM-dd"
            placeholder="选择日期范围"
            style="min-width: 260px"
            @update:formatted-value="(v: [string, string] | null) => diary.setSearchRange(v?.[0] ?? null, v?.[1] ?? null)"
          />
        </div>
        <div class="sp-count">{{ results.length }} 篇</div>
      </div>
    </div>

    <div class="result-list">
      <template v-if="results.length">
        <DiaryCard v-for="d in results" :key="d.date" :diary="d" />
      </template>
      <div v-else class="empty-state">
        <span class="es-icon">🔍</span>
        <div class="es-title">没有找到匹配的日记</div>
        <div class="es-desc">试试更换关键词、调整标签或日期范围</div>
      </div>
    </div>

    <PrintDialog v-model:show="printOpen" :title="printTitle" :diaries="printDiaries" />
  </div>
</template>

<style scoped>
.search-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.search-panel {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sp-main {
  display: flex;
  gap: 12px;
  align-items: center;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}
.search-icon {
  color: var(--text-3);
  margin: 0 4px 0 10px;
  z-index: 1;
}
.search-box :deep(.n-input) {
  margin-left: -28px;
  padding-left: 32px;
}
.export-btn {
  white-space: nowrap;
}

.sp-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.sp-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sp-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
}
.sp-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
