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
        // 1. إدخال الـ Cookie إن وجد
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
            console.log('[+] Applied Session Cookies.');
        }

        // 2. الذهاب لصفحة التطبيق مباشرة
        console.log('[+] Navigating to application page...');
        await page.goto('https://justrunmy.app/panel/application/63274/', { waitUntil: 'networkidle2', timeout: 60000 });

        // الانتظار لمدة 5 ثوانٍ لضمان تحميل واجهة React/Vue
        await new Promise(r => setTimeout(r, 5000));

        // 3. التقاط صورة للشاشة لمعاينتها لاحقاً في GitHub Actions
        await page.screenshot({ path: 'page_preview.png', fullPage: true });
        console.log('[+] Saved page screenshot.');

        // 4. البحث عن زر Reset timer بأي شكل من أشكاله
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
            console.log('[!] Reset timer button not found or already pressed.');
        }

        // انتظار ثانيتين بعد الضغط
        await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
        console.error('[X] Error during auto-reset:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
