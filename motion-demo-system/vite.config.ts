import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 版本号唯一来源：package.json 的 version。界面（__APP_VERSION__）与桌面端
// （src-tauri/tauri.conf.json 的 version）都应与它保持一致，改版本只改这里。
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // 端口必须与 src-tauri/tauri.conf.json 的 build.devUrl 保持一致（8011）。
  // strictPort 让端口被占用时直接失败，而不是静默漂移到别的端口导致 Tauri 连不上。
  server: { host: '127.0.0.1', port: 8011, strictPort: true },
});