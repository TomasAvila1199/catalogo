// Generated variants are optional: original images remain a safe fallback.
window.setCatalogImage = function (image, source, sizes) {
    const variants = (window.CATALOG_IMAGE_SOURCES || {})[source.split('?')[0]];
    image.decoding = 'async';
    if (variants) {
        image.srcset = variants.map(item => `${item.src} ${item.width}w`).join(', ');
        image.sizes = sizes;
        image.src = variants[variants.length - 1].src;
        image.addEventListener('error', (event) => {
            event.stopImmediatePropagation();
            image.removeAttribute('srcset');
            image.src = source;
        }, { once: true });
    } else image.src = source;
};
