import { defineStore } from 'pinia'
import type { ViewName } from '../types'

export const useUiStore = defineStore('ui', {
  state: () => ({
    view: 'write' as ViewName,
  }),
  actions: {
    go(view: ViewName) {
      this.view = view
    },
  },
})
