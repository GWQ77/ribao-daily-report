import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

/** 是否运行在 Tauri 壳内（否则为浏览器 mock 模式） */
export function inTauri(): boolean {
  return isTauri()
}

/** 通用 invoke：mock 模式下走注册的回调 */
type Handler = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
let mockInvoke: Handler | null = null
export function setMockInvoke(fn: Handler) {
  mockInvoke = fn
}

export async function invoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (inTauri()) {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
    return tauriInvoke<T>(cmd, args)
  }
  if (mockInvoke) return mockInvoke(cmd, args) as Promise<T>
  throw new Error(`mock mode: no handler for ${cmd}`)
}

export interface WindowControls {
  minimize(): void
  toggleMaximize(): void
  close(): void
  startDragging(e: Event): void
  isMaximized(): Promise<boolean>
  isFocused(): Promise<boolean>
}

export const windowControls: WindowControls = {
  minimize() {
    if (inTauri()) getCurrentWindow().minimize()
  },
  toggleMaximize() {
    if (inTauri()) getCurrentWindow().toggleMaximize()
  },
  close() {
    if (inTauri()) getCurrentWindow().close()
  },
  startDragging(e: Event) {
    if (!inTauri()) return
    const el = e.target as HTMLElement
    if (el.closest('[data-no-drag]')) return
    void getCurrentWindow().startDragging()
  },
  async isMaximized() {
    if (!inTauri()) return false
    return getCurrentWindow().isMaximized()
  },
  async isFocused() {
    if (!inTauri()) return false
    return getCurrentWindow().isFocused()
  },
}

/** 系统通知（尽力而为；便携无 AUMID 可能不显示，应用内兜底） */
export async function notify(title: string, body: string): Promise<boolean> {
  try {
    if (!inTauri()) {
      // 浏览器 mock：直接 console 提示
      console.info('[notify]', title, body)
      return false
    }
    const notification = await import('@tauri-apps/plugin-notification')
    const granted = await notification.isPermissionGranted()
    if (!granted) {
      const res = await notification.requestPermission()
      if (res !== 'granted') return false
    }
    await notification.sendNotification({ title, body })
    return true
  } catch {
    return false
  }
}
