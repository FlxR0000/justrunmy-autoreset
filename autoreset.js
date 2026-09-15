const puppeteer = require('puppeteer');

(async () => {
    console.log('[+] Starting auto-reset process...');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();

    try {
        await page.goto('https://justrunmy.app/login', { waitUntil: 'networkidle2' });

        await page.type('input[type="email"]', process.env.MY_EMAIL);
        await page.type('input[type="password"]', process.env.MY_PASSWORD);
        
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        await page.goto('https://justrunmy.app/panel/application/63274/', { waitUntil: 'networkidle2' });

        const buttons = await page.$$('button');
        let clicked = false;
        
        for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent, button);
            if (text && text.includes('Reset timer')) {
                await button.click();
                clicked = true;
                console.log('[✔] Reset timer clicked successfully!');
                break;
            }
        }

        if (!clicked) {
            console.log('[!] Button not found or already reset.');
        }

    } catch (error) {
        console.error('[X] Error during auto-reset:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
