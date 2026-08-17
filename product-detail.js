const DETAIL_WHATSAPP_NUMBER = '5493415763811';
const detailProducts = Array.isArray(window.CATALOG_PRODUCTS) ? window.CATALOG_PRODUCTS : [];
const productDetails = window.CATALOG_DETAILS || {};

function detailNormalize(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function detailSlugify(value) {
    return detailNormalize(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function detailWhatsappUrl(message) {
    return `https://wa.me/${DETAIL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function fallbackDescription(product) {
    const genderText = product.gender === 'femenino'
        ? 'femenina'
        : product.gender === 'masculino'
            ? 'masculina'
            : 'unisex';

    return `${product.name} de ${product.brand} es una fragancia ${genderText} de ${product.volume}. Una propuesta original para descubrir el estilo de la marca y sumar una nueva opción a tu colección.`;
}

const requestedSlug = new URLSearchParams(window.location.search).get('producto');
const product = detailProducts.find((item) => detailSlugify(`${item.brand}-${item.name}`) === requestedSlug);

const content = document.querySelector('#detail-content');
const missing = document.querySelector('#detail-missing');
const gallerySection = document.querySelector('#detail-gallery-section');
const contact = document.querySelector('#detail-contact');

function setLink(link, href) {
    if (!link) return;
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
}

function renderGallery(product, detail) {
    const gallery = Array.isArray(detail.gallery) && detail.gallery.length
        ? detail.gallery
        : [{ src: product.image, label: 'Producto' }];
    const image = document.querySelector('#gallery-image');
    const caption = document.querySelector('#gallery-caption');
    const thumbnails = document.querySelector('#gallery-thumbnails');
    const previous = document.querySelector('#gallery-previous');
    const next = document.querySelector('#gallery-next');
    let activeIndex = 0;

    function showSlide(index) {
        activeIndex = (index + gallery.length) % gallery.length;
        const slide = gallery[activeIndex];
        image.src = slide.src;
        image.alt = `${slide.label} de ${product.brand} ${product.name}`;
        caption.textContent = slide.label;
        [...thumbnails.children].forEach((button, buttonIndex) => {
            const isActive = buttonIndex === activeIndex;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });
    }

    thumbnails.replaceChildren(...gallery.map((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'detail-thumbnail';
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-label', `Ver ${slide.label}`);
        button.innerHTML = `<img src="${slide.src}" alt=""><span>${slide.label}</span>`;
        button.addEventListener('click', () => showSlide(index));
        return button;
    }));

    previous.addEventListener('click', () => showSlide(activeIndex - 1));
    next.addEventListener('click', () => showSlide(activeIndex + 1));

    let touchStartX = 0;
    image.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    image.addEventListener('touchend', (event) => {
        const distance = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(distance) < 45) return;
        showSlide(activeIndex + (distance < 0 ? 1 : -1));
    }, { passive: true });

    const hasMultipleSlides = gallery.length > 1;
    previous.hidden = !hasMultipleSlides;
    next.hidden = !hasMultipleSlides;
    showSlide(0);
    gallerySection.hidden = false;
}

if (!product) {
    missing.hidden = false;
    document.title = 'Fragancia no encontrada | Scenth Store';
} else {
    const slug = detailSlugify(`${product.brand}-${product.name}`);
    const detail = productDetails[slug] || {};
    const isAvailable = product.status === 'disponible';
    const productLabel = `${product.brand} ${product.name}`;
    const purchaseMessage = isAvailable
        ? `Hola Scenth Store, quiero comprar ${productLabel}. ¿Sigue disponible?`
        : `Hola Scenth Store, quería consultar por ${productLabel} a pedido.`;
    const consultationMessage = `Hola Scenth Store, quería asesoramiento sobre ${productLabel}.`;

    document.title = `${productLabel} | Scenth Store`;
    document.querySelector('meta[name="description"]').content = detail.description || fallbackDescription(product);

    const heroImage = document.querySelector('#detail-image');
    heroImage.src = product.image;
    heroImage.alt = `${productLabel} ${product.volume}`;
    document.querySelector('#detail-brand').textContent = product.brand;
    document.querySelector('#detail-name').textContent = product.name;
    document.querySelector('#detail-description').textContent = detail.description || fallbackDescription(product);

    const stock = document.querySelector('#detail-stock');
    stock.textContent = isAvailable ? 'Disponible' : 'A pedido';
    stock.classList.toggle('available', isAvailable);

    const facts = [product.volume, product.gender].filter(Boolean);
    document.querySelector('#detail-facts').replaceChildren(...facts.map((fact) => {
        const span = document.createElement('span');
        span.textContent = fact;
        return span;
    }));

    const highlights = Array.isArray(detail.highlights) ? detail.highlights : [];
    const highlightsContainer = document.querySelector('#detail-highlights');
    highlightsContainer.replaceChildren(...highlights.map((highlight) => {
        const span = document.createElement('span');
        span.textContent = highlight;
        return span;
    }));
    highlightsContainer.hidden = highlights.length === 0;

    const price = document.querySelector('#detail-price');
    price.textContent = isAvailable ? product.price : 'Consultar precio';
    price.classList.toggle('order', !isAvailable);

    const buy = document.querySelector('#detail-buy');
    buy.textContent = isAvailable ? 'Comprar por WhatsApp' : 'Cotizar por WhatsApp';
    setLink(buy, detailWhatsappUrl(purchaseMessage));
    setLink(document.querySelector('#header-whatsapp'), detailWhatsappUrl(consultationMessage));
    setLink(document.querySelector('#detail-contact-whatsapp'), detailWhatsappUrl(consultationMessage));
    setLink(document.querySelector('#footer-whatsapp'), detailWhatsappUrl(consultationMessage));

    content.hidden = false;
    contact.hidden = false;
    renderGallery(product, detail);
}
