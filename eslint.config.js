import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import { jsxNoTargetBlankWithoutNoopener } from './eslint-rules/jsx-no-target-blank-without-noopener.js'

export default defineConfig([
  globalIgnores(['dist', 'mcp-server/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      sentinel: {
        rules: {
          'jsx-no-target-blank-without-noopener': jsxNoTargetBlankWithoutNoopener,
        },
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'sentinel/jsx-no-target-blank-without-noopener': 'error',
    },
  },
])
