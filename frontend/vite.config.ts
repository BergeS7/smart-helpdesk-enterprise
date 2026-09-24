/**
 * Responsabilidade: Módulo de vite config; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Carimba o public/sw.js copiado para o build com uma versão única (commit do Vercel ou horário).
// Falha o build se o marcador sumir, para nunca publicar um service worker com cache fixo.
function serviceWorkerVersion() {
  let outDir = 'dist'
  return {
    name: 'service-worker-version',
    apply: 'build' as const,
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const file = path.join(outDir, 'sw.js')
      const source = fs.readFileSync(file, 'utf8')
      if (!source.includes('__SW_VERSION__')) throw new Error('sw.js sem o marcador __SW_VERSION__')
      const version = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 12) || Date.now().toString(36)
      fs.writeFileSync(file, source.replaceAll('__SW_VERSION__', version))
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    serviceWorkerVersion(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
