import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),

      // ── Hỗ trợ Samsung TV / trình duyệt cũ ──────────────────────────────
      // Tạo 2 bundle: modern (ES module) + legacy (nomodule, ES5 fallback)
      // Samsung TV Tizen 5.x dùng Chrome 56 → cần legacy bundle
      legacy({
        targets: [
          'chrome >= 56',   // Samsung TV Tizen 5.0 (2019)
          'safari >= 11',
          'firefox >= 78',
        ],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
        renderLegacyChunks: true,
        polyfills: [
          'es.promise',
          'es.array.iterator',
          'es.object.assign',
          'es.string.includes',
          'es.array.includes',
          'es.array.find',
          'web.url',
        ],
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      // Target Chrome 56+ để hỗ trợ Samsung TV Tizen 5
      target: ['chrome56', 'safari11', 'firefox78'],
    },
  };
});
