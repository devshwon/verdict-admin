import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 배포 시 base 경로는 repo 이름과 일치해야 함.
// 환경변수 BASE_URL 로 override 가능 (CI에서 주입).
const base = process.env.BASE_URL ?? '/verdict_admin/';

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
