import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { noImportFromBarrelPackage } from '@effect/eslint-plugin/rules/no-import-from-barrel-package';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js'],
          defaultProject: 'tsconfig.json',
        },
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@effect/eslint-plugin': {
        rules: {
          'no-import-from-barrel-package': noImportFromBarrelPackage,
        },
      },
    },
    rules: {
      '@effect/eslint-plugin/no-import-from-barrel-package': 'error',
    },
  },
  {
    files: ['eslint.config.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
