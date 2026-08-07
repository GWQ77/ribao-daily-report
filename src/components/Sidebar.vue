<script setup lang="ts">
import {
  CreateOutline,
  CalendarOutline,
  SearchOutline,
  StatsChartOutline,
  DocumentTextOutline,
  SettingsOutline,
} from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { useUiStore } from '../stores/ui'
import type { ViewName } from '../types'

const ui = useUiStore()

const navs: { key: ViewName; label: string; icon: any; hint?: string }[] = [
  { key: 'write', label: '写日报', icon: CreateOutline },
  { key: 'calendar', label: '日历', icon: CalendarOutline },
  { key: 'search', label: '搜索', icon: SearchOutline },
  { key: 'stats', label: '统计', icon: StatsChartOutline },
  { key: 'weekly', label: '周报', icon: DocumentTextOutline },
]
</script>

<template>
  <aside class="sidebar glass-sidebar">
    <div class="side-label">日报</div>
    <nav class="side-nav">
      <button
        v-for="item in navs"
        :key="item.key"
        class="side-item"
        :class="{ active: ui.view === item.key }"
        @click="ui.go(item.key)"
      >
        <n-icon :component="item.icon" :size="17" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
    <div class="side-bottom">
      <button
        class="side-item"
        :class="{ active: ui.view === 'settings' }"
        @click="ui.go('settings')"
      >
        <n-icon :component="SettingsOutline" :size="17" />
        <span>设置</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 10px;
  border-right: 1px solid var(--glass-border);
  margin: 8px 0 8px 8px;
  border-radius: var(--radius-card);
  box-shadow: var(--glass-shadow);
  gap: 4px;
  text-shadow: var(--text-shadow);
}

.side-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  letter-spacing: 0.06em;
  padding: 8px 12px 6px;
  text-transform: uppercase;
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.side-bottom {
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.side-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  background: transparent;
  color: var(--text-2);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  border-radius: 9px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-apple);
  text-align: left;
}
.side-item:hover {
  background: var(--bg-hover);
  color: var(--text-1);
}
.side-item.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.side-item.active:hover {
  color: var(--accent);
}
.side-item:active {
  transform: scale(0.98);
}
</style>
