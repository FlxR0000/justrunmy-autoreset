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
    
    // ضبط الهوية كمتصفح طبيعي
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    try {
        // 1. الانتقال للموقع الأساسي
        await page.goto('https://justrunmy.app', { waitUntil: 'domcontentloaded' });

        // 2. تطبيق الـ Cookies
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

        // 3. التوجه المباشر لصفحة التطبيق
        console.log('[+] Navigating to application control panel...');
        await page.goto('https://justrunmy.app/panel/application/63274/', { waitUntil: 'networkidle2', timeout: 60000 });

        // انتظار تحمّل العناصر
        await new Promise(r => setTimeout(r, 4000));

        // 4. التعامل مع أي نافذة منبثقة (Modal/Popup) وإغلاقها
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
            console.log('[!] No modal encountered or failed to close modal.');
        }

        // 5. التقاط صورة للشاشة للتأكد والمعاينة
        await page.screenshot({ path: 'page_preview.png', fullPage: true });
        console.log('[+] Page screenshot saved.');

        // 6. البحث عن زر Reset timer والضغط عليه
        const buttons = await page.$$('button, a, div[role="button"]');
        let clicked = false;
        
        for (const button of buttons) {
            const text = await page.evaluate(el => el.innerText || el.textContent, button);
            if (text && text.toLowerCase().includes('reset timer')) {
                await button.click();
                clicked = true;
                console.log('[✔] Reset timer button clicked successfully!');
                break;
            }
        }

        if (!clicked) {
            console.log('[!] Reset timer button not found. Check page_preview.png artifact.');
        }

        await new Promise(r => setTimeout(r, 3000));

    } catch (error) {
        console.error('[X] Error during execution:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
