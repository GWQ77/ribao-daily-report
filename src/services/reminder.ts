import { notify } from '../lib/tauri'

/* ============================================================
   提醒服务
   - 启动时检查今日有无日记，无 → needsReminder = true
   - 用户点「稍后提醒」→ 记录 snoozeAt（now + snoozeMinutes）
   - 30s 轮询：到点 → 发系统通知（尽力）+ 应用内浮层回调
   程序运行期间有效；重启后重新从「今日未写」开始。
   ============================================================ */

type FireHandler = () => void

class ReminderService {
  private timer: ReturnType<typeof setInterval> | null = null
  private fireHandler: FireHandler | null = null
  private _snoozeAt = 0
  private _needsReminder = false

  get needsReminder() {
    return this._needsReminder
  }

  get snoozeAt() {
    return this._snoozeAt
  }

  /** 启动时由外部调用：传今日是否已写 */
  setTodayStatus(writtenToday: boolean) {
    this._needsReminder = !writtenToday
  }

  /** 点了「稍后提醒」 */
  snooze(minutes: number) {
    this._snoozeAt = Date.now() + minutes * 60 * 1000
    this._needsReminder = false // 提醒条收起
  }

  /** 用户去写了日记 → 取消 */
  clear() {
    this._needsReminder = false
    this._snoozeAt = 0
  }

  /** 订阅到点事件（应用内浮层） */
  onFire(cb: FireHandler) {
    this.fireHandler = cb
  }

  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 30_000)
    this.tick()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async tick() {
    if (this._snoozeAt <= 0) return
    if (Date.now() < this._snoozeAt) return
    // 到点
    this._snoozeAt = 0
    const title = '日报提醒'
    const body = '别忘了记录今天的日报～'
    await notify(title, body)
    this.fireHandler?.()
  }
}

/** 全局单例 */
export const reminder = new ReminderService()
