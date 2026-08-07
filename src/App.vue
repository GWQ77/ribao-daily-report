<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { NConfigProvider, NDialogProvider, NMessageProvider, darkTheme, zhCN, dateZhCN } from 'naive-ui'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import ReminderBanner from './components/ReminderBanner.vue'
import WriteView from './views/WriteView.vue'
import CalendarView from './views/CalendarView.vue'
import SearchView from './views/SearchView.vue'
import StatsView from './views/StatsView.vue'
import WeeklyView from './views/WeeklyView.vue'
import SettingsView from './views/SettingsView.vue'
import { useSettingsStore } from './stores/settings'
import { useDiaryStore } from './stores/diary'
import { useUiStore } from './stores/ui'
import { themeOverrides } from './lib/theme'
import { inTauri } from './lib/tauri'
import { reminder } from './services/reminder'
import { getCurrentWindow } from '@tauri-apps/api/window'

const settings = useSettingsStore()
const diary = useDiaryStore()
const ui = useUiStore()

const theme = computed(() => (settings.isDark ? darkTheme : null))
const overrides = computed(() => themeOverrides(settings.isDark))

let unlistenClose: (() => void) | null = null

onMounted(async () => {
  await settings.load()
  settings.bindSystemTheme()
  await diary.init().catch((e) => console.error('init failed', e))
  diary.bannerVisible = reminder.needsReminder
  // 窗口失焦立即落盘
  if (inTauri()) {
    window.addEventListener('blur', flush)
    // 关窗前先保存，避免异步保存未完成导致丢数据
    unlistenClose = await getCurrentWindow().onCloseRequested(async (e) => {
      e.preventDefault()
      try {
        await diary.saveNow(true)
      } finally {
        await getCurrentWindow().destroy()
      }
    })
  }
  window.addEventListener('beforeunload', flush)
})

onUnmounted(() => {
  if (inTauri()) window.removeEventListener('blur', flush)
  window.removeEventListener('beforeunload', flush)
  unlistenClose?.()
})

function flush() {
  void diary.saveNow(true)
}
</script>

<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="overrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-dialog-provider>
      <n-message-provider>
        <div class="app-root">
          <!-- 动态光斑背景（液玻璃的下层浸染色） -->
          <div class="app-bg no-print" aria-hidden="true">
            <div class="glow glow-1" />
            <div class="glow glow-2" />
            <div class="glow glow-3" />
            <div class="glow glow-4" />
          </div>
          <TitleBar />
          <div class="app-shell">
            <Sidebar />
            <main class="main-pane" id="main-pane">
              <WriteView v-if="ui.view === 'write'" key="write" />
              <CalendarView v-else-if="ui.view === 'calendar'" key="calendar" />
              <SearchView v-else-if="ui.view === 'search'" key="search" />
              <StatsView v-else-if="ui.view === 'stats'" key="stats" />
              <WeeklyView v-else-if="ui.view === 'weekly'" key="weekly" />
              <SettingsView v-else-if="ui.view === 'settings'" key="settings" />
            </main>
          </div>
          <ReminderBanner />
          <transition name="toast">
            <div v-if="diary.reminderToastVisible" class="reminder-toast no-print">
              <span style="font-size: 22px">⏰</span>
              <div>
                <div style="font-weight: 600">该写日报啦</div>
                <div style="font-size: 12px; color: var(--text-3)">记得记录今天的工作与收获</div>
              </div>
              <button class="pill-btn pill-btn--primary" @click="ui.go('write')">去写</button>
            </div>
          </transition>
        </div>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<style scoped>
.app-root {
  height: 100vh;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.app-shell {
  min-height: 0;
  flex: 1 1 0;
  overflow: hidden;
}
.main-pane {
  max-height: 100%;
  overflow: auto;
}
</style>
