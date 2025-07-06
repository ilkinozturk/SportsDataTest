# Production Deployment Guide

This guide covers building and deploying the Team Statistics application for production.

## Prerequisites

- Node.js 16+ installed
- NPM or Yarn package manager
- Access to production server
- SSL certificate for HTTPS

## Build Process

### 1. Install Dependencies

```bash
# Install all dependencies
npm install

# Or with yarn
yarn install
```

### 2. Environment Configuration

Update the environment configuration in `public/js/config/env.js`:

```javascript
production: {
  API_URL: 'https://api.yourdomain.com',
  // ... other production settings
}
```

### 3. Build for Production

```bash
# Build optimized production bundle
npm run build

# Build with bundle analysis
npm run build:analyze

# Generate build statistics
npm run build:stats
```

### 4. Build Output

The build process creates the following structure:

```
public/
├── dist/
│   ├── js/
│   │   ├── team-stats.[hash].js
│   │   ├── vendors.[hash].js
│   │   ├── runtime.[hash].js
│   │   └── chunks/
│   ├── css/
│   │   └── team-stats.[hash].css
│   └── stats.json
└── team-stats.html (updated with injected assets)
```

## Optimization Features

### Code Splitting

The webpack configuration automatically splits code into:
- **Vendor bundle**: Third-party libraries
- **Common bundle**: Shared code between modules
- **Statistics bundle**: Statistics modules
- **UI bundle**: UI components
- **Utils bundle**: Utility functions

### Compression

- Gzip compression for all text assets
- Brotli compression for modern browsers
- Automatic minification of JS and CSS

### Caching

- Content-hash based filenames for long-term caching
- Separate runtime chunk for better caching
- Cache-Control headers configuration

## Deployment Steps

### 1. Server Configuration

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/sportsdata/public;
    index team-stats.html;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # Brotli compression
    brotli on;
    brotli_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /team-stats.html;
    }
}
```

#### Apache Configuration

```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /var/www/sportsdata/public

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json
    </IfModule>

    # Cache static assets
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "max-age=31536000, public, immutable"
    </FilesMatch>

    # API proxy
    ProxyPass /api http://localhost:3001
    ProxyPassReverse /api http://localhost:3001

    # SPA rewrite
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ /team-stats.html [L]
</VirtualHost>
```

### 2. Deployment Process

```bash
# 1. Build locally
npm run build

# 2. Copy files to server
rsync -avz --delete public/ user@server:/var/www/sportsdata/public/

# 3. Or use deployment script
./deploy.sh production
```

### 3. Post-Deployment Checks

1. **Verify Build Integrity**
   ```bash
   # Check file sizes
   ls -la public/dist/js/
   
   # Verify compression
   curl -H "Accept-Encoding: gzip" -I https://yourdomain.com/dist/js/team-stats.[hash].js
   ```

2. **Test Critical Paths**
   - Load main page
   - Switch between tabs
   - Test filter functionality
   - Verify API connections

3. **Monitor Performance**
   - Check browser console for errors
   - Monitor network tab for failed requests
   - Verify lazy loading is working

## Environment Variables

Set these on your production server:

```bash
export NODE_ENV=production
export API_URL=https://api.yourdomain.com
export ENABLE_ANALYTICS=true
export ENABLE_ERROR_REPORTING=true
```

## Security Considerations

1. **Content Security Policy**
   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.yourdomain.com";
   ```

2. **Security Headers**
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-Content-Type-Options "nosniff";
   add_header X-XSS-Protection "1; mode=block";
   add_header Referrer-Policy "strict-origin-when-cross-origin";
   ```

3. **API Security**
   - Use HTTPS for all API calls
   - Implement rate limiting
   - Add CORS configuration

## Monitoring

### 1. Application Monitoring

```javascript
// Add to your production config
if (ENV.isProduction()) {
  // Send errors to monitoring service
  window.addEventListener('error', (event) => {
    // Send to Sentry, LogRocket, etc.
  });
}
```

### 2. Performance Monitoring

- Use Google Analytics or similar
- Monitor Core Web Vitals
- Set up alerts for performance degradation

### 3. Error Tracking

Configure error reporting in `env.js`:

```javascript
ERROR_ENDPOINT: 'https://api.yourdomain.com/errors'
```

## Rollback Procedure

1. Keep previous build artifacts
2. Use versioned deployments
3. Quick rollback script:

```bash
#!/bin/bash
# rollback.sh
PREVIOUS_VERSION=$1
rsync -avz --delete /backups/sportsdata-$PREVIOUS_VERSION/ /var/www/sportsdata/public/
```

## Performance Checklist

- [ ] All assets are minified
- [ ] Gzip/Brotli compression enabled
- [ ] Cache headers configured
- [ ] CDN configured (optional)
- [ ] Images optimized
- [ ] Lazy loading working
- [ ] No console errors
- [ ] API endpoints accessible
- [ ] SSL certificate valid

## Troubleshooting

### Common Issues

1. **404 on refresh**
   - Check SPA rewrite rules
   - Verify .htaccess or nginx config

2. **API connection failed**
   - Check CORS configuration
   - Verify API URL in env.js
   - Check proxy configuration

3. **Slow initial load**
   - Verify compression is working
   - Check bundle sizes
   - Enable CDN if needed

### Debug Mode

Enable debug mode in production temporarily:

```javascript
// In browser console
localStorage.setItem('DEBUG_MODE', 'true');
location.reload();
```

## Maintenance Mode

Create a maintenance page:

```html
<!-- maintenance.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Maintenance</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
        }
    </style>
</head>
<body>
    <h1>Under Maintenance</h1>
    <p>We'll be back shortly!</p>
</body>
</html>
```

Enable maintenance mode:

```nginx
location / {
    return 503;
}
error_page 503 @maintenance;
location @maintenance {
    rewrite ^(.*)$ /maintenance.html break;
}
```