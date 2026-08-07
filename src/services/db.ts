import type { Diary, DiaryInput, DiaryRow, UpsertResult } from '../types'
import { invoke } from '../lib/tauri'
import { toDateKey } from '../types'

/* ============================================================
   数据库后端抽象
   真实模式 → tauri-plugin-sql（便携 SQLite，exe 同级 data/diary.db）
   mock 模式 → localStorage 持久化 + 示例数据（浏览器打磨 UI）
   ============================================================ */

export interface DiaryBackend {
  init(): Promise<void>
  getByDate(date: string): Promise<Diary | null>
  upsert(input: DiaryInput): Promise<UpsertResult>
  getRange(from: string, to: string): Promise<Diary[]>
  listAll(): Promise<Diary[]>
  deleteByDate(date: string): Promise<void>
  importAll(diaries: Diary[]): Promise<void>
}

/* ---------------- 真实模式：SQLite ---------------- */

class TauriBackend implements DiaryBackend {
  private db: import('@tauri-apps/plugin-sql').default | null = null

  async init() {
    // Rust 返回 snake_case（db_url / exe_dir），这里兼容两种命名
    const paths = (await invoke('portable_paths')) as {
      dbUrl?: string
      exeDir?: string
      db_url?: string
      exe_dir?: string
    }
    const dbUrl = paths.dbUrl || paths.db_url || ''
    const { default: Database } = await import('@tauri-apps/plugin-sql')
    this.db = await Database.load(dbUrl)
  }

  private rowToDiary(r: DiaryRow): Diary {
    let tags: string[] = []
    try {
      tags = JSON.parse(r.tags || '[]')
    } catch {
      tags = []
    }
    return { ...r, tags }
  }

  async getByDate(date: string): Promise<Diary | null> {
    const rows = await this.db!.select<DiaryRow[]>(
      'SELECT * FROM diary WHERE date = $1',
      [date],
    )
    return rows.length ? this.rowToDiary(rows[0]) : null
  }

  async upsert(input: DiaryInput): Promise<UpsertResult> {
    const existing = await this.getByDate(input.date)
    if (existing) {
      await this.db!.execute(
        'UPDATE diary SET content=$1, mood=$2, tags=$3, updated_at=$4 WHERE date=$5',
        [
          input.content,
          input.mood,
          JSON.stringify(input.tags),
          input.updated_at,
          input.date,
        ],
      )
      return { id: existing.id }
    }
    const res = await this.db!.execute(
      `INSERT INTO diary (date, content, mood, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.date,
        input.content,
        input.mood,
        JSON.stringify(input.tags),
        input.updated_at,
        input.updated_at,
      ],
    )
    return { id: Number(res.lastInsertId) }
  }

  async getRange(from: string, to: string): Promise<Diary[]> {
    const rows = await this.db!.select<DiaryRow[]>(
      'SELECT * FROM diary WHERE date BETWEEN $1 AND $2 ORDER BY date ASC',
      [from, to],
    )
    return rows.map((r) => this.rowToDiary(r))
  }

  async listAll(): Promise<Diary[]> {
    const rows = await this.db!.select<DiaryRow[]>(
      'SELECT * FROM diary ORDER BY date DESC',
    )
    return rows.map((r) => this.rowToDiary(r))
  }

  async deleteByDate(date: string): Promise<void> {
    await this.db!.execute('DELETE FROM diary WHERE date=$1', [date])
  }

  async importAll(diaries: Diary[]): Promise<void> {
    for (const d of diaries) {
      await this.upsert({
        date: d.date,
        content: d.content,
        mood: d.mood,
        tags: d.tags,
        updated_at: d.updated_at,
      })
    }
  }
}

/* ---------------- mock 模式：localStorage + 示例数据 ---------------- */

const LS_KEY = 'ribao-mock-db-v1'

function seedDiaries(): Diary[] {
  const now = new Date()
  const mk = (offset: number, content: string, mood: string, tags: string[]): Diary => {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    const key = toDateKey(d)
    return {
      id: offset + 1,
      date: key,
      content,
      mood,
      tags,
      created_at: key + 'T09:00:00',
      updated_at: key + 'T18:30:00',
    }
  }
  return [
    mk(
      0,
      '## 今日完成\n\n- 完成日报工具的 UI 设计稿，确认苹果风格\n- 确定技术栈：Tauri + Vue3 + SQLite\n\n## 遇到的问题\n\n- ByteMD 深色主题需要自己写 CSS 覆盖\n\n## 明日计划\n\n- 搭建项目骨架\n- 实现数据层',
      '😄',
      ['产品', '规划'],
    ),
    mk(
      1,
      '## 今日完成\n\n- 调研 tauri-plugin-sql 便携路径方案\n- 确认单 exe 打包策略\n\n## 明日计划\n\n- 设计数据库 schema',
      '😊',
      ['调研'],
    ),
    mk(
      3,
      '## 今日完成\n\n- 维护服务器，修复 nginx 配置\n- 排查磁盘告警\n\n## 遇到的问题\n\n- 日志轮转未生效，已修复',
      '😐',
      ['运维'],
    ),
  ]
}

class MockBackend implements DiaryBackend {
  private map = new Map<string, Diary>()

  async init() {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === null) {
      // 首次运行：写入示例数据
      for (const d of seedDiaries()) this.map.set(d.date, d)
      this.persist()
    } else {
      // 已初始化：原样加载（即使为空数组也不重新 seed）
      try {
        const arr = JSON.parse(raw) as Diary[]
        for (const d of arr) this.map.set(d.date, d)
      } catch {
        /* ignore */
      }
    }
  }

  private persist() {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify([...this.map.values()].sort((a, b) => (a.date < b.date ? 1 : -1))),
    )
  }

  async getByDate(date: string): Promise<Diary | null> {
    return this.map.get(date) ?? null
  }

  async upsert(input: DiaryInput): Promise<UpsertResult> {
    const existing = this.map.get(input.date)
    if (existing) {
      existing.content = input.content
      existing.mood = input.mood
      existing.tags = input.tags
      existing.updated_at = input.updated_at
    } else {
      const id = this.map.size + 1
      this.map.set(input.date, {
        id,
        date: input.date,
        content: input.content,
        mood: input.mood,
        tags: input.tags,
        created_at: input.updated_at,
        updated_at: input.updated_at,
      })
    }
    this.persist()
    return { id: this.map.get(input.date)!.id }
  }

  async getRange(from: string, to: string): Promise<Diary[]> {
    return [...this.map.values()]
      .filter((d) => d.date >= from && d.date <= to)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }

  async listAll(): Promise<Diary[]> {
    return [...this.map.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
  }

  async deleteByDate(date: string): Promise<void> {
    this.map.delete(date)
    this.persist()
  }

  async importAll(diaries: Diary[]): Promise<void> {
    for (const d of diaries) {
      this.map.set(d.date, { ...d })
    }
    this.persist()
  }
}

/* ---------------- 单例 ---------------- */

let backend: DiaryBackend | null = null

export async function getBackend(): Promise<DiaryBackend> {
  if (backend) return backend
  const useMock = import.meta.env.VITE_MOCK === '1' || !('__TAURI_INTERNALS__' in window)
  backend = useMock ? new MockBackend() : new TauriBackend()
  await backend.init()
  return backend
}

export function resetBackend() {
  backend = null
}
