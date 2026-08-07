<script setup lang="ts">
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [string] }>()

const MOODS = [
  { e: '😄', label: '开心' },
  { e: '😊', label: '轻松' },
  { e: '😐', label: '平静' },
  { e: '😕', label: '低落' },
  { e: '😢', label: '难过' },
  { e: '😣', label: '疲惫' },
  { e: '🔥', label: '忙碌' },
  { e: '💪', label: '干劲' },
  { e: '😵', label: '困倦' },
]
</script>

<template>
  <div class="mood-picker">
    <button
      v-for="m in MOODS"
      :key="m.e"
      class="mood"
      :class="{ active: modelValue === m.e }"
      :title="m.label"
      @click="$emit('update:modelValue', modelValue === m.e ? '' : m.e)"
    >
      <span class="mood-emoji">{{ m.e }}</span>
    </button>
  </div>
</template>

<style scoped>
.mood-picker {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}
.mood {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px;
  border-radius: 10px;
  transition: all var(--dur-fast) var(--ease-apple);
  font-size: 20px;
  line-height: 1;
  opacity: 0.45;
  filter: grayscale(0.35);
}
.mood-emoji {
  display: block;
  transition: transform var(--dur-fast) var(--ease-apple);
}
.mood:hover {
  opacity: 0.85;
  filter: none;
}
.mood:hover .mood-emoji {
  transform: scale(1.18);
}
.mood.active {
  opacity: 1;
  filter: none;
  background: var(--accent-soft);
}
.mood.active .mood-emoji {
  transform: scale(1.28);
}
</style>
