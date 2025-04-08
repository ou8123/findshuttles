import nextPlugin from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

// Define the Next.js plugin configuration object
const nextConfig = {
  files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
  plugins: {
    '@next': nextPlugin
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs['core-web-vitals'].rules,
  }
};

// Define the base TypeScript configuration object
const tsBaseConfig = {
  files: ['**/*.ts', '**/*.tsx'],
  plugins: {
    '@typescript-eslint': tsPlugin,
  },
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
    },
    globals: {
      ...globals.browser,
      ...globals.node,
    }
  },
  rules: {
    // General JS/React rules (apply to TS/TSX too)
    'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-expressions': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',

    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-interface': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-unused-expressions': 'off',
  }
};

export default [
  {
    ignores: [
      '.next/**/*',
      'node_modules/**/*',
      'netlify-build.js',
      'seed-production.js',
      'db_backups/**/*',
    ]
  },
  // Apply the configurations
  nextConfig,
  tsBaseConfig,
  // You can add more specific overrides here if needed
];
