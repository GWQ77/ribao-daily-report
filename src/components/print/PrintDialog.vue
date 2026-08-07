<script setup lang="ts">
import { computed } from 'vue'
import { NModal, NButton } from 'naive-ui'
import type { Diary } from '../../types'
import { mdToHtml } from '../../lib/markdown'
import { countWords } from '../../types'

const props = defineProps<{
  show: boolean
  title: string
  diaries: Diary[]
}>()
const emit = defineEmits<{ 'update:show': [boolean] }>()

const rendered = computed(() =>
  props.diaries.map((d) => ({
    d,
    html: mdToHtml(d.content),
  })),
)

const totalWords = computed(() =>
  props.diaries.reduce((s, d) => s + countWords(d.content), 0),
)

function doPrint() {
  window.print()
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="emit('update:show', $event)"
    :mask-closable="false"
    class="no-print"
    style="width: min(780px, 92vw)"
  >
    <div class="print-modal no-print">
      <div class="pm-toolbar">
        <div class="pm-title">打印预览 · {{ title }}</div>
        <div class="pm-actions">
          <span class="pm-count">{{ diaries.length }} 篇 · {{ totalWords }} 字</span>
          <n-button size="small" quaternary @click="emit('update:show', false)">关闭</n-button>
          <n-button size="small" type="primary" @click="doPrint">
            打印 / 存为 PDF
          </n-button>
        </div>
      </div>
      <div class="pm-scroll">
        <div class="print-sheet">
          <div class="ps-head">
            <span class="ps-title">日报 · {{ title }}</span>
            <span class="ps-sub">共 {{ diaries.length }} 篇 · {{ totalWords }} 字 · 生成于 {{ new Date().toLocaleDateString() }}</span>
          </div>
          <article v-for="item in rendered" :key="item.d.date">
            <h2>{{ item.d.date }} <span v-if="item.d.mood">{{ item.d.mood }}</span></h2>
            <div class="ps-meta" v-if="item.d.tags.length">标签：{{ item.d.tags.join('、') }}</div>
            <div v-html="item.html" />
          </article>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.print-modal {
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: var(--glass-blur-lg);
  backdrop-filter: var(--glass-blur-lg);
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--glass-border-strong);
  box-shadow: var(--glass-shadow-pop);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
}
.pm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
}
.pm-title {
  font-size: 14px;
  font-weight: 600;
}
.pm-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pm-count {
  font-size: 12px;
  color: var(--text-3);
}
.pm-scroll {
  overflow: auto;
  padding: 24px;
}
.print-sheet {
  background: #fff;
  color: #000;
  border-radius: 8px;
  padding: 28px 32px;
  box-shadow: inset 0 0 0 1px #eee;
}
</style>
