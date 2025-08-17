import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 모든 백엔드 API를 한 번에 프록시 (확장성 있는 설정)
      '^/(api|healthz|debug|symbols|[a-z]+)$': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
})
