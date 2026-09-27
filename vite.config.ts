import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    // Split the framework and the backend client into their own chunks.
    //
    // The app previously shipped as a single ~780 kB entry chunk, so every
    // athlete downloaded the MediaPipe runtime and the whole admin console
    // before they could see the pose library. React and the Supabase client
    // change far less often than app code, so isolating them keeps their chunks
    // cached across deploys instead of being invalidated with every release.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    // The pose engine is now fetched on demand, but it is legitimately large.
    // Raising the threshold keeps the signal meaningful: the default 500 kB
    // limit fired on the combined chunk and told us nothing actionable.
    chunkSizeWarningLimit: 900,
  },
})