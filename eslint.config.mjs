// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import pluginVue from 'eslint-plugin-vue'

const vueRulesOff = Object.fromEntries(
  Object.keys(pluginVue.rules).map(key => [`vue/${key}`, 'off'])
)

export default withNuxt(
  {
    rules: {
      ...vueRulesOff,
      'nuxt/nuxt-config-keys-order': 'off',
      '@stylistic/no-trailing-spaces': 'off'
    }
  }
)
