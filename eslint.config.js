import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.ts', 'packages/*/*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-eval': 'error',
      'no-implied-eval': 'off',
      '@typescript-eslint/no-implied-eval': 'error',
    },
  },
  {
    // Le moteur reste pur : ni réseau, ni DOM, ni accès au système.
    files: ['packages/engine/src/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': ['error', { patterns: ['node:*', 'fs', 'http', 'net', 'ws'] }],
      'no-restricted-globals': ['error', 'window', 'document', 'process', 'fetch', 'WebSocket'],
    },
  },
  {
    files: ['packages/client/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Le client n'embarque aucune logique de règles : types du moteur uniquement.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@pepite/engine',
              message: 'Le client ne contient pas de règles.',
              allowTypeImports: true,
            },
            {
              name: '@pepite/shared',
              message:
                'Importez les constantes depuis @pepite/shared/branding ou /cosmetics : la racine embarque zod.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Scripts Playwright : une partie du code s'exécute dans la page.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
