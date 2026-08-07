<script setup lang="ts">
import { useDiaryStore } from '../stores/diary'
import { useUiStore } from '../stores/ui'

const diary = useDiaryStore()
const ui = useUiStore()
</script>

<template>
  <transition name="banner">
    <div v-if="diary.bannerVisible && !diary.todayWritten" class="reminder-banner no-print">
      <div class="rb-left">
        <span class="rb-icon">📝</span>
        <span>
          今天还没有写日记
          <span class="rb-muted">— 记录一下今天的工作与收获吧</span>
        </span>
      </div>
      <div class="rb-right">
        <button class="pill-btn pill-btn--ghost rb-btn" @click="diary.snoozeReminder">稍后提醒</button>
        <button class="pill-btn pill-btn--primary rb-btn" @click="ui.go('write')">去写</button>
        <button class="rb-close" title="不再提醒" @click="diary.dismissBanner">✕</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.reminder-banner {
  position: fixed;
  top: 54px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: var(--radius-card);
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border-strong);
  box-shadow: var(--glass-shadow-pop);
  max-width: min(640px, calc(100vw - 260px));
  -webkit-backdrop-filter: var(--glass-blur-lg);
  backdrop-filter: var(--glass-blur-lg);
  text-shadow: var(--text-shadow);
}
.rb-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-1);
}
.rb-icon {
  font-size: 18px;
}
.rb-muted {
  color: var(--text-3);
  font-weight: 400;
}
.rb-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rb-btn {
  padding: 5px 14px;
  font-size: 12.5px;
}
.rb-close {
  border: none;
  background: transparent;
  color: var(--text-3);
  font-size: 12px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all var(--dur-fast);
}
.rb-close:hover {
  background: var(--bg-hover);
  color: var(--text-1);
}

.banner-enter-active,
.banner-leave-active {
  transition: all var(--dur-base) var(--ease-apple);
}
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}
</style>
