import type { Diary } from '../types'
import type { ProjectRule } from '../types'
import { DEFAULT_PROJECT_RULES } from './config'

/* ============================================================
   周报解析逻辑
   日报正文格式：
   1. 【项目类型】工作内容
   2. 【燃气项目】燃气监管平台后端生产部署发一版，测试启动
   解析后按【】提取项目类型，生成周报表格行。
   ============================================================ */

export interface WeeklyRow {
  date: string // 'YYYY-MM-DD'
  project: string // 【】中的项目类型
  content: string // 去掉【】后的工作内容
  problems: string // 问题（解析「遇到的问题」段，无则「无」）
  name: string // 姓名（默认空，可在设置页配置）
  note: string // 备注
}

export interface WeeklyReport {
  rows: WeeklyRow[]
  /** 数据覆盖的日期范围 */
  from: string
  to: string
}

const DEFAULT_NAME = ''

const HEADING_RE = /^#{1,3}\s/
const DONE_RE = /^#{1,3}\s*今日完成/
const PROBLEMS_RE = /^#{1,3}\s*遇到的问题/
const ITEM_RE = /^(?:\d+[.、]\s*|[-*+]\s+)(.*)$/

/** 按关键词规则匹配项目，未命中归「其他项目」 */
export function matchProject(content: string, rules: ProjectRule[]): string {
  for (const r of rules) {
    if (r.keyword && content.includes(r.keyword)) return r.project
  }
  return '其他项目'
}

/** 从单条内容提取项目类型与正文（无【】时按关键词规则自动归类） */
export function parseEntry(
  raw: string,
  rules: ProjectRule[] = DEFAULT_PROJECT_RULES,
): { project: string; content: string } {
  const m = raw.match(/^\s*(?:\d+[.、]\s*|[-*+]\s+)?【([^】]+)】\s*(.*)$/)
  if (m) {
    return { project: m[1].trim(), content: m[2].trim() }
  }
  return {
    project: matchProject(raw, rules),
    content: raw.replace(/^\s*(?:\d+[.、]\s*|[-*+]\s+)?/, '').trim(),
  }
}

/** 从日报正文提取「今日完成」段的所有条目（支持编号与列表符号） */
function extractEntries(content: string): string[] {
  const lines = content.split('\n')
  let capture = false
  let foundSection = false
  const entries: string[] = []
  const fallbackLines: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (DONE_RE.test(t)) {
      capture = true
      foundSection = true
      continue
    }
    if (capture && HEADING_RE.test(t)) break // 遇到下一个标题结束
    if (!capture || !t) continue
    const item = t.match(ITEM_RE)
    if (item) entries.push(item[1])
    else fallbackLines.push(t)
  }
  if (entries.length) return entries
  // 有「今日完成」段但没写条目：把段内正文合为一条，避免标题混入
  if (foundSection) return fallbackLines.length ? [fallbackLines.join('\n')] : []
  // 完全没有「今日完成」标题：跳过标题行，按编号/列表行拆成条目，其余行合为一条
  const plainLines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !HEADING_RE.test(l))
  if (!plainLines.length) return []
  const items: string[] = []
  const rest: string[] = []
  for (const l of plainLines) {
    const m = l.match(ITEM_RE)
    if (m) items.push(m[1])
    else rest.push(l)
  }
  if (items.length) {
    if (rest.length) items.push(rest.join('\n'))
    return items
  }
  return [plainLines.join('\n')]
}

/** 从日报正文提取「遇到的问题」段，无则返回「无」 */
export function extractProblems(content: string): string {
  const lines = content.split('\n')
  let capture = false
  const out: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (PROBLEMS_RE.test(t)) {
      capture = true
      continue
    }
    if (capture && HEADING_RE.test(t)) break
    if (capture && t) {
      out.push(t.replace(/^(?:\d+[.、]\s*|[-*+]\s+)/, '').trim())
    }
  }
  return out.join('\n').trim() || '无'
}

/** 生成指定日期区间的周报 */
export function buildWeeklyReport(
  diaries: Diary[],
  from: string,
  to: string,
  name = DEFAULT_NAME,
  rules: ProjectRule[] = DEFAULT_PROJECT_RULES,
): WeeklyReport {
  const rows: WeeklyRow[] = []
  const inRange = diaries
    .filter((d) => d.date >= from && d.date <= to)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  for (const d of inRange) {
    const entries = extractEntries(d.content)
    const problems = extractProblems(d.content)
    // 同日期 + 同项目合并为一行，多条内容用编号
    const byProject = new Map<string, string[]>()
    for (const raw of entries) {
      const { project, content } = parseEntry(raw, rules)
      if (!content) continue
      if (!byProject.has(project)) byProject.set(project, [])
      byProject.get(project)!.push(content)
    }
    for (const [project, contents] of byProject) {
      // 统一编号：一条也显示「1. 」，多条按顺序编号
      const merged = contents.map((c, i) => `${i + 1}. ${c}`).join('\n')
      rows.push({
        date: d.date,
        project,
        content: merged,
        problems,
        name,
        note: '',
      })
    }
  }
  return { rows, from, to }
}

/** 按日期分组（预览用） */
export function groupByDate(rows: WeeklyRow[]): { date: string; rows: WeeklyRow[] }[] {
  const map = new Map<string, WeeklyRow[]>()
  for (const r of rows) {
    if (!map.has(r.date)) map.set(r.date, [])
    map.get(r.date)!.push(r)
  }
  return [...map.entries()]
    .map(([date, rows]) => ({ date, rows }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** 项目类型出现的顺序（按首见） */
export function projectOrder(rows: WeeklyRow[]): string[] {
  const seen: string[] = []
  for (const r of rows) {
    if (!seen.includes(r.project)) seen.push(r.project)
  }
  return seen
}
