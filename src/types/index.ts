/** 日记实体（前端用，tags 为数组） */
export interface Diary {
  id: number
  date: string // 'YYYY-MM-DD'
  content: string
  mood: string // 心情 emoji
  tags: string[]
  created_at: string
  updated_at: string
}

/** SQLite 行（tags 为 JSON 字符串） */
export interface DiaryRow {
  id: number
  date: string
  content: string
  mood: string
  tags: string
  created_at: string
  updated_at: string
}

export type ThemeMode = 'auto' | 'light' | 'dark'

/** 项目归类规则：内容含关键词则归入该项目 */
export interface ProjectRule {
  keyword: string
  project: string
}

export interface AppSettings {
  theme: ThemeMode
  snoozeMinutes: number
  /** 姓名（导出周报时填入「人员姓名」列与文件名） */
  name: string
  /** 项目归类关键词规则 */
  projectRules: ProjectRule[]
  /** 常用短语（写日报时快捷插入） */
  quickPhrases: string[]
  /** 历史周报文件索引 */
  weeklyReports: WeeklyReportFile[]
}

/** 历史周报文件信息 */
export interface WeeklyReportFile {
  /** 显示名，如 2026.5.11-5.15 */
  label: string
  /** 日期范围起，YYYY-MM-DD */
  from: string
  /** 日期范围止，YYYY-MM-DD */
  to: string
  /** 完整文件路径 */
  path: string
}

export type ViewName = 'write' | 'calendar' | 'search' | 'stats' | 'weekly' | 'settings'

export interface PortablePaths {
  dbUrl: string
  dbPath: string
  configPath: string
  exeDir: string
}

export interface BackupFile {
  app: 'ribao'
  version: 1
  exportedAt: string
  diaries: Diary[]
}

/** 可保存的日记输入（不含 id / created_at） */
export interface DiaryInput {
  date: string
  content: string
  mood: string
  tags: string[]
  updated_at: string
}

/** 新建记录返回值 */
export interface UpsertResult {
  id: number
}

/** 日期工具：本地时区 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

/** 纯文本字数（去除 markdown 符号后的 CJK/字符计数） */
export function countWords(text: string): number {
  const plain = stripMarkdown(text)
  // 中文按字计，其他连续字母/数字按一个词计
  const cjk = plain.match(/[一-鿿぀-ヿ가-힯]/g)?.length ?? 0
  const other = plain
    .replace(/[一-鿿぀-ヿ가-힯]/g, ' ')
    .match(/[a-zA-Z0-9]+/g)?.length ?? 0
  return cjk + other
}

/** 粗略去除 markdown 语法，用于摘要与统计 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-+*]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/^[-=]{3,}\s*$/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\|/g, ' ')
    .trim()
}

export function excerpt(content: string, len = 80): string {
  const plain = stripMarkdown(content).replace(/\s+/g, ' ')
  return plain.length > len ? plain.slice(0, len) + '…' : plain
}

/** 提取「今日完成」段落为纯文本（供一键复制） */
export function extractTodayDone(content: string): string {
  const lines = content.split('\n')
  let capture = false
  const out: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^#{1,3}\s*今日完成/.test(trimmed)) {
      capture = true
      continue
    }
    if (capture && /^#{1,3}\s/.test(trimmed) && !/^#{1,3}\s*今日完成/.test(trimmed)) {
      break
    }
    if (capture && trimmed) out.push(stripMarkdown(line))
  }
  return out.join('\n').trim()
}
