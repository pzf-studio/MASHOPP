// piece.js - Страница товара MA Furniture
class PieceApp {
    constructor() {
        this.dataManager = window.dataManager;
        this.currentProduct = null;
        this.currentImageIndex = 0;
        this.cartSystem = null;
        this.init();
    }

    init() {
        this.initializeCartSystem();
        this.loadProduct();
        this.setupEventListeners();
    }

    initializeCartSystem() {
        // Инициализируем корзину
        if (typeof CartSystem !== 'undefined') {
            this.cartSystem = new CartSystem();
        } else {
            console.error('CartSystem not found');
        }
    }

    showLoading() {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        if (loadingState) loadingState.style.display = 'block';
        if (errorState) errorState.style.display = 'none';
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.style.display = 'none';
    }

    showError(message) {
        this.hideLoading();
        const errorState = document.getElementById('errorState');
        if (errorState) {
            errorState.querySelector('h2').textContent = message;
            errorState.style.display = 'block';
        }
        
        const container = document.querySelector('.product-details');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 1rem;"></i>
                    <h2>${message}</h2>
                    <p>Попробуйте вернуться в магазин и выбрать другой товар</p>
                    <a href="shop.html" class="btn btn-primary">Вернуться в магазин</a>
                </div>
            `;
        }
    }

    loadProduct() {
        this.showLoading();
        
        const urlParams = new URLSearchParams(window.location.search);
        const productId = parseInt(urlParams.get('id'));

        if (!productId) {
            this.showError('Товар не найден');
            return;
        }

        // Даем время на инициализацию dataManager
        const tryLoadProduct = (attempt = 0) => {
            this.currentProduct = this.dataManager.getProductById(productId);
            
            if (this.currentProduct) {
                this.hideLoading();
                this.renderProduct();
                this.updatePageMeta();
            } else if (attempt < 3) {
                // Пробуем еще раз через короткое время
                setTimeout(() => tryLoadProduct(attempt + 1), 300);
            } else {
                this.showError('Товар не найден');
            }
        };

        tryLoadProduct();
    }

    updatePageMeta() {
        if (!this.currentProduct) return;

        // Обновляем title страницы
        document.title = `${this.currentProduct.name} - MA Furniture`;

        // Обновляем meta-теги для SEO
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = this.currentProduct.description || 
                                    `Купить ${this.currentProduct.name} в MA Furniture. Высокое качество, гарантия.`;
        }

        // Обновляем Open Graph теги
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');

        if (ogTitle) ogTitle.content = this.currentProduct.name;
        if (ogDescription) ogDescription.content = this.currentProduct.description || '';
        if (ogImage && this.currentProduct.images && this.currentProduct.images.length > 0) {
            ogImage.content = this.currentProduct.images[0];
        }
    }

    renderProduct() {
        if (!this.currentProduct) return;

        const container = document.getElementById('productDetails');
        if (!container) return;

        // Проверяем наличие изображений
        const hasImages = this.currentProduct.images && this.currentProduct.images.length > 0;
        const mainImageSrc = hasImages ? this.currentProduct.images[0] : 'images/placeholder.jpg';

        const productHTML = `
            <div class="product-layout">
                <div class="product-gallery">
                    <div class="main-image">
                        <img id="mainProductImage" src="${mainImageSrc}" alt="${this.currentProduct.name}" onerror="this.src='images/placeholder.jpg'">
                        ${hasImages && this.currentProduct.images.length > 1 ? `
                            <button class="nav-btn prev-btn" id="prevImage">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="nav-btn next-btn" id="nextImage">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        ` : ''}
                    </div>
                    ${hasImages && this.currentProduct.images.length > 1 ? `
                        <div class="thumbnails" id="productThumbnails">
                            ${this.currentProduct.images.map((image, index) => `
                                <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                                    <img src="${image}" alt="${this.currentProduct.name} - вид ${index + 1}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="product-info">
                    <div class="product-header">
                        <h1 id="productName">${this.currentProduct.name}</h1>
                        ${this.currentProduct.badge ? `<span class="product-badge" id="productBadge">${this.currentProduct.badge}</span>` : ''}
                    </div>
                    
                    <div class="product-price" id="productPrice">${this.formatPrice(this.currentProduct.price)}</div>
                    
                    <div class="product-meta">
                        <div class="meta-item">
                            <span class="meta-label">Артикул:</span>
                            <span class="meta-value" id="productSku">${this.currentProduct.sku || 'N/A'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Категория:</span>
                            <span class="meta-value" id="productCategory">${this.dataManager.getCategories()[this.currentProduct.category] || this.currentProduct.category}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Наличие:</span>
                            <span class="meta-value ${(this.currentProduct.stock || 0) <= 0 ? 'out-of-stock' : 'in-stock'}" id="productStock">
                                ${this.getStockText(this.currentProduct.stock)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="product-description">
                        <p id="productDescription">${this.currentProduct.description || 'Описание товара'}</p>
                    </div>
                    
                    <div class="product-actions">
                        <button class="btn btn-primary btn-add-to-cart" id="addToCartBtn">
                            <i class="fas fa-shopping-cart"></i> В корзину
                        </button>
                        <a href="shop.html" class="btn btn-outline btn-go-to-cart" id="goToCartBtn">
                            <i class="fas fa-shopping-bag"></i> Перейти в корзину
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="product-tabs">
                <div class="tab-buttons">
                    <button class="tab-btn active" data-tab="features">Характеристики</button>
                    <button class="tab-btn" data-tab="specifications">Спецификации</button>
                    <button class="tab-btn" data-tab="reviews">Отзывы</button>
                </div>
                
                <div class="tab-content active" id="featuresTab">
                    <ul class="features-list" id="productFeatures">
                        ${this.currentProduct.features && this.currentProduct.features.length > 0 ? 
                            this.currentProduct.features.map(feature => `<li>${feature}</li>`).join('') : 
                            '<li>Характеристики не указаны</li>'
                        }
                    </ul>
                </div>
                
                <div class="tab-content" id="specificationsTab">
                    <div class="specifications" id="productSpecifications">
                        ${this.currentProduct.specifications && Object.keys(this.currentProduct.specifications).length > 0 ? 
                            Object.entries(this.currentProduct.specifications).map(([key, value]) => `
                                <div class="spec-row">
                                    <span class="spec-name">${key}</span>
                                    <span class="spec-value">${value}</span>
                                </div>
                            `).join('') : 
                            '<p>Спецификации не указаны</p>'
                        }
                    </div>
                </div>
                
                <div class="tab-content" id="reviewsTab">
                    <div class="reviews-placeholder">
                        <i class="far fa-comments" style="font-size: 3rem; margin-bottom: 1rem; color: var(--border-color);"></i>
                        <p>Отзывов пока нет</p>
                        <button class="btn btn-outline" style="margin-top: 1rem;">Оставить отзыв</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = productHTML;
        
        // Обновляем бейдж
        const badgeElement = document.getElementById('productBadge');
        if (badgeElement) {
            if (this.currentProduct.badge) {
                badgeElement.textContent = this.currentProduct.badge;
                badgeElement.style.display = 'inline-block';
            } else {
                badgeElement.style.display = 'none';
            }
        }

        // Кнопка корзины
        this.updateAddToCartButton();

        // Хлебные крошки
        this.updateBreadcrumbs();

        // Инициализируем обработчики событий для динамически созданного контента
        this.attachDynamicEventListeners();
    }

    attachDynamicEventListeners() {
        // Обработка ошибок загрузки изображений
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG' && e.target.closest('.product-gallery')) {
                e.target.src = 'images/placeholder.jpg';
                e.target.alt = 'Изображение не найдено';
            }
        }, true);

        // Миниатюры изображений
        document.addEventListener('click', (e) => {
            if (e.target.closest('.thumbnail')) {
                const thumbnail = e.target.closest('.thumbnail');
                const index = parseInt(thumbnail.dataset.index);
                this.changeImage(index);
            }
        });

        // Навигация по изображениям
        const prevBtn = document.getElementById('prevImage');
        const nextBtn = document.getElementById('nextImage');
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousImage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextImage());

