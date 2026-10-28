const WHATSAPP_NUMBER = '5493415763811';
const products = Array.isArray(window.CATALOG_PRODUCTS) ? window.CATALOG_PRODUCTS : [];

const catalogGrid = document.querySelector('#catalog-grid');
const productTemplate = document.querySelector('#product-template');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search');
const genderFilter = document.querySelector('#gender-filter');
const statusTabs = [...document.querySelectorAll('.status-tab')];
const searchRow = document.querySelector('.search-row');
const orderPanel = document.querySelector('#order-panel');
const whatsappNudge = document.querySelector('#whatsapp-nudge');
const whatsappNudgeClose = document.querySelector('.whatsapp-nudge-close');
const floatingWhatsApp = document.querySelector('.floating-whatsapp');

const sortedProducts = [...products].sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'es', { sensitivity: 'base', numeric: true }));
const searchableProducts = new Map(products.map(product => [product, normalize(`${product.brand} ${product.name} ${product.reference}`)]));
const cardCache = new Map();

const state = {
    status: 'disponible',
    gender: 'todos',
    search: ''
};

function whatsappUrl(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function setWhatsAppLinks() {
    const message = 'Hola Scenth Store, quería consultar por una fragancia del catálogo.';
    document.querySelectorAll('[data-whatsapp="general"]').forEach((link) => {
        link.href = whatsappUrl(message);
        link.target = '_blank';
        link.rel = 'noreferrer';
    });

    const orderMessage = 'Hola Scenth Store, busco un perfume que no está en stock y quería solicitar una cotización.';
    document.querySelectorAll('[data-whatsapp="order"]').forEach((link) => {
        link.href = whatsappUrl(orderMessage);
        link.target = '_blank';
        link.rel = 'noreferrer';
    });
}

function setupWhatsAppNudge() {
    if (!whatsappNudge || window.matchMedia('(max-width: 760px)').matches) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('scenth-nudge-dismissed') === '1'; } catch {}
    if (dismissed) return;
    const hideNudge = () => {
        whatsappNudge.hidden = true;
        whatsappNudge.classList.remove('visible');
        try { sessionStorage.setItem('scenth-nudge-dismissed', '1'); } catch {}
    };
    window.setTimeout(() => {
        if (dismissed) return;
        whatsappNudge.hidden = false;
        requestAnimationFrame(() => whatsappNudge.classList.add('visible'));
    }, 6000);
    window.setTimeout(hideNudge, 16000);
    whatsappNudgeClose?.addEventListener('click', () => { dismissed = true; hideNudge(); floatingWhatsApp?.focus(); });
    floatingWhatsApp?.addEventListener('click', () => { dismissed = true; hideNudge(); });
}

function normalize(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function slugify(value) {
    return normalize(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function productDetailUrl(product) {
    return `producto.html?producto=${encodeURIComponent(slugify(`${product.brand}-${product.name}`))}`;
}

function getInitials(product) {
    const words = `${product.brand} ${product.name}`.trim().split(/\s+/);
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function addPlaceholder(container, product) {
    if (container.querySelector('.product-placeholder')) return;
    const placeholder = document.createElement('div');
    placeholder.className = 'product-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    const initials = document.createElement('span');
    initials.textContent = getInitials(product);
    const brand = document.createElement('small');
    brand.textContent = product.brand;
    placeholder.append(initials, brand);
    container.appendChild(placeholder);
}

function buildProductCard(product) {
    const card = productTemplate.content.firstElementChild.cloneNode(true);
    const imageWrap = card.querySelector('.product-image-wrap');
    const image = card.querySelector('.product-image');
    const badge = card.querySelector('.stock-badge');
    const meta = card.querySelector('.product-meta');
    const name = card.querySelector('.product-name');
    const price = card.querySelector('.product-price');
    const action = card.querySelector('.product-action');
    const detailLink = card.querySelector('.product-detail-hitarea');

    if (product.image) {
        window.setCatalogImage(image, product.image, '(max-width: 760px) calc((100vw - 43px) / 2), (max-width: 980px) 30vw, 300px');
        image.alt = `${product.brand} ${product.name}`;
        image.addEventListener('error', () => {
            image.remove();
            addPlaceholder(imageWrap, product);
        }, { once: true });
    } else {
        image.remove();
        addPlaceholder(imageWrap, product);
    }

    const isAvailable = product.status === 'disponible';
    badge.textContent = isAvailable ? 'Disponible' : 'A pedido';
    badge.classList.toggle('available', isAvailable);
    meta.textContent = [product.brand, product.gender, product.volume].filter(Boolean).join(' · ');
    name.textContent = product.name;
    price.textContent = isAvailable ? product.price : 'Consultar precio';
    price.classList.toggle('order', !isAvailable);
    action.textContent = isAvailable ? 'Comprar' : 'Cotizar';
    action.setAttribute('aria-label', `${action.textContent} ${product.brand} ${product.name} por WhatsApp`);
    action.href = whatsappUrl(
        isAvailable
            ? `Hola Scenth Store, quiero comprar ${product.brand} ${product.name}. ¿Sigue disponible?`
            : `Hola Scenth Store, quería consultar por ${product.brand} ${product.name} a pedido.`
    );
    action.target = '_blank';
    action.rel = 'noreferrer';
    detailLink.href = productDetailUrl(product);
    detailLink.setAttribute('aria-label', `Ver detalles de ${product.brand} ${product.name}`);

    return card;
}

function filteredProducts() {
    const query = normalize(state.search);

    return sortedProducts.filter((product) => {
        const matchesStatus = state.status === 'todos' || product.status === state.status;
        const matchesGender = state.gender === 'todos' || product.gender === state.gender;
        const haystack = searchableProducts.get(product);
        const matchesSearch = !query || haystack.includes(query);
        return matchesStatus && matchesGender && matchesSearch;
    });
}

function renderCatalog() {
    const isOrderView = state.status === 'pedido';

    orderPanel.hidden = !isOrderView;
    searchRow.hidden = false;
    catalogGrid.hidden = false;

    const visibleProducts = filteredProducts();
    catalogGrid.replaceChildren(...visibleProducts.map((product) => {
        if (!cardCache.has(product)) cardCache.set(product, buildProductCard(product));
        return cardCache.get(product);
    }));
    document.querySelector('#catalog-count').textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? 'fragancia' : 'fragancias'} · ${state.status === 'disponible' ? 'En stock' : state.status === 'pedido' ? 'A pedido' : 'Toda la selección'}`;
    statusTabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.status === state.status)));
    emptyState.hidden = visibleProducts.length > 0;
}

statusTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        state.status = tab.dataset.status;
        statusTabs.forEach((button) => button.classList.toggle('active', button === tab));
        renderCatalog();
    });
});

let searchTimer;
searchInput.addEventListener('input', () => {
    state.search = searchInput.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderCatalog, 100);
});

genderFilter.addEventListener('change', () => {
    state.gender = genderFilter.value;
    renderCatalog();
});

document.querySelector('#clear-filters').addEventListener('click', () => {
    state.status = 'todos';
    state.gender = 'todos';
    state.search = '';
    searchInput.value = '';
    genderFilter.value = 'todos';
    statusTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.status === 'todos'));
    renderCatalog();
    searchInput.focus();
});

setWhatsAppLinks();
setupWhatsAppNudge();
renderCatalog();
