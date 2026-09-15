const puppeteer = require('puppeteer');

(async () => {
    console.log('[+] Starting auto-reset process using Session Cookie...');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        // 1. الانتقال إلى الدومين أولاً لضبط الـ Cookie
        await page.goto('https://justrunmy.app', { waitUntil: 'domcontentloaded' });

        // 2. تفكيك وإضافة الـ Cookie
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
            console.log('[+] Session cookies applied successfully.');
        }

        // 3. الدخول مباشرة لصفحة تطبيقك (تجاوز صفحة الدخول)
        console.log('[+] Navigating directly to application page...');
        await page.goto('https://justrunmy.app/panel/application/63274/', { waitUntil: 'networkidle2', timeout: 60000 });

        // 4. الانتظار حتى ظهور زر Reset timer
        console.log('[+] Waiting for page buttons to load...');
        await page.waitForSelector('button', { timeout: 30000 });

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
            console.log('[!] Reset timer button not found or already pressed.');
        }

    } catch (error) {
        console.error('[X] Error during auto-reset:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
