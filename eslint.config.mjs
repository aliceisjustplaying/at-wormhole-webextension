import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
// import neverthrowMustUse from 'eslint-plugin-neverthrow-must-use';

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
    },
  },
  // {
  //   files: ['**/*.ts', '**/*.tsx'],
  //   plugins: {
  //     'neverthrow-must-use': neverthrowMustUse,
  //   },
  //   rules: {
  //     'neverthrow-must-use/must-use-result': 'error',
  //   },
  // },
  {
    files: ['eslint.config.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
