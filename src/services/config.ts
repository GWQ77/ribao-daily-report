import type { AppSettings, ProjectRule, WeeklyReportFile } from '../types'
import { invoke } from '../lib/tauri'

const LS_KEY = 'ribao-config-v1'

/** 历史周报文件（默认空，由用户在应用内添加，保存在 config.json） */
export const DEFAULT_WEEKLY_REPORTS: WeeklyReportFile[] = []

/** 默认项目归类规则（可按需在设置里增删改） */
export const DEFAULT_PROJECT_RULES: ProjectRule[] = [
  { keyword: '燃气', project: '燃气项目' },
  { keyword: '生命线', project: '生命线项目' },
  { keyword: '许可处', project: '许可处项目' },
]

/** 默认常用短语 */
export const DEFAULT_QUICK_PHRASES: string[] = [
  '生产环境后端部署发一版，并测试程序是否成功启动',
  '生产环境前端部署发一版，并测试网页是否成功启动',
  '排查日志告警并处理',
]

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  snoozeMinutes: 30,
  name: '',
  projectRules: DEFAULT_PROJECT_RULES,
  quickPhrases: DEFAULT_QUICK_PHRASES,
  weeklyReports: DEFAULT_WEEKLY_REPORTS,
}

function normalize(s: Partial<AppSettings>): AppSettings {
  return {
    theme: s.theme === 'dark' || s.theme === 'light' ? s.theme : 'auto',
    snoozeMinutes:
      typeof s.snoozeMinutes === 'number' && s.snoozeMinutes > 0
        ? s.snoozeMinutes
        : DEFAULT_SETTINGS.snoozeMinutes,
    name: typeof s.name === 'string' ? s.name : DEFAULT_SETTINGS.name,
    projectRules: Array.isArray(s.projectRules)
      ? s.projectRules.filter((r) => r && typeof r.keyword === 'string' && typeof r.project === 'string')
      : DEFAULT_PROJECT_RULES,
    quickPhrases: Array.isArray(s.quickPhrases)
      ? s.quickPhrases.filter((p) => typeof p === 'string')
      : DEFAULT_QUICK_PHRASES,
    weeklyReports: Array.isArray(s.weeklyReports)
      ? s.weeklyReports
      : DEFAULT_WEEKLY_REPORTS,
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    if ('__TAURI_INTERNALS__' in window) {
      const raw = await invoke<string>('read_config')
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return normalize(parsed)
    }
    const raw = localStorage.getItem(LS_KEY)
    return raw ? normalize(JSON.parse(raw)) : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  try {
    if ('__TAURI_INTERNALS__' in window) {
      await invoke('write_config', { json: JSON.stringify(s, null, 2) })
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(s))
    }
  } catch (e) {
    console.error('save settings failed', e)
  }
}
