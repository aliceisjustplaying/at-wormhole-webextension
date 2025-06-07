import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import effectPlugin from '@effect/eslint-plugin';
import functional from 'eslint-plugin-functional';

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
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      '@effect': effectPlugin,
      functional: functional,
    },
    rules: {
      // Effect-specific rules (limited rules available currently)
      '@effect/no-import-from-barrel-package': 'warn',

      // Functional programming rules
      'functional/no-let': 'error',
      'functional/prefer-immutable-types': [
        'warn',
        {
          enforcement: 'ReadonlyDeep',
          ignoreClasses: true,
        },
      ],
      'functional/no-loop-statements': 'error',
      'functional/no-throw-statements': 'error',
    },
  },
  {
    files: ['eslint.config.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
