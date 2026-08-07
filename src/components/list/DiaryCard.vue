<script setup lang="ts">
import type { Diary } from '../../types'
import { excerpt } from '../../types'
import { useDiaryStore } from '../../stores/diary'
import { useUiStore } from '../../stores/ui'

const props = defineProps<{ diary: Diary }>()

const diaryStore = useDiaryStore()
const ui = useUiStore()

function open() {
  void diaryStore.goToDate(props.diary.date)
  ui.go('write')
}
</script>

<template>
  <button class="diary-card" @click="open">
    <div class="dc-left">
      <div class="dc-date">
        <span class="dc-month">{{ Number(diary.date.slice(5, 7)) }}月</span>
        <span class="dc-day">{{ Number(diary.date.slice(8)) }}</span>
      </div>
    </div>
    <div class="dc-body">
      <div class="dc-top">
        <span class="dc-week">{{ '星期' + '日一二三四五六'[new Date(diary.date + 'T00:00:00').getDay()] }}</span>
        <span class="dc-mood">{{ diary.mood }}</span>
        <span class="dc-words">{{ diaryStore.diaryTextLen(diary) }} 字</span>
      </div>
      <div class="dc-excerpt">{{ excerpt(diary.content, 90) || '（空）' }}</div>
      <div class="dc-tags" v-if="diary.tags.length">
        <span v-for="t in diary.tags" :key="t" class="dc-tag">#{{ t }}</span>
      </div>
    </div>
  </button>
</template>

<style scoped>
.diary-card {
  width: 100%;
  display: flex;
  gap: 16px;
  text-align: left;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--bg-elevated);
  cursor: pointer;
  font-family: inherit;
  transition: all var(--dur-fast) var(--ease-apple);
  box-shadow: var(--shadow-card);
}
.diary-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-pop);
  border-color: var(--border-strong);
}
.diary-card:active {
  transform: scale(0.99);
}

.dc-left {
  flex-shrink: 0;
}
.dc-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-inset);
  border-radius: 12px;
  padding: 8px 12px;
  min-width: 56px;
}
.dc-month {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
}
.dc-day {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
}

.dc-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dc-top {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-3);
}
.dc-week {
  font-weight: 600;
  color: var(--text-2);
}
.dc-mood {
  font-size: 15px;
}
.dc-words {
  margin-left: auto;
}
.dc-excerpt {
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dc-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.dc-tag {
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}
</style>
