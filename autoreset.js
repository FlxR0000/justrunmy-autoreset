const puppeteer = require('puppeteer');

(async () => {
    console.log('[+] Starting auto-reset process...');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto('https://justrunmy.app', { waitUntil: 'domcontentloaded' });

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
        }

        console.log('[+] Navigating to application page...');
        await page.goto('https://justrunmy.app/panel/application/63274/', { waitUntil: 'networkidle2', timeout: 60000 });

        // التوقف لمدة 3 ثوانٍ لضمان التحميل الكامل
        await new Promise(r => setTimeout(r, 3000));

        // حفظ صورة للشاشة لمعاينة ما يراه السكريبت
        await page.screenshot({ path: 'page_preview.png', fullPage: true });

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
