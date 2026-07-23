// ESLint Flat Config (ESLint 9). Vorher existierte KEINE Konfiguration —
// `npm run lint` brach mit "couldn't find an eslint.config file" ab, es gab
// also keinerlei statische Analyse. Siehe docs/produktionsreife-massnahmenplan.md OPS-02.
//
// eslint-config-next 16 liefert native Flat-Configs; kein FlatCompat nötig.

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'public/gsap.min.js',
      'public/ab.js', // ES5-Snippet für Fremdseiten, eigene Regeln
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // `any` verwässert genau die Typen, die uns bei Refactorings schützen.
      '@typescript-eslint/no-explicit-any': 'error',
      // Ungenutzte Variablen zeigen tote Props und vergessene Refactorings an.
      // Unterstrich-Präfix als Opt-out für bewusst ignorierte Parameter.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Skripte und Tests laufen außerhalb des Next-Builds.
    files: ['scripts/**', '__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default config
