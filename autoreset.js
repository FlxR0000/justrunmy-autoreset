const puppeteer = require('puppeteer');

(async () => {
    console.log('[+] Starting auto-reset process...');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    // ضبط حجم الشاشة لضمان ظهور كل العناصر
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log('[+] Navigating to login page...');
        await page.goto('https://justrunmy.app/login', { waitUntil: 'networkidle2', timeout: 60000 });

        // الانتظار حتى تظهر خانة الإيميل بوضوح
        console.log('[+] Waiting for email input...');
        await page.waitForSelector('input[name="email"], input[type="email"]', { visible: true, timeout: 30000 });

        const emailInput = await page.$('input[name="email"], input[type="email"]');
        const passwordInput = await page.$('input[name="password"], input[type="password"]');

        await emailInput.type(process.env.MY_EMAIL);
        await passwordInput.type(process.env.MY_PASSWORD);
        
        console.log('[+] Submitting login form...');
        const submitButton = await page.$('button[type="submit"]');
        
        await Promise.all([
            submitButton.click(),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
        ]);

        console.log('[+] Navigating to application panel...');
        await page.goto('https://justrunmy.app/panel/application/63274/', { waitUntil: 'networkidle2', timeout: 60000 });

        // الانتظار حتى تحميل أزرار الصفحة
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
