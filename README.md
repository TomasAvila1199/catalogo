# Scenth Store

Catálogo estático de perfumes. Cloudflare Pages publica la raíz del repositorio, sin compilación ni dependencias de producción.

## Contenido

- `products.js`: productos, precios, disponibilidad y fotos originales.
- `product-details.js`: descripciones y placas de la galería.
- `app.js` / `product-detail.js`: búsqueda, filtros, fichas y consultas de WhatsApp.
- `styles.css`: identidad negra y dorada, tipografías y adaptación a pantallas.

## Imágenes y SEO

Las fotos originales se conservan. `image-sources.js` relaciona cada original con variantes WebP de hasta 360, 720 y 1200 px; el navegador elige según pantalla y densidad. Si falta una variante, se intenta el original. Fotos nuevas sin variantes siguen funcionando.

Después de agregar o cambiar fotos, instalá `sharp` como herramienta de desarrollo y ejecutá `node scripts/optimize-images.cjs`. No borres versiones antiguas en despliegues parciales: los nombres con hash permiten cachearlas durante un año. En un clon parcial de Git necesitás materializar las imágenes originales antes de regenerarlas.

Después de cambiar productos, ejecutá `node scripts/generate-sitemap.cjs`. El sitemap incluye el catálogo y sus 78 fichas actuales. Las fichas siguen usando JavaScript: sus metadatos y datos estructurados requieren un buscador que renderice JavaScript. Las imágenes sociales específicas de cada fragancia y el prerenderizado pueden incorporarse en otra etapa.

`_headers` aplica caché larga únicamente a las variantes con hash. Las páginas, scripts y precios mantienen la política de revalidación de Cloudflare Pages. No se necesita un panel ni una integración de pagos.

## Verificación

Serví la raíz con un servidor estático y ejecutá `CATALOG_URL=http://localhost:8000 node scripts/check-catalog.cjs` con Playwright disponible. Instalá su navegador Chromium con `playwright install chromium --only-shell` si hace falta. El chequeo verifica búsqueda con tildes, filtros, compra/cotización de WhatsApp, fichas, navegación de galería, errores y tamaños móviles/escritorio. Los enlaces se inspeccionan sin enviar mensajes.

El número de consultas es `5493415763811`; está en ambas lógicas de página y en los enlaces HTML de respaldo. Si cambia, actualizá los tres sitios.

Las métricas locales son orientativas. Después de publicar, verificá Core Web Vitals en PageSpeed Insights/Search Console con datos reales; una prueba local no demuestra INP ni resultados de campo.
