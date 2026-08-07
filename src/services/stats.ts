import type { Diary } from '../types'
import type { ProjectRule } from '../types'
import { countWords, todayKey } from '../types'
import { buildWeeklyReport } from './weekly'

/** 某月前缀 'YYYY-MM' */
export function monthPrefix(dateKey: string): string {
  return dateKey.slice(0, 7)
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}

/**
 * 连续打卡天数：从今天起往前数（今天没写则从昨天起）。
 */
export function consecutiveDays(diaries: Diary[]): number {
  if (!diaries.length) return 0
  const set = new Set(diaries.map((d) => d.date))
  const today = todayKey()
  let cursor = new Date()
  // 今天没写 → 从昨天开始
  if (!set.has(today)) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let count = 0
  while (true) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    const key = `${y}-${m}-${d}`
    if (!set.has(key)) break
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

/** 今日字数 */
export function todayWords(diaries: Diary[]): number {
  const d = diaries.find((x) => x.date === todayKey())
  return d ? countWords(d.content) : 0
}

/** 本月篇数与字数 */
export function monthStats(diaries: Diary[], month: string) {
  const inMonth = diaries.filter((d) => monthPrefix(d.date) === month)
  const words = inMonth.reduce((sum, d) => sum + countWords(d.content), 0)
  return { count: inMonth.length, words }
}

/** 全量汇总 */
export function summary(diaries: Diary[]) {
  const totalWords = diaries.reduce((s, d) => s + countWords(d.content), 0)
  return {
    totalCount: diaries.length,
    totalWords,
    streak: consecutiveDays(diaries),
    todayWords: todayWords(diaries),
    thisMonth: monthPrefix(todayKey()),
  }
}

/** 本月每日热力：date -> words（无日记则 0） */
export function monthHeat(diaries: Diary[], month: string): Record<string, number> {
  const heat: Record<string, number> = {}
  for (const d of diaries) {
    if (monthPrefix(d.date) === month) heat[d.date] = countWords(d.content)
  }
  return heat
}

/** 按项目统计条数与字数（基于自动归类后的周报行） */
export function projectStats(diaries: Diary[], rules: ProjectRule[]) {
  const report = buildWeeklyReport(diaries, '0000-01-01', '9999-12-31', undefined, rules)
  const map = new Map<string, { count: number; words: number }>()
  for (const r of report.rows) {
    const cur = map.get(r.project) ?? { count: 0, words: 0 }
    cur.count += 1
    cur.words += countWords(r.content)
    map.set(r.project, cur)
  }
  return [...map.entries()]
    .map(([project, v]) => ({ project, ...v }))
    .sort((a, b) => b.count - a.count)
}

export interface MonthlyReview {
  month: string
  days: number
  count: number
  words: number
  projects: { project: string; count: number }[]
  problems: { date: string; text: string }[]
}

/** 生成某月的回顾摘要 */
export function buildMonthlyReview(
  diaries: Diary[],
  month: string,
  rules: ProjectRule[],
): MonthlyReview {
  const inMonth = diaries.filter((d) => monthPrefix(d.date) === month)
  const days = new Set(inMonth.map((d) => d.date)).size
  const words = inMonth.reduce((s, d) => s + countWords(d.content), 0)
  const report = buildWeeklyReport(inMonth, month + '-01', month + '-31', undefined, rules)

  const projectMap = new Map<string, number>()
  for (const r of report.rows) {
    projectMap.set(r.project, (projectMap.get(r.project) ?? 0) + 1)
  }
  const projects = [...projectMap.entries()]
    .map(([project, count]) => ({ project, count }))
    .sort((a, b) => b.count - a.count)

  const problems: MonthlyReview['problems'] = []
  for (const r of report.rows) {
    if (r.problems && r.problems !== '无') {
      const dup = problems.some((p) => p.date === r.date && p.text === r.problems)
      if (!dup) problems.push({ date: r.date, text: r.problems })
    }
  }
  return { month, days, count: inMonth.length, words, projects, problems }
}

/** 月度回顾转 markdown（导出用） */
export function monthlyReviewToMarkdown(r: MonthlyReview): string {
  const [y, m] = r.month.split('-')
  const lines = [
    `# ${y}年${Number(m)}月 回顾`,
    '',
    `- 记录 ${r.days} 天，共 ${r.count} 篇，${r.words} 字`,
    '',
  ]
  if (r.projects.length) {
    lines.push('## 项目分布', '')
    for (const p of r.projects) lines.push(`- ${p.project}：${p.count} 条`)
    lines.push('')
  }
  if (r.problems.length) {
    lines.push('## 本月问题', '')
    for (const p of r.problems) lines.push(`- ${p.date}：${p.text}`)
    lines.push('')
  }
  return lines.join('\n')
}
