import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'


// https://vite.dev/config/
export default defineConfig(({ command }) => {

  const isServe = command === 'serve'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  return {
    plugins: [react()],
    base: './', // Use relative paths for Electron
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    },
    server: {
      port: 5173,
    },
    clearScreen: false,
    build: {
      sourcemap,
      outDir: 'dist-web',
      rollupOptions: {
        external: ['electron']
      },
      copyPublicDir: true
    }
  }
})

