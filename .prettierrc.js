module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Line length
  printWidth: 100,

  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'avoid',

  // End of line
  endOfLine: 'lf',

  // Quotes in objects
  quoteProps: 'as-needed',

  // JSX (in case we add React later)
  jsxSingleQuote: true,

  // Vue (in case we add Vue later)
  vueIndentScriptAndStyle: false,

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',

  // Prose wrapping
  proseWrap: 'preserve',

  // Override for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        parser: 'json',
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        proseWrap: 'always',
        printWidth: 80,
      },
    },
    {
      files: '*.html',
      options: {
        parser: 'html',
        printWidth: 120,
      },
    },
    {
      files: '*.css',
      options: {
        parser: 'css',
        printWidth: 120,
      },
    },
  ],
};
