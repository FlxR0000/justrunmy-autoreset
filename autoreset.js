const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    console.log('[+] Starting auto-reset script...');
    
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

        // 1. الضغط على زر Reset timer الرئيسي
        console.log('[+] Searching for main "Reset timer" button...');
        const mainButtons = await page.$$('button, a, div[role="button"], span');
        for (const el of mainButtons) {
            const text = await page.evaluate(elem => (elem.innerText || elem.textContent || '').trim().toLowerCase(), el);
            if (text.includes('reset timer')) {
                await el.click();
                console.log('[✔] Main "Reset timer" button clicked!');
                await new Promise(r => setTimeout(r, 3000));
                break;
            }
        }

        // 2. الضغط المباشر على مربع Cloudflare Turnstile داخل النافذة المنبثقة
        console.log('[+] Looking for Cloudflare Turnstile checkbox...');
        let turnstileClicked = false;
        
        try {
            const frames = page.frames();
            for (const frame of frames) {
                if (frame.url().includes('cloudflare') || frame.url().includes('turnstile')) {
                    console.log('[+] Cloudflare Turnstile iframe found!');
                    const checkbox = await frame.waitForSelector('input[type="checkbox"], #challenge-stage, .ctp-checksum, label.cb-lb', { timeout: 5000 }).catch(() => null);
                    if (checkbox) {
                        await checkbox.click();
                        turnstileClicked = true;
                        console.log('[✔] Successfully clicked Cloudflare Turnstile checkbox!');
                        await new Promise(r => setTimeout(r, 3000));
                        break;
                    }
                }
            }
        } catch (cfError) {
            console.log('[!] Error while searching Cloudflare iframe:', cfError.message);
        }

        // خيار احتياطي: النقر على الإحداثيات داخل مربع Cloudflare في حال عدم الوصول لـ iframe
        if (!turnstileClicked) {
            console.log('[+] Trying coordinate click on Turnstile widget area...');
            const turnstileElement = await page.$('iframe[src*="cloudflare"], iframe[src*="turnstile"]');
            if (turnstileElement) {
                const box = await turnstileElement.boundingBox();
                if (box) {
                    await page.mouse.click(box.x + 30, box.y + box.height / 2);
                    console.log('[✔] Clicked inside Cloudflare widget box coordinates!');
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
        }

        // 3. الضغط على زر "Just Reset"
        console.log('[+] Searching for "Just Reset" button...');
        const modalBtns = await page.$$('button, div[role="button"]');
        for (const btn of modalBtns) {
            const text = await page.evaluate(elem => (elem.innerText || elem.textContent || '').trim().toLowerCase(), btn);
            if (text.includes('just reset')) {
                await btn.click();
                console.log('[✔] Clicked "Just Reset" button!');
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
