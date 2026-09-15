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
const contact = document.querySelector('#detail-contact');

function setLink(link, href) {
    if (!link) return;
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
}

function renderGallery(product, detail) {
    const suppliedGallery = Array.isArray(detail.gallery) ? detail.gallery : [];
    const gallery = [{ src: product.image, label: 'Producto' }, ...suppliedGallery]
        .filter((slide, index, slides) => slide && slide.src && slides.findIndex((candidate) => (
            candidate && candidate.src && candidate.src.split('?')[0] === slide.src.split('?')[0]
        )) === index);
    const carousel = document.querySelector('#detail-carousel');
    const track = document.querySelector('#detail-visual-track');
    const caption = document.querySelector('#detail-visual-caption');
    const dots = document.querySelector('#detail-visual-dots');
    const previous = document.querySelector('#detail-visual-previous');
    const next = document.querySelector('#detail-visual-next');
    let activeIndex = 0;
    let pointerStartX = 0;
    let pointerId = null;
    let autoAdvanceTimer = null;
    let isPaused = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const slides = gallery.map((slide, index) => {
        const figure = document.createElement('figure');
        figure.className = 'detail-visual-slide';
        figure.setAttribute('aria-hidden', String(index !== 0));

        const backdrop = document.createElement('img');
        backdrop.className = 'detail-visual-backdrop';
        backdrop.src = slide.src;
        backdrop.alt = '';
        backdrop.setAttribute('aria-hidden', 'true');
        backdrop.draggable = false;
        backdrop.decoding = 'async';
        backdrop.loading = 'lazy';

        const image = document.createElement('img');
        image.className = 'detail-visual-image';
        image.src = slide.src;
        image.alt = `${slide.label} de ${product.brand} ${product.name}`;
        image.draggable = false;
        image.decoding = 'async';
        image.loading = index === 0 ? 'eager' : 'lazy';

        figure.append(backdrop, image);
        return figure;
    });

    const dotButtons = gallery.map((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'detail-visual-dot';
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-label', `Ver ${slide.label}`);
        button.addEventListener('click', () => showSlide(index));
        return button;
    });

    track.replaceChildren(...slides);
    dots.replaceChildren(...dotButtons);

    function scheduleAutoAdvance() {
        window.clearTimeout(autoAdvanceTimer);
        if (gallery.length < 2 || reduceMotion || isPaused || document.hidden) return;
        autoAdvanceTimer = window.setTimeout(() => showSlide(activeIndex + 1), 5500);
    }

    function showSlide(index) {
        activeIndex = (index + gallery.length) % gallery.length;
        const slide = gallery[activeIndex];
        track.style.transform = `translateX(-${activeIndex * 100}%)`;
        caption.textContent = slide.label;
        slides.forEach((figure, slideIndex) => {
            figure.setAttribute('aria-hidden', String(slideIndex !== activeIndex));
        });
        dotButtons.forEach((button, buttonIndex) => {
            const isActive = buttonIndex === activeIndex;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });
        scheduleAutoAdvance();
    }

    previous.addEventListener('click', () => showSlide(activeIndex - 1));
    next.addEventListener('click', () => showSlide(activeIndex + 1));

    carousel.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        showSlide(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });

    carousel.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return;
        pointerId = event.pointerId;
        pointerStartX = event.clientX;
        carousel.classList.add('is-dragging');
        carousel.setPointerCapture(pointerId);
    });

    carousel.addEventListener('pointerup', (event) => {
        if (pointerId !== event.pointerId) return;
        const distance = event.clientX - pointerStartX;
        carousel.classList.remove('is-dragging');
        pointerId = null;
        if (Math.abs(distance) >= 45) {
            showSlide(activeIndex + (distance < 0 ? 1 : -1));
        }
    });

    carousel.addEventListener('pointercancel', () => {
        carousel.classList.remove('is-dragging');
        pointerId = null;
    });

    carousel.addEventListener('mouseenter', () => {
        isPaused = true;
        window.clearTimeout(autoAdvanceTimer);
    });

    carousel.addEventListener('mouseleave', () => {
        isPaused = false;
        scheduleAutoAdvance();
    });

    carousel.addEventListener('focusin', () => {
        isPaused = true;
        window.clearTimeout(autoAdvanceTimer);
    });

    carousel.addEventListener('focusout', (event) => {
        if (carousel.contains(event.relatedTarget)) return;
        isPaused = false;
        scheduleAutoAdvance();
    });

    document.addEventListener('visibilitychange', scheduleAutoAdvance);

    const hasMultipleSlides = gallery.length > 1;
    previous.hidden = !hasMultipleSlides;
    next.hidden = !hasMultipleSlides;
    dots.hidden = !hasMultipleSlides;
    caption.hidden = !hasMultipleSlides;
    carousel.tabIndex = hasMultipleSlides ? 0 : -1;
    const imageCountLabel = gallery.length === 1 ? '1 imagen' : `${gallery.length} imágenes`;
    carousel.setAttribute('aria-label', `${product.brand} ${product.name}: ${imageCountLabel}`);
    showSlide(0);
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
