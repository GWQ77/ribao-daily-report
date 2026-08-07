<script setup lang="ts">
import { ref } from 'vue'
import { NIcon } from 'naive-ui'
import { StatsChartOutline } from '@vicons/ionicons5'
import DiaryEditor from '../components/editor/DiaryEditor.vue'
import WriteSidebar from '../components/editor/WriteSidebar.vue'

const sidebarOpen = ref(true)
</script>

<template>
  <div class="write-view">
    <DiaryEditor />
    <div class="sidebar-zone" :class="{ open: sidebarOpen }">
      <button
        v-if="!sidebarOpen"
        class="sidebar-tab"
        title="今日概览"
        @click="sidebarOpen = true"
      >
        <n-icon :component="StatsChartOutline" :size="17" />
        <span>概览</span>
      </button>
      <WriteSidebar v-else @close="sidebarOpen = false" />
    </div>
  </div>
</template>

<style scoped>
.write-view {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
}
.sidebar-zone {
  width: 44px;
  overflow: hidden;
  display: flex;
  transition: width 0.25s var(--ease-apple);
}
.sidebar-zone.open {
  width: 280px;
}
.sidebar-tab {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-card);
  transition: all var(--dur-fast) var(--ease-apple);
}
.sidebar-tab:hover {
  background: var(--bg-hover);
  color: var(--accent);
}
</style>
