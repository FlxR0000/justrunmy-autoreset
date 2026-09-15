const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    console.log('[+] Starting robust auto-reset process with Cloudflare handling...');
    
    const chromePath = process.env.PUPPETEER_EXEC_PATH || '/usr/bin/google-chrome';
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        executablePath: chromePath,
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

    const handlePopups = async () => {
        try {
            const modalButtons = await page.$$('button, div[role="button"], a');
            for (const btn of modalButtons) {
                const txt = await page.evaluate(el => (el.innerText || el.textContent || '').trim().toLowerCase(), btn);
                if (['confirm', 'close', 'ok', 'dismiss', 'got it', 'understand', 'إغلاق', 'تأكيد', 'just reset'].includes(txt)) {
                    if (await btn.isIntersectingViewport().catch(() => false)) {
                        await btn.click().catch(() => {});
                        console.log(`[+] Self-Healing: Clicked modal button matching "${txt}"`);
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            }
        } catch (e) {}
    };

    try {
        console.log('[+] Navigating to root domain...');
        await page.goto('https://justrunmy.app', { waitUntil: 'domcontentloaded', timeout: 30000 });

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
            console.log('[+] Session Cookies injected.');
        }

        const appUrl = 'https://justrunmy.app/panel/application/63274/';
        console.log(`[+] Navigating to app control panel...`);
        await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));

        await handlePopups();

        // 1. الضغط على زر Reset timer الرئيسي
        console.log('[+] Searching for top "Reset timer" button...');
        const elements = await page.$$('button, a, div[role="button"], span');
        for (const el of elements) {
            const text = await page.evaluate(elem => (elem.innerText || elem.textContent || '').trim().toLowerCase(), el);
            if (text.includes('reset timer')) {
                await el.click();
                console.log('[✔] Top Reset timer button clicked!');
                await new Promise(r => setTimeout(r, 3000));
                break;
            }
        }

        // 2. التعامل مع النافذة المنبثقة والضغط على Just Reset
        console.log('[+] Checking for modal popup / Just Reset button...');
        await handlePopups();

        const modalBtns = await page.$$('button, div[role="button"]');
        for (const btn of modalBtns) {
            const text = await page.evaluate(elem => (elem.innerText || elem.textContent || '').trim().toLowerCase(), btn);
            if (text.includes('just reset')) {
                // محاولة النقر على مربع Cloudflare Turnstile إذا كان موجوداً
                try {
                    const iframe = await page.$('iframe[src*="cloudflare"]');
                    if (iframe) {
                        const frame = await iframe.contentFrame();
                        const checkbox = await frame.$('input[type="checkbox"], .mark');
                        if (checkbox) {
                            await checkbox.click();
                            console.log('[+] Clicked Cloudflare Turnstile checkbox');
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                } catch (cfErr) {}

                await btn.click();
                console.log('[✔] Clicked "Just Reset" inside modal successfully!');
                await new Promise(r => setTimeout(r, 4000));
                break;
            }
        }

        await page.screenshot({ path: 'page_preview.png', fullPage: true });
        console.log('[+] Screenshot saved.');

    } catch (error) {
        console.error('[X] Execution failed:', error.message);
        try { await page.screenshot({ path: 'page_preview.png', fullPage: true }); } catch (e) {}
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
