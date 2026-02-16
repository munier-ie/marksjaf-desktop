import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: {
        main: resolve(__dirname, 'electron/main.ts'),
        preload: resolve(__dirname, 'electron/preload.ts')
      },
      formats: ['cjs'],
      fileName: (format, entryName) => `${entryName}.cjs`
    },
    outDir: 'dist-electron',
    rollupOptions: {
      external: [
        'electron',
        'path',
        'child_process',
        'url',
        'os',
        'crypto',
        'events',
        'stream',
        'util',
        'buffer',
        'fs'
      ],
      output: {
        exports: 'auto',
        interop: 'auto'
      }
    },
    sourcemap: true,
    minify: false,
    target: 'node16',
    ssr: true,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})