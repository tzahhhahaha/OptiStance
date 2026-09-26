module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-explicit-any': 'off',

    // The project uses the automatic JSX runtime (tsconfig "jsx": "react-jsx",
    // React 18), so React does not need to be in scope to use JSX.
    'react/react-in-jsx-scope': 'off',

    // Props are typed in TypeScript, so PropTypes validation does not apply.
    'react/prop-types': 'off',
  },
};
