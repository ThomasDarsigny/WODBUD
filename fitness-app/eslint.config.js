import js from '@eslint/js'
import globals from 'globals'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: globals.browser
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // `no-undef` vient de js.configs.recommended et n'a pas de sens sur du
      // TypeScript : c'est le compilateur qui vérifie les identifiants, et la
      // règle ne connaît pas les types globaux (React.KeyboardEvent,
      // RequestInit, SpeechSynthesisVoice...). Elle produisait 12 fausses
      // erreurs qui faisaient échouer `npm run lint` en entier.
      'no-undef': 'off',
      // Même logique : la version TypeScript de la règle comprend les types,
      // les enums et les paramètres de type. La règle de base, non.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  {
    ignores: ['dist/', 'node_modules/', 'src/lib/database.types.ts']
  }
]
