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
        dark: false,
        colors: {
          primary: '#F2740C',   // 暖橙（默认强调色）
          secondary: '#178841', // Woolies 绿
          like: '#12B877',
          nope: '#FF3D5E',
          surface: '#FFFFFF',
          background: '#FBF2EC',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#FF9D44',
          secondary: '#3FB36B',
          like: '#2BE08A',
          nope: '#FF6B82',
          surface: '#1A1726',
          background: '#0E0D17',
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
