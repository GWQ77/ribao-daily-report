<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NIcon, NDatePicker, NInput, NModal, NSelect, useMessage, NEmpty, NPopconfirm } from 'naive-ui'
import { AddOutline, DocumentTextOutline, DownloadOutline, FolderOpenOutline, TrashOutline } from '@vicons/ionicons5'
import { useDiaryStore } from '../stores/diary'
import { useSettingsStore } from '../stores/settings'
import { buildWeeklyReport, groupByDate, type WeeklyRow } from '../services/weekly'
import { currentWeekRange } from '../services/export'
import { invoke } from '../lib/tauri'

const diary = useDiaryStore()
const settings = useSettingsStore()
const message = useMessage()

const { from: defaultFrom, to: defaultTo } = currentWeekRange()
const range = ref<[string, string]>([defaultFrom, defaultTo])

const report = computed(() => {
  const [from, to] = range.value
  return buildWeeklyReport(diary.allDiaries, from, to, settings.settings.name, settings.settings.projectRules)
})

/** 可编辑的周报行（预览修改后按此导出） */
const editableRows = ref<WeeklyRow[]>([])
watch(
  report,
  (r) => {
    editableRows.value = r.rows.map((row) => ({ ...row }))
  },
  { immediate: true },
)

const grouped = computed(() => groupByDate(editableRows.value))

const rowCount = computed(() => editableRows.value.length)
const totalDays = computed(() => grouped.value.length)

/** 分组展示用的视图（带全局索引，供编辑/删除定位） */
const groupedRows = computed(() => {
  const out: { date: string; rows: { row: WeeklyRow; index: number }[] }[] = []
  let idx = 0
  for (const g of grouped.value) {
    out.push({ date: g.date, rows: g.rows.map((row) => ({ row, index: idx++ })) })
  }
  return out
})

/** 编辑单行 */
const editIndex = ref(-1)
const editForm = ref<WeeklyRow | null>(null)

const projectOptions = computed(() => {
  const set = new Set<string>(['其他项目'])
  for (const r of editableRows.value) set.add(r.project)
  return [...set].map((p) => ({ label: p, value: p }))
})

function openEdit(i: number) {
  const row = editableRows.value[i]
  if (!row) return
  editIndex.value = i
  editForm.value = { ...row }
}

function saveEdit() {
  if (!editForm.value || editIndex.value < 0) return
  editableRows.value[editIndex.value] = { ...editForm.value }
  editIndex.value = -1
  editForm.value = null
  message.success('已更新')
}

function removeRow(i: number) {
  editableRows.value.splice(i, 1)
  message.success('已删除该条')
}

const filename = computed(() => {
  const [from, to] = range.value
  const name = settings.settings.name.trim()
  const rangeText = `${from.slice(0, 4)}.${Number(from.slice(5, 7))}.${Number(from.slice(8))}-${to.slice(0, 4)}.${Number(to.slice(5, 7))}.${Number(to.slice(8))}`
  return name ? `周报-${name}（${rangeText}）.xlsx` : `周报（${rangeText}）.xlsx`
})

/** 导出 xlsx（Tauri）或 csv（浏览器 mock） */
async function exportXlsx() {
  if (!editableRows.value.length) {
    message.info('该区间没有可导出的日报')
    return
  }
  const headers = ['时间', '工作类型/项目名称', '工作内容', '工作/项目存在的问题', '人员姓名', '其他备注']
  const rows: string[][] = editableRows.value.map((r) => [
    r.date,
    r.project,
    r.content,
    r.problems,
    r.name,
    r.note,
  ])

  if ('__TAURI_INTERNALS__' in window) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({
      title: '导出周报',
      defaultPath: filename.value,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    })
    if (!path) return
    await invoke('export_weekly_xlsx', {
      path,
      sheetName: 'Sheet1',
      headers,
      rows,
    })
    message.success('周报已导出')
  } else {
    // 浏览器 mock：导出 CSV（Excel 可打开）
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map(esc).join(',')),
    ].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.value.replace(/\.xlsx$/, '.csv')
    a.click()
    URL.revokeObjectURL(url)
    message.success('已导出 CSV（浏览器预览模式）')
  }
}

