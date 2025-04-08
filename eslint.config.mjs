import nextPlugin from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals'; // Import globals

export default [
  {
    ignores: [
      '.next/**/*',
      'node_modules/**/*',
      'netlify-build.js',
      'seed-production.js',
      'db_backups/**/*', // Ignore backup directory
    ]
  },
  // Base configuration for JS/TS files
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser, // Add browser globals
        ...globals.node,   // Add Node.js globals
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@next': nextPlugin,
    },
    rules: {
      // Apply Next.js recommended rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // General rules (can override plugin rules if needed)
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }], // Allow log for debugging
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-expressions': 'off', // Allow unused expressions

      // React specific rules (often handled by Next.js plugin)
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    }
  },
  // TypeScript specific configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // TypeScript specific rules (can override base rules)
      '@typescript-eslint/no-unused-vars': ['warn', { // Changed to warn for dev flexibility
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn', // Changed to warn
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-interface': 'warn', // Changed to warn
      '@typescript-eslint/no-non-null-assertion': 'warn', // Changed to warn
      '@typescript-eslint/no-unused-expressions': 'off', // Allow unused expressions
    }
  }
];