        // Добавление в корзину
        const addToCartBtn = document.getElementById('addToCartBtn');
        if (addToCartBtn) addToCartBtn.addEventListener('click', () => this.addToCart());

        // Табы
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });
    }

    changeImage(index) {
        this.currentImageIndex = index;
        
        // Обновляем основное изображение
        const mainImage = document.getElementById('mainProductImage');
        if (mainImage && this.currentProduct.images) {
            mainImage.src = this.currentProduct.images[index];
        }

        // Обновляем активную миниатюру
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }

    previousImage() {
        const images = this.currentProduct.images || [];
        if (images.length <= 1) return;
        
        this.currentImageIndex = (this.currentImageIndex - 1 + images.length) % images.length;
        this.changeImage(this.currentImageIndex);
    }

    nextImage() {
        const images = this.currentProduct.images || [];
        if (images.length <= 1) return;
        
        this.currentImageIndex = (this.currentImageIndex + 1) % images.length;
        this.changeImage(this.currentImageIndex);
    }

    updateAddToCartButton() {
        const button = document.getElementById('addToCartBtn');
        if (!button) return;

        const outOfStock = (this.currentProduct.stock || 0) <= 0;

        if (outOfStock) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-times"></i> Нет в наличии';
            button.className = 'btn btn-secondary';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-shopping-cart"></i> В корзину';
            button.className = 'btn btn-primary';
        }
    }

    updateBreadcrumbs() {
        const breadcrumbs = document.getElementById('breadcrumbs');
        if (!breadcrumbs) return;

        const category = this.dataManager.getCategories()[this.currentProduct.category] || this.currentProduct.category;
        const section = this.dataManager.getSectionByCode(this.currentProduct.section);

        breadcrumbs.innerHTML = `
            <a href="index.html">Главная</a>
            <span class="separator">/</span>
            ${section ? `<a href="shop.html?section=${section.code}">${section.name}</a><span class="separator">/</span>` : ''}
            <a href="shop.html?category=${this.currentProduct.category}">${category}</a>
            <span class="separator">/</span>
            <span class="current">${this.currentProduct.name}</span>
        `;
    }

    setupEventListeners() {
        // События обновления данных
        window.addEventListener('productsDataUpdated', () => {
            this.loadProduct();
        });
    }

    addToCart() {
        if (!this.currentProduct || !this.cartSystem) return;
        
        // Используем CartSystem для добавления в корзину
        this.cartSystem.addProduct(this.currentProduct);
    }

    switchTab(tabName) {
        // Скрыть все табы
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Показать выбранный таб
        document.getElementById(tabName + 'Tab')?.classList.add('active');
        
        // Обновить активную кнопку таба
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    }

    getStockText(stock) {
        if (stock === undefined || stock === null) return 'В наличии';
        if (stock <= 0) return 'Нет в наличии';
        if (stock < 5) return `Осталось ${stock} шт.`;
        return 'В наличии';
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }
}

// Инициализация страницы товара
let pieceApp;
document.addEventListener('DOMContentLoaded', () => {
    pieceApp = new PieceApp();
});

// Глобальные функции
window.pieceApp = pieceApp;