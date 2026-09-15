const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    console.log('[+] Starting robust auto-reset process with full self-healing...');
    
    // استخدام متصفح Chrome المثبت مسبقاً على سيرفر GitHub لتسريع التشغيل
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
    
    // Set natural browser signatures
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // Helper function to handle popups, notifications & modal overlays
    const handlePopups = async () => {
        try {
            const modalButtons = await page.$$('button, div[role="button"], a');
            for (const btn of modalButtons) {
                const txt = await page.evaluate(el => (el.innerText || el.textContent || '').trim().toLowerCase(), btn);
                if (['confirm', 'close', 'ok', 'dismiss', 'got it', 'understand', 'إغلاق', 'تأكيد'].includes(txt)) {
                    if (await btn.isIntersectingViewport().catch(() => false)) {
                        await btn.click().catch(() => {});
                        console.log(`[+] Self-Healing: Closed popup/modal matching "${txt}"`);
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }
        } catch (e) {
            // Ignore modal inspection errors
        }
    };

    try {
        // Step 1: Initialize base site domain to set cookies properly
        console.log('[+] Navigating to root domain...');
        await page.goto('https://justrunmy.app', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Step 2: Inject and sanitize session cookies
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
        } else {
            console.warn('[!] MY_COOKIE environment variable is missing or empty.');
        }

        // Step 3: Navigate directly to application management panel
        const appUrl = 'https://justrunmy.app/panel/application/63274/';
        console.log(`[+] Navigating to app control panel (${appUrl})...`);
        await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));

        // Step 4: Handle initial popups (e.g., app removed / inactivity notifications)
        await handlePopups();

        // Step 5: Check if the application is stopped and attempt self-restart if needed
        try {
            const startRestartBtns = await page.$$('button, a');
            for (const btn of startRestartBtns) {
                const text = await page.evaluate(el => (el.innerText || el.textContent || '').trim().toLowerCase(), btn);
                if (text.includes('start') || text === 'restart') {
                    const isStopped = await page.evaluate(() => document.body.innerText.toLowerCase().includes('application is stopped'));
                    if (isStopped && text.includes('start')) {
                        console.log('[+] Self-Healing: Application detected as stopped. Clicking Start...');
                        await btn.click();
                        await new Promise(r => setTimeout(r, 5000));
                        await handlePopups();
                        break;
                    }
                }
            }
        } catch (e) {
            console.log('[!] Self-Healing check for container status completed.');
        }

        // Step 6: Find and trigger "Reset timer" button
        console.log('[+] Searching for "Reset timer" action button...');
        let clicked = false;
        
        // Strategy A: Find by explicit text content
        const elements = await page.$$('button, a, div[role="button"], span');
        for (const el of elements) {
            const text = await page.evaluate(elem => (elem.innerText || elem.textContent || '').trim().toLowerCase(), el);
            if (text.includes('reset timer')) {
                await page.evaluate(elem => elem.scrollIntoView({ block: 'center', inline: 'center' }), el);
                await new Promise(r => setTimeout(r, 500));
                await el.click();
                clicked = true;
                console.log('[✔] Reset timer button clicked successfully via Text Matching!');
                await new Promise(r => setTimeout(r, 3000));
                break;
            }
        }

        // Strategy B: Fallback Selector / XPath if text matching failed
        if (!clicked) {
            console.log('[!] Strategy A missed. Trying Selector Fallbacks...');
            const fallbackSelectors = [
                'button.btn-warning',
                'button:has-text("Reset")',
                'button:has-text("timer")',
                '[data-action="reset-timer"]'
            ];
            for (const selector of fallbackSelectors) {
                try {
                    const btn = await page.$(selector);
                    if (btn) {
                        await btn.click();
                        clicked = true;
                        console.log(`[✔] Reset timer button clicked via fallback selector: ${selector}`);
                        await new Promise(r => setTimeout(r, 3000));
                        break;
                    }
                } catch (err) {}
            }
        }

        // Step 7: Handle any post-click confirmation modals
        await handlePopups();

        // Step 8: Save final screenshot for debugging and verification
        await page.screenshot({ path: 'page_preview.png', fullPage: true });
        console.log('[+] Final page status screenshot saved as page_preview.png.');

        if (!clicked) {
            console.error('[X] Could not locate or click the Reset timer button. Check page_preview.png artifact.');
            process.exit(1);
        }

    } catch (error) {
        console.error('[X] Execution failed:', error.message);
        try {
            await page.screenshot({ path: 'page_preview.png', fullPage: true });
        } catch (e) {}
        process.exit(1);
    } finally {
        await browser.close();
        console.log('[+] Browser session closed.');
    }
})();
