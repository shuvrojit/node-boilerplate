import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  { files: ['**/*.{ts}'] },
  {
    ignores: [
      'build',
      'node_modules',
      'coverage',
      'jest.config.js',
      'eslint.config.mjs',
      'tests',
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  prettierConfig,
];
