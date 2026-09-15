const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// استخدام وضع Stealth لتجاوز حماية Bot Detection
puppeteer.use(StealthPlugin());

(async () => {
    console.log('[+] Starting auto-reset process...');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--window-size=1280,800'
        ]
    });
    
    const page = await browser.newPage();
    
    // محاكاة متصفح حقيقي
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto('https://justrunmy.app', { waitUntil: 'domcontentloaded' });

        // 1. إضافة الـ Cookies
        const rawCookie = process.env.MY_COOKIE || '';
        if (rawCookie) {
            const cookiePairs = rawCookie.split(';');
            for (const pair of cookiePairs) {
                const [name, ...val] = pair.trim().split('=');
                if (name && val.length > 0) {
                    await page.setCookie({
                        name: name.trim(),
                        value: val.join('=').trim(),
                        domain: 'justrunmy.app',
                        path: '/'
                    });
                }
            }
            console.log('[+] Session Cookies applied.');
        }

        // 2. التوجه لصفحة التطبيق
        console.log('[+] Navigating to application page...');
        await page.goto('https://justrunmy.app/panel/application/63274/', { waitUntil: 'networkidle2', timeout: 60000 });

        await new Promise(r => setTimeout(r, 4000));

        // 3. التقاط صورة للشاشة للتأكد
        await page.screenshot({ path: 'page_preview.png', fullPage: true });

        // 4. الضغط على زر Reset Timer
        const buttons = await page.$$('button, a, div[role="button"]');
        let clicked = false;
        
        for (const button of buttons) {
            const text = await page.evaluate(el => el.innerText || el.textContent, button);
            if (text && text.toLowerCase().includes('reset timer')) {
                await button.click();
                clicked = true;
                console.log('[✔] Reset timer clicked successfully!');
                break;
            }
        }

        if (!clicked) {
            console.log('[!] Reset timer button not found. (Check page_preview.png)');
        }

        await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
        console.error('[X] Error during auto-reset:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
