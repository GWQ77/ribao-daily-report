<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { windowControls, inTauri } from '../lib/tauri'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useDiaryStore } from '../stores/diary'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import { SettingsOutline, MoonOutline, SunnyOutline } from '@vicons/ionicons5'
import { NIcon, NButton } from 'naive-ui'

const diary = useDiaryStore()
const settings = useSettingsStore()
const ui = useUiStore()
const maximized = ref(false)
const focused = ref(true)
let unlistenFocus: (() => void) | null = null

const dateTitle = computed(() => {
  const d = new Date(diary.date + 'T00:00:00')
  const now = new Date()
  const isToday =
    diary.date ===
    [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  const base = `${d.getMonth() + 1}月${d.getDate()}日 星期${week}`
  return isToday ? `今天 · ${base}` : `${d.getFullYear()}年 ${base}`
})

function fmtStreak(n: number) {
  return n > 0 ? `${n}` : '0'
}

onMounted(async () => {
  maximized.value = await windowControls.isMaximized()
  if (inTauri()) {
    focused.value = await windowControls.isFocused()
    unlistenFocus = await getCurrentWindow().onFocusChanged(({ payload }) => {
      focused.value = payload
    })
  }
  window.addEventListener('resize', checkMax)
})
onUnmounted(() => {
  unlistenFocus?.()
  window.removeEventListener('resize', checkMax)
})

async function checkMax() {
  maximized.value = await windowControls.isMaximized()
}

/** 双击标题栏最大化/还原（红绿灯等按钮区域除外） */
function onDblClick(e: MouseEvent) {
  const el = e.target as HTMLElement
  if (el.closest('[data-no-drag]')) return
  void windowControls.toggleMaximize()
}
</script>

<template>
  <header
    class="titlebar glass"
    data-tauri-drag-region
    @mousedown="windowControls.startDragging"
    @dblclick="onDblClick"
  >
    <!-- 中部标题 -->
    <div class="titlebar-title" data-tauri-drag-region @mousedown="windowControls.startDragging">
      <span class="app-name">日报</span>
      <span class="date-name" v-if="diary.ready">{{ dateTitle }}</span>
    </div>

    <!-- 右侧统计 + 主题 -->
    <div class="titlebar-right" data-no-drag>
      <div class="stat-pills">
        <span class="stat-pill" title="连续打卡天数">
          <span style="margin-right: 4px">🔥</span>
          {{ fmtStreak(diary.statsSummary.streak) }} 天
        </span>
        <span class="stat-pill" title="今日字数">{{ diary.statsSummary.todayWords }} 字</span>
      </div>

      <n-button
        quaternary
        circle
        size="small"
        :title="settings.isDark ? '切换到浅色' : '切换到深色'"
        @click="settings.setTheme(settings.isDark ? 'light' : 'dark')"
      >
        <template #icon>
          <n-icon :component="settings.isDark ? SunnyOutline : MoonOutline" :size="15" />
        </template>
      </n-button>
      <n-button
        quaternary
        circle
        size="small"
        title="设置"
        @click="ui.go('settings')"
      >
        <template #icon>
          <n-icon :component="SettingsOutline" :size="15" />
        </template>
      </n-button>

      <!-- 红绿灯（Windows 习惯放右侧） -->
      <div class="traffic" data-no-drag>
        <button class="tl tl-red" :class="{ dim: !focused }" title="最小化" @click="windowControls.minimize">
          <span class="tl-glyph">−</span>
        </button>
        <button class="tl tl-yellow" :class="{ dim: !focused }" :title="maximized ? '还原' : '最大化'" @click="windowControls.toggleMaximize">
          <span class="tl-glyph">{{ maximized ? '⤢' : '+' }}</span>
        </button>
        <button class="tl tl-green" :class="{ dim: !focused }" title="关闭" @click="windowControls.close">
          <span class="tl-glyph">×</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.titlebar {
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid var(--glass-border);
  position: relative;
  z-index: 100;
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: var(--glass-blur-lg);
  backdrop-filter: var(--glass-blur-lg);
  box-shadow: var(--glass-shadow);
  text-shadow: var(--text-shadow);
}
/* 顶部柔亮线（液玻璃折射光） */
.titlebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--glass-edge);
  pointer-events: none;
}

.traffic {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 68px;
}
.tl {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: rgba(0, 0, 0, 0.55);
  transition: filter 0.15s ease;
  font-size: 9px;
  line-height: 1;
}
.tl-glyph {
  opacity: 0;
  transition: opacity 0.12s ease;
}
.tl:hover .tl-glyph {
  opacity: 1;
}
.tl-red {
  background: var(--tl-red);
}
.tl-yellow {
  background: var(--tl-yellow);
}
.tl-green {
  background: var(--tl-green);
}
.tl.dim {
  filter: grayscale(1) opacity(0.55);
}

.titlebar-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  height: 100%;
}
.app-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: 0.2px;
}
.date-name {
  font-size: 12.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.titlebar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 6px;
}
.stat-pill {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  background: var(--bg-inset);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  white-space: nowrap;
}
</style>
