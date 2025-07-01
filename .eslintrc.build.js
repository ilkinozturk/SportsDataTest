module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true
    }
  },
  rules: {
    // Error prevention
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-alert': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Best practices
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-implicit-coercion': 'error',
    'no-implicit-globals': 'error',
    'no-invalid-this': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-new': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-return-await': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'no-void': 'error',
    'no-with': 'error',
    'prefer-promise-reject-errors': 'error',
    'radix': 'error',
    'wrap-iife': ['error', 'outside'],
    'yoda': 'error',
    
    // Variables
    'no-shadow': 'error',
    'no-shadow-restricted-names': 'error',
    'no-undef-init': 'error',
    'no-undefined': 'off',
    'no-use-before-define': ['error', { functions: false, classes: true }],
    
    // ES6
    'arrow-body-style': ['error', 'as-needed'],
    'arrow-parens': ['error', 'as-needed'],
    'arrow-spacing': 'error',
    'generator-star-spacing': ['error', 'after'],
    'no-confusing-arrow': ['error', { allowParens: true }],
    'no-duplicate-imports': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'no-var': 'error',
    'object-shorthand': ['error', 'always'],
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-destructuring': ['error', {
      array: false,
      object: true
    }],
    'prefer-numeric-literals': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',
    'rest-spread-spacing': 'error',
    'sort-imports': ['error', {
      ignoreCase: true,
      ignoreDeclarationSort: true
    }],
    'symbol-description': 'error',
    'template-curly-spacing': 'error',
    'yield-star-spacing': ['error', 'after'],
    
    // Prettier
    'prettier/prettier': ['error', {
      singleQuote: true,
      trailingComma: 'es5',
      arrowParens: 'avoid',
      endOfLine: 'auto'
    }]
  },
  globals: {
    // Global variables
    ENV: 'readonly',
    filterManager: 'readonly',
    performanceMonitor: 'readonly'
  },
  overrides: [
    {
      files: ['*.test.js', '*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['webpack.config.js', '.eslintrc.js', 'postcss.config.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off'
      }
    }
  ]
};