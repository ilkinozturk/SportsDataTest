const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CompressionPlugin = require('compression-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;
  
  // Generate contenthash only in production
  const fileNamePattern = isProduction ? '[name].[contenthash]' : '[name]';
  
  return {
    // Entry point
    entry: {
      'team-stats': './public/team-stats.js',
      // Add more entry points as needed
    },
    
    // Output configuration
    output: {
      path: path.resolve(__dirname, 'public/dist'),
      filename: `js/${fileNamePattern}.js`,
      chunkFilename: `js/chunks/${fileNamePattern}.js`,
      assetModuleFilename: 'assets/[hash][ext][query]',
      clean: true, // Clean output directory before build
      publicPath: '/dist/'
    },
    
    // Development server
    devServer: isDevelopment ? {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      hot: true,
      open: true,
      port: 3000,
      historyApiFallback: true,
      compress: true,
      client: {
        overlay: {
          errors: true,
          warnings: false
        }
      }
    } : undefined,
    
    // Source maps
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    // Module resolution
    resolve: {
      extensions: ['.js', '.json', '.css'],
      alias: {
        '@': path.resolve(__dirname, 'public/js'),
        '@core': path.resolve(__dirname, 'public/js/core'),
        '@modules': path.resolve(__dirname, 'public/js/modules'),
        '@utils': path.resolve(__dirname, 'public/js/utils'),
        '@styles': path.resolve(__dirname, 'public/css')
      }
    },
    
    // Module rules
    module: {
      rules: [
        // JavaScript
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    browsers: ['last 2 versions', 'not dead', '> 0.2%']
                  },
                  modules: false,
                  useBuiltIns: 'usage',
                  corejs: 3
                }]
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-syntax-dynamic-import',
                isDevelopment && require.resolve('react-refresh/babel')
              ].filter(Boolean),
              cacheDirectory: true
            }
          }
        },
        
        // CSS
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: false
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    ['autoprefixer', {
                      grid: true
                    }],
                    isProduction && ['cssnano', {
                      preset: 'default'
                    }]
                  ].filter(Boolean)
                }
              }
            }
          ]
        },
        
        // Images
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024 // 8kb
            }
          },
          generator: {
            filename: 'images/[name].[hash][ext]'
          }
        },
        
        // Fonts
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash][ext]'
          }
        }
      ]
    },
    
    // Optimization
    optimization: {
      minimize: isProduction,
      minimizer: [
        // JavaScript minification
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: isProduction,
              drop_debugger: isProduction,
              pure_funcs: isProduction ? ['console.log', 'console.info'] : []
            },
            mangle: {
              safari10: true
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true
            }
          },
          parallel: true,
          extractComments: false
        }),
        
        // CSS minification
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true }
              }
            ]
          }
        })
      ],
      
      // Code splitting
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true
          },
          
          // Common modules
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            name: 'common'
          },
          
          // Statistics modules
          statistics: {
            test: /[\\/]modules[\\/]statistics[\\/]/,
            name: 'statistics',
            priority: 8,
            reuseExistingChunk: true
          },
          
          // UI modules
          ui: {
            test: /[\\/]modules[\\/]ui[\\/]/,
            name: 'ui',
            priority: 7,
            reuseExistingChunk: true
          },
          
          // Utils
          utils: {
            test: /[\\/]utils[\\/]/,
            name: 'utils',
            priority: 6,
            reuseExistingChunk: true
          },
          
          // CSS
          styles: {
            name: 'styles',
            test: /\.css$/,
            chunks: 'all',
            enforce: true
          }
        }
      },
      
      // Runtime chunk
      runtimeChunk: {
        name: 'runtime'
      },
      
      // Module IDs
      moduleIds: isProduction ? 'deterministic' : 'named',
      chunkIds: isProduction ? 'deterministic' : 'named'
    },
    
    // Plugins
    plugins: [
      // Clean output directory
      new CleanWebpackPlugin(),
      
      // Define environment variables
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(argv.mode),
        'process.env.API_URL': JSON.stringify(
          isProduction ? 'https://api.yourdomain.com' : 'http://localhost:3001'
        ),
        'process.env.VERSION': JSON.stringify(require('./package.json').version)
      }),
      
      // Extract CSS
      isProduction && new MiniCssExtractPlugin({
        filename: `css/${fileNamePattern}.css`,
        chunkFilename: `css/chunks/${fileNamePattern}.css`
      }),
      
      // HTML generation
      new HtmlWebpackPlugin({
        template: './public/team-stats.html',
        filename: '../team-stats.html', // Output to public directory
        chunks: ['runtime', 'vendors', 'common', 'team-stats'],
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          minifyJS: true,
          minifyCSS: true
        } : false,
        meta: {
          viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'
        }
      }),
      
      // Compression
      isProduction && new CompressionPlugin({
        filename: '[path][base].gz',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192,
        minRatio: 0.8
      }),
      
      // Brotli compression
      isProduction && new CompressionPlugin({
        filename: '[path][base].br',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg)$/,
        compressionOptions: {
          level: 11
        },
        threshold: 8192,
        minRatio: 0.8
      }),
      
      // Bundle analyzer (only with --analyze flag)
      process.env.ANALYZE && new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: '../bundle-report.html',
        openAnalyzer: true
      }),
      
      // Progress
      new webpack.ProgressPlugin({
        activeModules: false,
        entries: true,
        modules: true,
        modulesCount: 5000,
        profile: false,
        dependencies: true,
        dependenciesCount: 10000,
        percentBy: null
      }),
      
      // Hot module replacement
      isDevelopment && new webpack.HotModuleReplacementPlugin()
    ].filter(Boolean),
    
    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
      assetFilter: function(assetFilename) {
        return !/(\.map$)|(^(main\.|favicon\.))/.test(assetFilename);
      }
    },
    
    // Stats
    stats: {
      colors: true,
      hash: false,
      version: false,
      timings: true,
      assets: true,
      chunks: false,
      modules: false,
      reasons: false,
      children: false,
      source: false,
      errors: true,
      errorDetails: true,
      warnings: true,
      publicPath: false,
      builtAt: true
    },
    
    // Node configuration
    node: {
      global: true,
      __filename: true,
      __dirname: true
    },
    
    // Cache
    cache: {
      type: 'filesystem',
      allowCollectingMemory: true,
      buildDependencies: {
        config: [__filename]
      }
    }
  };
};