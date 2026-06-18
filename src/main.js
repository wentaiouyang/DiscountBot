import { createApp } from 'vue'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#E5231B',   // Coles 红
          secondary: '#178841', // Woolies 绿
          like: '#2ecc71',
          nope: '#ff4d6d',
          surface: '#ffffff',
          background: '#f3f1ec',
        },
      },
    },
  },
})

createApp(App).use(vuetify).mount('#app')

// 注册 Service Worker（支持离线 + 添加到主屏幕/桌面）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('SW 注册失败:', err)
    })
  })
}
