// shop.js - Магазин MA Furniture (с интегрированной логикой корзины)
class ShopApp {
    constructor() {
        this.dataManager = window.dataManager;
        this.currentFilters = {
            category: '',
            section: '',
            sort: 'newest',
            search: ''
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderSectionsNavigation();
        this.renderProducts();
        this.renderFilters();
        this.initializeMobileMenu();
        this.setupCartEventListeners();
    }

    setupEventListeners() {
        // Фильтры
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value;
            this.renderProducts();
        });

        document.getElementById('sectionFilter')?.addEventListener('change', (e) => {
            this.currentFilters.section = e.target.value;
            this.renderProducts();
        });

        document.getElementById('sortFilter')?.addEventListener('change', (e) => {
            this.currentFilters.sort = e.target.value;
            this.renderProducts();
        });

        // Поиск
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value.toLowerCase();
            this.renderProducts();
        });

        // События обновления данных
        window.addEventListener('productsDataUpdated', () => {
            this.renderProducts();
            this.renderFilters();
            this.renderSectionsNavigation();
        });

        window.addEventListener('sectionsDataUpdated', () => {
            this.renderFilters();
            this.renderSectionsNavigation();
        });

        // События корзины
        window.addEventListener('cartUpdated', () => {
            this.updateCartButtons();
        });
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Настройка слушателей событий корзины
    setupCartEventListeners() {
        // Делегирование событий для кнопок добавления в корзину
        document.addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('.btn-add-to-cart');
            if (addToCartBtn && !addToCartBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = parseInt(addToCartBtn.dataset.product);
                this.handleAddToCart(productId, addToCartBtn);
            }
        });
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Обработчик добавления в корзину
    handleAddToCart(productId, button) {
        const product = this.dataManager.getProductById(productId);
        if (!product) {
            console.error('Product not found:', productId);
            return;
        }

        // Проверяем наличие товара
        if ((product.stock || 0) <= 0) {
            this.showNotification('Товар отсутствует на складе', 'error');
            return;
        }

        // Используем глобальную функцию для добавления с анимацией
        if (typeof window.addToCartWithAnimation === 'function') {
            window.addToCartWithAnimation(productId, button);
        } else if (window.cartSystem) {
            // CartSystem сам выберет оптимальное изображение
            const productData = {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images && product.images.length > 0 ? product.images[0] : null
            };
            window.cartSystem.addProductWithAnimation(productData, button);
        } else {
            this.addProductDirectly(product, button);
        }
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Прямое добавление в корзину
    addProductDirectly(product, button = null) {
        try {
            if (button) {
                // Анимация кнопки
                button.classList.add('adding');
                setTimeout(() => button.classList.remove('adding'), 400);
            }

            const cart = JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
            const existingItem = cart.find(item => item.id === product.id);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                // Получаем оптимальное изображение для корзины
                let imageUrl = null;
                if (window.imageManager) {
                    imageUrl = window.imageManager.getProductFirstImage(product);
                } else {
                    imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
                }
                
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: imageUrl,
                    quantity: 1
                });
            }
            
            localStorage.setItem('ma_furniture_cart', JSON.stringify(cart));
            
            // Отправляем событие обновления
            window.dispatchEvent(new CustomEvent('cartUpdated', {
                detail: { 
                    cart: cart,
                    source: 'direct'
                }
            }));
            
            this.showNotification(`"${product.name}" добавлен в корзину`);
            
        } catch (error) {
            console.error('Error adding product to cart:', error);
            this.showNotification('Ошибка добавления в корзину', 'error');
        }
    }

    // НОВЫЙ МЕТОД: Обновление состояния кнопок корзины
    updateCartButtons() {
        let cart = [];
        try {
            if (window.cartSystem) {
                cart = window.cartSystem.getCartData();
            } else {
                cart = JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
            }
        } catch (error) {
            console.error('Error getting cart data:', error);
            cart = [];
        }
        
        const cartItemsMap = new Map(cart.map(item => [item.id, item.quantity]));
        
        document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
            const productId = parseInt(btn.dataset.product);
            const inCart = cartItemsMap.has(productId);
            
            if (inCart) {
                const quantity = cartItemsMap.get(productId);
                btn.innerHTML = `<i class="fas fa-check"></i> В корзине (${quantity})`;
                btn.classList.add('in-cart');
            } else {
                const product = this.dataManager.getProductById(productId);
                const outOfStock = (product?.stock || 0) <= 0;
                
                if (outOfStock) {
                    btn.innerHTML = `<i class="fas fa-times"></i> Нет в наличии`;
                    btn.disabled = true;
                    btn.classList.remove('in-cart');
                } else {
                    btn.innerHTML = `<i class="fas fa-shopping-cart"></i> В корзину`;
                    btn.disabled = false;
                    btn.classList.remove('in-cart');
                }
            }
        });
    }

    // НОВЫЙ МЕТОД: Показать уведомление
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Остальные методы остаются без изменений...
    renderSectionsNavigation() {
        const container = document.getElementById('sectionsNavigation');
        if (!container) return;

        const sections = this.dataManager.getSections();
        const products = this.dataManager.getProducts({ active: true });

        // Считаем количество товаров в каждом разделе
        const sectionCounts = {};
        sections.forEach(section => {
            sectionCounts[section.code] = products.filter(product => 
                product.section === section.code
            ).length;
        });

        // Добавляем кнопку "Все товары"
        const allItemsHTML = `
            <a href="#" class="section-filter-btn ${!this.currentFilters.section ? 'active' : ''}" 
               data-section="" onclick="shopApp.filterBySection(event, '')">
                <i class="fas fa-th-large"></i>
                <span>Все товары</span>
                <span class="item-count">${products.length}</span>
            </a>
        `;

        // Генерируем кнопки для каждого раздела
        const sectionsHTML = sections.map(section => {
            const isActive = this.currentFilters.section === section.code;
            const itemCount = sectionCounts[section.code] || 0;
            
            // Пропускаем разделы без товаров
            if (itemCount === 0) return '';

            return `
                <a href="#" class="section-filter-btn ${isActive ? 'active' : ''}" 
                   data-section="${section.code}" onclick="shopApp.filterBySection(event, '${section.code}')">
                    <span>${section.name}</span>
                    <span class="item-count">${itemCount}</span>
                </a>
            `;
        }).join('');

        container.innerHTML = allItemsHTML + sectionsHTML;
    }

    filterBySection(event, sectionCode) {
        event.preventDefault();
        
        // Обновляем активную кнопку
        document.querySelectorAll('.section-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
        // Применяем фильтр
        this.currentFilters.section = sectionCode;
        this.renderProducts();
        
        // Прокручиваем к товарам
        document.getElementById('productsGrid').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    renderProducts() {
        const container = document.getElementById('productsGrid');
        if (!container) return;

        let products = this.dataManager.getProducts({
            active: true,
            category: this.currentFilters.category || undefined,
            section: this.currentFilters.section || undefined,
            sort: this.currentFilters.sort
        });

        // Поиск
        if (this.currentFilters.search) {
            products = products.filter(product => 
                product.name.toLowerCase().includes(this.currentFilters.search) ||
                product.description?.toLowerCase().includes(this.currentFilters.search) ||
                product.category?.toLowerCase().includes(this.currentFilters.search)
            );
        }

        if (products.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = products.map(product => this.getProductCardHTML(product)).join('');
        
        // Обновляем состояние кнопок корзины после рендеринга
        setTimeout(() => this.updateCartButtons(), 100);
    }

    getProductCardHTML(product) {
        const imageUrl = product.images && product.images.length > 0 ? 
            product.images[0] : '';
        
        const badgeHTML = product.badge ? `<div class="product-badge">${product.badge}</div>` : '';
        const outOfStock = (product.stock || 0) <= 0;

        // Проверяем, есть ли товар в корзине
        let cart = [];
        try {
            cart = window.cartSystem ? window.cartSystem.getCartData() : JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
        } catch (error) {
            cart = [];
        }
        const cartItem = cart.find(item => item.id === product.id);
        const inCart = !!cartItem;
        const cartQuantity = cartItem ? cartItem.quantity : 0;

        let buttonHTML = '';
        if (outOfStock) {
            buttonHTML = `
                <button class="btn btn-add-to-cart" disabled>
                    <i class="fas fa-times"></i>
                    Нет в наличии
                </button>
            `;
        } else if (inCart) {
            buttonHTML = `
                <button class="btn btn-add-to-cart in-cart" data-product="${product.id}">
                    <i class="fas fa-check"></i>
                    В корзине (${cartQuantity})
                </button>
            `;
        } else {
            buttonHTML = `
                <button class="btn btn-add-to-cart" data-product="${product.id}">
                    <i class="fas fa-shopping-cart"></i>
                    В корзину
                </button>
            `;
        }

        return `
            <div class="product-card ${outOfStock ? 'out-of-stock' : ''}" data-product-id="${product.id}">
                <div class="product-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${product.name}" loading="lazy">` : '<div class="no-image-placeholder"><i class="fas fa-couch"></i></div>'}
                    ${badgeHTML}
                    ${outOfStock ? '<div class="out-of-stock-label">Нет в наличии</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">
                        <a href="piece.html?id=${product.id}">${product.name}</a>
                    </h3>
                    <p class="product-description">${product.description || 'Описание товара'}</p>
                    <div class="product-price">${this.formatPrice(product.price)}</div>
                    <div class="product-meta">
                        <span class="product-category">${this.dataManager.getCategories()[product.category] || product.category}</span>
                        <span class="product-stock">${outOfStock ? 'Нет в наличии' : 'В наличии'}</span>
                    </div>
                    ${buttonHTML}
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-search" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить параметры фильтрации или поиска</p>
                <button class="btn btn-outline" onclick="shopApp.clearFilters()">Сбросить фильтры</button>
            </div>
        `;
    }

    renderFilters() {
        this.renderCategoryFilter();
        this.renderSectionFilter();
    }

    renderCategoryFilter() {
        const filter = document.getElementById('categoryFilter');
        if (!filter) return;

        const categories = this.dataManager.getCategories();
        filter.innerHTML = `
            <option value="">Все категории</option>
            ${Object.entries(categories).map(([value, label]) => 
                `<option value="${value}">${label}</option>`
            ).join('')}
        `;
    }

    renderSectionFilter() {
        const filter = document.getElementById('sectionFilter');
        if (!filter) return;

        const sections = this.dataManager.getSections();
        filter.innerHTML = `
            <option value="">Все разделы</option>
            ${sections.map(section => 
                `<option value="${section.code}">${section.name}</option>`
            ).join('')}
        `;
    }

    clearFilters() {
        this.currentFilters = {
            category: '',
            section: '',
            sort: 'newest',
            search: ''
        };

        // Сбрасываем навигацию по разделам
        document.querySelectorAll('.section-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('.section-filter-btn[data-section=""]').classList.add('active');

        document.getElementById('categoryFilter').value = '';
        document.getElementById('sectionFilter').value = '';
        document.getElementById('sortFilter').value = 'newest';
        document.getElementById('searchInput').value = '';

        this.renderProducts();
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }

    initializeMobileMenu() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
            });
        }
    }
}

// Инициализация магазина
let shopApp;
document.addEventListener('DOMContentLoaded', () => {
    shopApp = new ShopApp();
});

// Глобальные функции
window.shopApp = shopApp;