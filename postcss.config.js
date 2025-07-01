module.exports = {
  plugins: [
    require('autoprefixer')({
      overrideBrowserslist: [
        'last 2 versions',
        '> 1%',
        'IE 11'
      ],
      grid: true
    }),
    process.env.NODE_ENV === 'production' && require('cssnano')({
      preset: ['default', {
        discardComments: {
          removeAll: true
        },
        normalizeWhitespace: true,
        colormin: true,
        minifyFontValues: true,
        minifyGradients: true,
        minifyParams: true,
        minifySelectors: true,
        minifyUrls: true,
        reduceIdents: false,
        reduceInitial: false,
        reduceTransforms: true,
        svgo: true,
        calc: true,
        convertValues: {
          length: false
        },
        orderedValues: true,
        mergeLonghand: true,
        mergeRules: true,
        minifyFontWeight: true,
        discardDuplicates: true,
        discardEmpty: true,
        discardOverridden: true,
        discardUnused: true,
        mergeIdents: false,
        zindex: false
      }]
    })
  ].filter(Boolean)
};