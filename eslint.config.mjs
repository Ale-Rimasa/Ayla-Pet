import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

// eslint-config-next 16 ships native flat configs, so we spread them directly
// instead of going through the legacy FlatCompat layer.
/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
]

export default eslintConfig
