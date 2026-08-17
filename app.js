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
    if (!whatsappNudge) return;

    const hideNudge = () => whatsappNudge.classList.remove('visible');
    window.setTimeout(() => whatsappNudge.classList.add('visible'), 900);
    window.setTimeout(hideNudge, 14000);
    whatsappNudgeClose?.addEventListener('click', hideNudge);
    floatingWhatsApp?.addEventListener('click', hideNudge);
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
    placeholder.innerHTML = `<span>${getInitials(product)}</span><small>${product.brand}</small>`;
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
        image.src = product.image;
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

    return products.filter((product) => {
        const matchesStatus = state.status === 'todos' || product.status === state.status;
        const matchesGender = state.gender === 'todos' || product.gender === state.gender;
        const haystack = normalize(`${product.brand} ${product.name} ${product.reference}`);
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
    catalogGrid.replaceChildren(...visibleProducts.map(buildProductCard));
    emptyState.hidden = visibleProducts.length > 0;
}

statusTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        state.status = tab.dataset.status;
        statusTabs.forEach((button) => button.classList.toggle('active', button === tab));
        renderCatalog();
    });
});

searchInput.addEventListener('input', () => {
    state.search = searchInput.value.trim();
    renderCatalog();
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
});

setWhatsAppLinks();
setupWhatsAppNudge();
renderCatalog();
