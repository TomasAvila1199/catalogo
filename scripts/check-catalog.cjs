const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = (process.env.CATALOG_URL || 'http://localhost:8000').replace(/\/?$/, '/');
(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base, { waitUntil: 'networkidle' });
        const stock = await page.locator('.product-card').count();
        assert(stock > 0);
        assert.equal(await page.locator('.status-tab.active').getAttribute('aria-pressed'), 'true');
        await page.getByRole('button', { name: 'A pedido', exact: true }).click();
        assert(await page.locator('#order-panel').isVisible());
        await page.getByRole('button', { name: 'Todos', exact: true }).click();
        const total = await page.locator('.product-card').count();
        assert(total > stock);
        const links = await page.locator('.product-action').evaluateAll(nodes => nodes.map(a => ({ href: a.href, name: a.getAttribute('aria-label'), badge: a.closest('article').querySelector('.stock-badge').textContent })));
        for (const link of links) {
            const url = new URL(link.href);
            assert.equal(url.origin + url.pathname, 'https://wa.me/5493415763811');
            assert(url.searchParams.get('text').includes(link.badge === 'Disponible' ? 'quiero comprar' : 'a pedido'));
            assert(link.name.includes('por WhatsApp'));
        }
        await page.locator('#search').fill('AFNÁN');
        await page.waitForTimeout(180);
        assert(await page.locator('.product-card').count() > 0);
        assert((await page.locator('.product-meta').allTextContents()).every(text => text.includes('Afnan')));
        await page.locator('#search').fill('zzzz-no-existe');
        await page.waitForTimeout(180);
        assert(await page.locator('#empty-state').isVisible());
        await page.getByRole('button', { name: 'Limpiar filtros' }).click();
        assert.equal(await page.locator('.product-card').count(), total);
        await page.locator('#gender-filter').selectOption('femenino');
        assert((await page.locator('.product-meta').allTextContents()).every(text => text.includes('femenino')));
        await page.locator('#gender-filter').selectOption('todos');
        await context.route('https://wa.me/**', route => route.fulfill({ contentType: 'text/plain', body: 'WhatsApp destination verified' }));
        const expectedWhatsApp = await page.locator('.product-action').first().getAttribute('href');
        const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('.product-action').first().click()]);
        await popup.waitForLoadState();
        assert.equal(popup.url(), expectedWhatsApp);
        await popup.close();
        await Promise.all([page.waitForURL('**/producto.html?producto=*'), page.locator('.product-detail-hitarea').first().click()]);
        await page.waitForLoadState('networkidle');
        assert(await page.locator('#detail-content').isVisible());
        assert((await page.locator('#detail-buy').getAttribute('href')).startsWith('https://wa.me/5493415763811?text='));
        assert(await page.locator('.detail-visual-image').first().evaluate(image => image.complete && image.naturalWidth > 0));
        await page.goto(new URL('producto.html?producto=afnan-9-am-dive', base).href, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Imagen siguiente' }).click();
        assert.equal(await page.locator('.detail-visual-dot').nth(1).getAttribute('aria-pressed'), 'true');
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('.detail-visual-dot').nth(2).getAttribute('aria-pressed'), 'true');
        await page.goto(new URL('producto.html?producto=no-existe', base).href);
        assert(await page.locator('#detail-missing').isVisible());
        assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex');
        for (const width of [320, 360, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(base, { waitUntil: 'networkidle' });
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
        }
        await page.route('**/images/optimized/**', route => route.abort());
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.locator('.product-image').first().scrollIntoViewIfNeeded();
        await page.waitForFunction(() => { const image = document.querySelector('.product-image'); return image && image.complete && image.naturalWidth > 0 && !image.hasAttribute('srcset'); });
        await page.route('**/images/**', route => route.abort());
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.locator('.product-image-wrap').first().scrollIntoViewIfNeeded();
        await page.locator('.product-placeholder').first().waitFor();
        assert.deepEqual(errors, []);
        console.log(`Passed: ${total} product WhatsApp links; search, filters, detail, gallery, missing product, image fallbacks and 5 viewport widths.`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
