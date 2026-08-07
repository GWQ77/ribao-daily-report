import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/tokens.css'
import './styles/global.css'
import './styles/print.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')
