import type { BackupFile, Diary } from '../types'
import { extractTodayDone, todayKey } from '../types'
import { invoke } from '../lib/tauri'
import { open, save } from '@tauri-apps/plugin-dialog'

/* ============================================================
   导出 / 备份 / 还原
   Tauri：对话框选路径 + Rust 写文件；浏览器 mock：Blob 下载
   ============================================================ */

/** 单篇 md 文本 */
export function diaryToMarkdown(d: Diary): string {
  const meta = [
    `# ${d.date} 日报`,
    '',
    `- **心情**：${d.mood || '—'}`,
    `- **标签**：${d.tags.length ? d.tags.join('、') : '—'}`,
    '',
    '---',
    '',
    d.content.trim(),
    '',
  ].join('\n')
  return meta
}

/** 批量 md（周/月）文本 */
export function batchMarkdown(diaries: Diary[]): string {
  const parts: string[] = []
  for (const d of diaries) {
    parts.push(diaryToMarkdown(d))
    parts.push('\n\n---\n\n')
  }
  return parts.join('\n').trim() + '\n'
}

/** 全量备份 JSON 文本 */
export function backupJson(diaries: Diary[]): string {
  const file: BackupFile = {
    app: 'ribao',
    version: 1,
    exportedAt: new Date().toISOString(),
    diaries,
  }
  return JSON.stringify(file, null, 2)
}

/** 解析还原文件，返回日记列表；格式非法则抛错 */
export function parseRestore(text: string): Diary[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON')
  }
  const file = data as Partial<BackupFile>
  if (file.app !== 'ribao' || !Array.isArray(file.diaries)) {
    throw new Error('不是日报备份文件')
  }
  const diaries = file.diaries.filter(
    (d): d is Diary =>
      !!d &&
      typeof d.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
      typeof d.content === 'string',
  )
  return diaries
}

async function isTauriEnv(): Promise<boolean> {
  return '__TAURI_INTERNALS__' in window
}

/** 保存文本文件：Tauri 对话框 + Rust 写入；mock 浏览器下载 */
export async function saveTextFile(
  content: string,
  defaultName: string,
): Promise<boolean> {
  if (await isTauriEnv()) {
    const path = await save({
      title: '导出',
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'JSON', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })
    if (!path) return false
    await invoke('write_text_file', { path, content })
    return true
  }
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  a.click()
  URL.revokeObjectURL(url)
  return true
}

/** 打开文件并读取文本（还原用）；取消返回 null */
export async function pickTextFile(): Promise<string | null> {
  if (await isTauriEnv()) {
    const path = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (!path || Array.isArray(path)) return null
    return invoke<string>('read_text_file', { path })
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      resolve(await file.text())
    }
    input.click()
  })
}

/** 一键复制「今日完成」 */
export async function copyTodayDone(content: string): Promise<boolean> {
  const text = extractTodayDone(content)
  if (!text) return false
  if (await isTauriEnv()) {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
    await writeText(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
  return true
}

/** 当前日期 → 周一起/周日止 */
export function currentWeekRange(): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay() || 7 // 周日=7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const k = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  return { from: k(monday), to: k(sunday) }
}

/** 当前月份 'YYYY-MM' */
export function currentMonth(): string {
  return todayKey().slice(0, 7)
}
