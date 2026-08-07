import { defineStore } from 'pinia'
import type { AppSettings, ThemeMode } from '../types'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/config'

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: { ...DEFAULT_SETTINGS } as AppSettings,
    ready: false,
    systemDark: systemPrefersDark(),
  }),
  getters: {
    isDark(): boolean {
      const s = this.settings
      return s.theme === 'auto' ? this.systemDark : s.theme === 'dark'
    },
  },
  actions: {
    /** 把主题模式同步到 html[data-theme]，供全局 CSS 与 Naive UI 使用 */
    applyTheme() {
      const mode = this.isDark ? 'dark' : 'light'
      document.documentElement.dataset.theme = mode
      document.documentElement.classList.toggle('dark', this.isDark)
    },
    async load() {
      this.settings = await loadSettings()
      this.ready = true
      this.applyTheme()
    },
    async save() {
      await saveSettings(this.settings)
    },
    async setTheme(theme: ThemeMode) {
      this.settings.theme = theme
      this.applyTheme()
      await this.save()
    },
    async setSnooze(minutes: number) {
      this.settings.snoozeMinutes = minutes
      await this.save()
    },
    bindSystemTheme() {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const on = () => {
        this.systemDark = mq.matches
        this.applyTheme()
      }
      mq.addEventListener('change', on)
      this.systemDark = mq.matches
      this.applyTheme()
    },
  },
})
