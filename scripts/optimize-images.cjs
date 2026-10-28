// Requires sharp. Generates responsive assets from the original catalog images.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
for (const file of ['products.js', 'product-details.js']) vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const sources = new Set(context.window.CATALOG_PRODUCTS.map(p => p.image).filter(Boolean));
for (const detail of Object.values(context.window.CATALOG_DETAILS)) for (const slide of detail.gallery || []) if (slide.src) sources.add(slide.src);
(async () => {
    const manifest = {};
    fs.mkdirSync(path.join(root, 'images/optimized'), { recursive: true });
    for (const source of [...sources].sort()) {
        const cleanSource = source.split('?')[0];
        const data = fs.readFileSync(path.join(root, cleanSource));
        const metadata = await sharp(data).metadata();
        const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 10);
        const name = path.basename(cleanSource, path.extname(cleanSource));
        const widths = [...new Set([360, 720, 1200].map(width => Math.min(width, metadata.width)))];
        manifest[cleanSource] = [];
        for (const width of widths) {
            const src = `images/optimized/${name}-${hash}-${width}.webp`;
            const info = await sharp(data).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(path.join(root, src));
            manifest[cleanSource].push({ src, width: info.width });
        }
    }
    await sharp(path.join(root, 'images/scenth-store-logo.png')).resize({ width: 160, withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(root, 'images/scenth-store-logo.webp'));
    fs.writeFileSync(path.join(root, 'image-sources.js'), 'window.CATALOG_IMAGE_SOURCES = ' + JSON.stringify(manifest) + ';\n');
    console.log(`${sources.size} source images optimized. Original files retained.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
