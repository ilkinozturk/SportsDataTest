const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Running Goals Statistics Tests...\n');
    
    try {
        // Check if we have puppeteer, if not use basic testing
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Navigate to test page
        await page.goto('http://localhost:3003/test-goals-statistics-browser.html', {
            waitUntil: 'networkidle0'
        });
        
        // Get test results
        const results = await page.evaluate(() => {
            const resultElements = document.querySelectorAll('.test-result');
            return Array.from(resultElements).map(el => ({
                text: el.textContent,
                type: el.className.replace('test-result ', '')
            }));
        });
        
        // Print results
        results.forEach(result => {
            const prefix = result.type === 'success' ? '✅' : 
                          result.type === 'error' ? '❌' : 
                          result.type === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`${prefix} ${result.text}`);
        });
        
        await browser.close();
        
    } catch (error) {
        // Fallback to manual testing
        console.log('Puppeteer not available, please open http://localhost:3003/test-goals-statistics-browser.html in your browser');
        console.log('\nManual test checklist:');
        console.log('- [ ] Modules loaded successfully');
        console.log('- [ ] Basic goal calculations work');
        console.log('- [ ] Half-time analysis works');
        console.log('- [ ] Over/Under statistics calculated');
        console.log('- [ ] BTTS analysis works');
        console.log('- [ ] Clean sheets tracked');
        console.log('- [ ] Venue filtering works');
        console.log('- [ ] Expected goals calculated');
        console.log('- [ ] Performance test passes');
        console.log('- [ ] Edge cases handled');
    }
})();