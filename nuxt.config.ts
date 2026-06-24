// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  vite: {
    optimizeDeps: {
      include: ['gifenc']
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  nitro: {
    externals: {
      external: ['@openeo/js-client', '@openeo/js-commons', 'tiff', 'axios']
    },
    typescript: {
      tsConfig: {
        compilerOptions: {
          types: ['node']
        }
      }
    }
  },

  typescript: {
    tsConfig: {
      compilerOptions: {
        noUnusedLocals: false
      }
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  fonts: {
    families: [
      { name: 'IBM Plex Mono', provider: 'google', weights: [300, 400, 500, 700], styles: ['normal', 'italic'] },
      { name: 'IBM Plex Sans', provider: 'google', weights: [100, 200, 300, 400, 500, 600, 700], styles: ['normal'] }
    ]
  }
})
