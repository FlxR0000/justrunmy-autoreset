const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    console.log('[+] Starting auto-reset process...');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,800'
        ]
    });
    
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto('https://justrunmy.app', { waitUntil: 'domcontentloaded' });

        const rawCookie = process.env.MY_COOKIE || '';
        if (rawCookie) {
            const cookiePairs = rawCookie.split(';');
            for (const pair of cookiePairs) {
                const parts = pair.trim().split('=');
                const name = parts[0];
                const value = parts.slice(1).join('=');
                
                if (name && value) {
                    await page.setCookie({
                        name: name.trim(),
                        value: value.trim(),
                        domain: '.justrunmy.app',
                        path: '/',
                        httpOnly: true,
                        secure: true
                    });
                }
            }
            console.log('[+] Authenticated Session Cookies applied successfully.');
        }

        console.log('[+] Navigating to application control panel...');
        await page.goto('https://justrunmy.app/panel/application/63274/', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));

        // 1. إغلاق أي نافذة منبثقة سابقة
        try {
            const modalButtons = await page.$$('button');
            for (const btn of modalButtons) {
                const txt = await page.evaluate(el => el.innerText || el.textContent, btn);
                if (txt && (txt.trim().toLowerCase() === 'confirm' || txt.trim().toLowerCase() === 'close')) {
                    await btn.click();
                    console.log(`[+] Closed popup modal by clicking "${txt.trim()}"`);
                    await new Promise(r => setTimeout(r, 2000));
                    break;
                }
            }
        } catch (e) {
            console.log('[!] No initial modal encountered.');
        }

        // 2. الضغط على زر Reset timer
        const buttons = await page.$$('button, a, div[role="button"]');
        let clicked = false;
        
        for (const button of buttons) {
            const text = await page.evaluate(el => el.innerText || el.textContent, button);
            if (text && text.toLowerCase().includes('reset timer')) {
                await button.click();
                clicked = true;
                console.log('[✔] Reset timer button clicked!');
                await new Promise(r => setTimeout(r, 3000)); // انتظار لتنفيذ الطلب
                break;
            }
        }

        if (!clicked) {
            console.log('[!] Reset timer button not found.');
        }

        // 3. التقاط الصورة بعد إعادة الضغط والتأكد
        await page.screenshot({ path: 'page_preview.png', fullPage: true });
        console.log('[+] Final page screenshot saved.');

    } catch (error) {
        console.error('[X] Error during execution:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