/** 打开历史周报文件 */
async function openHistoryFile(path: string) {
  if ('__TAURI_INTERNALS__' in window) {
    try {
      await invoke('open_file', { path })
    } catch (e) {
      message.error(String(e))
    }
  } else {
    window.open(path)
  }
}

/** 从历史列表移除某项并保存 */
function removeHistory(i: number) {
  settings.settings.weeklyReports.splice(i, 1)
  void settings.save()
  message.success('已从列表移除')
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${y}-${m}-${day}`
}

/* ---------- 历史周报：添加 ---------- */
const addOpen = ref(false)
const addRange = ref<[string, string]>([defaultFrom, defaultTo])
const addPath = ref('')

async function pickHistoryFile() {
  if (!('__TAURI_INTERNALS__' in window)) {
    message.info('浏览器预览模式请直接输入路径')
    return
  }
  const { open } = await import('@tauri-apps/plugin-dialog')
  const path = await open({
    title: '选择历史周报文件',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  })
  if (!path || Array.isArray(path)) return
  addPath.value = path
}

function addHistory() {
  const [from, to] = addRange.value
  if (!addPath.value.trim()) {
    message.warning('请填写周报文件路径')
    return
  }
  if (from > to) {
    message.warning('日期范围不正确')
    return
  }
  const fmt = (d: string) => `${Number(d.slice(0, 4))}.${Number(d.slice(5, 7))}.${Number(d.slice(8))}`
  settings.settings.weeklyReports.push({
    label: `${fmt(from)}-${Number(to.slice(5, 7))}.${Number(to.slice(8))}`,
    from,
    to,
    path: addPath.value.trim(),
  })
  void settings.save()
  addOpen.value = false
  addPath.value = ''
  message.success('已添加历史周报')
}
</script>

<template>
  <div class="weekly-view">
    <!-- 工具条 -->
    <div class="weekly-toolbar app-card">
      <div class="wt-left">
        <n-icon :component="DocumentTextOutline" :size="18" class="wt-icon" />
        <h3>周报生成</h3>
      </div>
      <div class="wt-right">
        <span class="wt-label">日期范围</span>
        <n-date-picker
          type="daterange"
          :formatted-value="range"
          value-format="yyyy-MM-dd"
          placeholder="选择周范围"
          style="width: 260px"
          @update:formatted-value="(v: [string, string] | null) => v && (range = v)"
        />
        <n-button type="primary" @click="exportXlsx">
          <template #icon><n-icon :component="DownloadOutline" /></template>
          导出 Excel
        </n-button>
      </div>
    </div>

    <!-- 统计 -->
    <div class="weekly-stats">
      <div class="ws2 app-card"><span class="ws2-num">{{ rowCount }}</span><span class="ws2-label">工作条目</span></div>
      <div class="ws2 app-card"><span class="ws2-num">{{ totalDays }}</span><span class="ws2-label">覆盖天数</span></div>
      <div class="ws2 app-card"><span class="ws2-num">{{ new Set(editableRows.map(r => r.project)).size }}</span><span class="ws2-label">项目类型</span></div>
    </div>

    <!-- 预览表格 -->
    <div class="weekly-preview app-card" v-if="rowCount">
      <div class="wp-head">
        <h4>预览（可编辑，导出前确认）</h4>
        <span class="wp-filename">{{ filename }}</span>
      </div>
      <div class="wp-scroll">
        <table class="wp-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>工作类型/项目名称</th>
              <th>工作内容</th>
              <th>问题</th>
              <th>人员</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="g in groupedRows" :key="g.date">
              <tr v-for="(item, i) in g.rows" :key="item.index" :class="{ 'date-row': i === 0 }">
                <td v-if="i === 0" :rowspan="g.rows.length">{{ fmtDate(g.date) }}</td>
                <td class="col-project">{{ item.row.project }}</td>
                <td class="col-content">{{ item.row.content }}</td>
                <td class="col-problems">{{ item.row.problems }}</td>
                <td>{{ item.row.name }}</td>
                <td class="col-ops">
                  <button class="row-btn" @click="openEdit(item.index)">编辑</button>
                  <n-popconfirm
                    :positive-text="'删除'"
                    negative-text="取消"
                    @positive-click="removeRow(item.index)"
                  >
                    <template #trigger>
                      <button class="row-btn row-btn--del">删除</button>
                    </template>
                    删除这条（不影响原始日报）？
                  </n-popconfirm>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="weekly-empty app-card">
      <n-empty description="该日期范围内没有日报，先写几天日报再来生成周报吧" />
    </div>

    <!-- 历史周报 -->
    <div class="weekly-history app-card">
      <div class="wh-head">
        <n-icon :component="FolderOpenOutline" :size="16" class="wh-icon" />
        <h4>历史周报</h4>
        <span class="wh-count">{{ settings.settings.weeklyReports.length }} 份</span>
        <n-button size="small" secondary class="wh-add" @click="addOpen = true">
          <template #icon><n-icon :component="AddOutline" :size="14" /></template>
          添加
        </n-button>
      </div>
      <div v-if="settings.settings.weeklyReports.length" class="wh-list">
        <div
          v-for="(w, i) in settings.settings.weeklyReports"
          :key="i"
          class="wh-item"
        >
          <button class="wh-open" @click="openHistoryFile(w.path)">
            <span class="wh-label">{{ w.label }}</span>
            <span class="wh-range">{{ fmtDate(w.from) }} ~ {{ fmtDate(w.to) }}</span>
          </button>
          <n-popconfirm
            :positive-text="'移除'"
            negative-text="取消"
            @positive-click="removeHistory(i)"
          >
            <template #trigger>
              <button class="wh-del" title="从列表移除">
                <n-icon :component="TrashOutline" :size="13" />
              </button>
            </template>
            从历史列表移除「{{ w.label }}」？
          </n-popconfirm>
        </div>
      </div>
      <div v-else class="wh-empty">暂无历史周报</div>
    </div>

    <!-- 添加历史周报 -->
    <n-modal
      v-model:show="addOpen"
      preset="card"
      title="添加历史周报"
      :mask-closable="false"
      style="width: 480px"
    >
      <div class="ah-form">
        <div class="ah-row">
          <span class="ah-label">日期范围</span>
          <n-date-picker
            type="daterange"
            :formatted-value="addRange"
            value-format="yyyy-MM-dd"
            style="flex: 1"
            @update:formatted-value="(v: [string, string] | null) => v && (addRange = v)"
          />
        </div>
        <div class="ah-row">
          <span class="ah-label">文件</span>
          <n-input v-model:value="addPath" placeholder="选择或输入 xlsx 文件路径" style="flex: 1" />
          <n-button secondary @click="pickHistoryFile">选择</n-button>
        </div>
      </div>
      <template #footer>
        <div class="ah-actions">
          <n-button quaternary @click="addOpen = false">取消</n-button>
          <n-button type="primary" @click="addHistory">保存</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 编辑周报条目 -->
    <n-modal
      :show="editForm !== null"
      preset="card"
      title="编辑周报条目"
      :mask-closable="false"
      style="width: 560px"
      @update:show="(v: boolean) => !v && (editForm = null)"
    >
      <div v-if="editForm" class="ef-form">
        <div class="ef-row">
          <span class="ef-label">日期</span>
          <span class="ef-value">{{ editForm.date }}</span>
        </div>
        <div class="ef-row">
          <span class="ef-label">项目</span>
          <n-select
            v-model:value="editForm.project"
            :options="projectOptions"
            filterable
            allow-custom-value
            style="flex: 1"
          />
        </div>
        <div class="ef-row">
          <span class="ef-label">内容</span>
          <n-input v-model:value="editForm.content" type="textarea" :rows="4" style="flex: 1" />
        </div>
        <div class="ef-row">
          <span class="ef-label">问题</span>
          <n-input v-model:value="editForm.problems" type="textarea" :rows="2" style="flex: 1" />
        </div>
        <div class="ef-row">
          <span class="ef-label">姓名</span>
          <n-input v-model:value="editForm.name" style="flex: 1" />
        </div>
        <div class="ef-row">
          <span class="ef-label">备注</span>
          <n-input v-model:value="editForm.note" type="textarea" :rows="2" style="flex: 1" />
        </div>
      </div>
      <template #footer>
        <div class="ef-actions">
          <n-button quaternary @click="editForm = null">取消</n-button>
          <n-button type="primary" @click="saveEdit">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.weekly-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.weekly-toolbar {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.wt-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wt-icon {
  color: var(--accent);
}
.wt-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.wt-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.wt-label {
  font-size: 13px;
  color: var(--text-3);
}

.weekly-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.ws2 {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ws2-num {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}
.ws2-label {
  font-size: 12.5px;
  color: var(--text-3);
}

.weekly-preview {
  padding: 18px 20px;
}
.wp-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.wp-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.wp-filename {
  font-size: 12px;
  color: var(--text-3);
  word-break: break-all;
}
.wp-scroll {
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
}
.wp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.wp-table th,
.wp-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--glass-border);
  vertical-align: top;
  text-align: left;
}
.wp-table thead th {
  background: var(--bg-inset);
  font-weight: 600;
  color: var(--text-2);
  position: sticky;
  top: 0;
}
.wp-table .date-row td {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.col-project {
  white-space: nowrap;
  font-weight: 500;
  color: var(--accent);
}
.col-content {
  min-width: 300px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.col-problems {
  white-space: nowrap;
  color: var(--text-3);
}

.weekly-empty {
  padding: 40px 20px;
}

/* 历史周报 */
.weekly-history {
  padding: 18px 20px;
}
.wh-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.wh-icon {
  color: var(--accent);
}
.wh-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.wh-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
}
.wh-add {
  margin-left: 10px;
}
.wh-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wh-item {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 4px 4px 4px 14px;
  background: var(--bg-inset);
  transition: background var(--dur-fast) var(--ease-apple);
}
.wh-item:hover {
  background: var(--bg-hover);
}
.wh-open {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  border: none;
  background: transparent;
  padding: 8px 4px;
  cursor: pointer;
  font-family: inherit;
  color: var(--text-1);
}
.wh-open:hover .wh-label {
  color: var(--accent);
}
.wh-label {
  font-size: 13.5px;
  font-weight: 600;
  transition: color var(--dur-fast);
}
.wh-range {
  font-size: 11.5px;
  color: var(--text-3);
}
.wh-del {
  border: none;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  transition: all var(--dur-fast);
}
.wh-del:hover {
  background: color-mix(in srgb, var(--red) 14%, transparent);
  color: var(--red);
}
.wh-empty {
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
  padding: 16px 0;
}

/* 添加历史周报 */
.ah-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ah-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ah-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  min-width: 64px;
}
.ah-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 预览行操作 */
.col-ops {
  white-space: nowrap;
}
.row-btn {
  border: none;
  background: transparent;
  color: var(--text-3);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 6px;
  transition: all var(--dur-fast);
}
.row-btn:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.row-btn--del:hover {
  background: color-mix(in srgb, var(--red) 14%, transparent);
  color: var(--red);
}

/* 编辑条目 */
.ef-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ef-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.ef-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  min-width: 48px;
  line-height: 30px;
}
.ef-value {
  font-size: 13px;
  color: var(--text-1);
  line-height: 30px;
}
.ef-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
