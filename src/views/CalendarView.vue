<script setup lang="ts">
import MonthCalendar from '../components/calendar/MonthCalendar.vue'
</script>

<template>
  <div class="calendar-view">
    <MonthCalendar />
  </div>
</template>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
}
</style>
