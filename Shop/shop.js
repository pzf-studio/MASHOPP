// shop.js - Магазин MA Furniture (с интегрированной логикой корзины)
class ShopApp {
    constructor() {
        this.dataManager = window.dataManager;
        
        // Проверяем инициализацию DataManager
        if (!this.dataManager) {
            console.error('DataManager not found!');
            this.showError('Ошибка инициализации магазина');
            return;
        }

        console.log('ShopApp: DataManager found, initializing...');
        
        this.currentFilters = {
            category: '',
            section: '',
            sort: 'newest',
            search: ''
        };
        
        this.init();
    }

    init() {
        console.log('ShopApp: Starting initialization...');
        
        // Принудительная синхронизация с админкой
        this.syncWithAdminData();
        
        this.setupEventListeners();
        this.renderSectionsNavigation();
        this.renderProducts();
        this.renderFilters();
        this.initializeMobileMenu();
        this.setupCartEventListeners();
        this.setupMobileMenu();
        
        console.log('ShopApp: Initialization complete');
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
            console.log('ShopApp: Products data updated event received');
            this.renderProducts();
            this.renderFilters();
            this.renderSectionsNavigation();
        });

        window.addEventListener('sectionsDataUpdated', () => {
            console.log('ShopApp: Sections data updated event received');
            this.renderFilters();
            this.renderSectionsNavigation();
        });

        // События корзины
        window.addEventListener('cartUpdated', () => {
            this.updateCartButtons();
        });
    }

    // НОВЫЙ МЕТОД: Синхронизация с данными админки
    syncWithAdminData() {
        try {
            const adminProducts = localStorage.getItem('adminProducts');
            if (adminProducts) {
                const products = JSON.parse(adminProducts);
                // Фильтруем только активные товары для магазина
                const activeProducts = products.filter(p => p.active !== false);
                
                if (activeProducts.length > 0) {
                    localStorage.setItem('products', JSON.stringify(activeProducts));
                    console.log('ShopApp: Synced products from admin:', activeProducts.length);
                    
                    // Обновляем разделы если нужно
                    const sections = localStorage.getItem('sections');
                    if (!sections) {
                        const defaultSections = [
                            { id: 1, name: 'Классические', code: 'classic', active: true },
                            { id: 2, name: 'Современные', code: 'modern', active: true },
                            { id: 3, name: 'Премиум', code: 'premium', active: true }
                        ];
                        localStorage.setItem('sections', JSON.stringify(defaultSections));
                    }
                    
                    return activeProducts;
                }
            }
        } catch (error) {
            console.error('ShopApp: Error syncing with admin data:', error);
        }
        return [];
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

        // Быстрый просмотр
        document.addEventListener('click', (e) => {
            const quickViewBtn = e.target.closest('.btn-quick-view');
            if (quickViewBtn) {
                e.preventDefault();
                const productId = parseInt(quickViewBtn.dataset.product);
                this.handleQuickView(productId);
            }
        });
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Обработчик добавления в корзину
    handleAddToCart(productId, button) {
        const product = this.dataManager.getProductById(productId);
        if (!product) {
            console.error('Product not found:', productId);
            this.showNotification('Товар не найден', 'error');
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

    // Быстрый просмотр товара
    handleQuickView(productId) {
        const product = this.dataManager.getProductById(productId);
        if (product) {
            this.showNotification(`Быстрый просмотр: ${product.name}`, 'info');
            // Здесь можно добавить модальное окно с деталями товара
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
                <i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation-triangle' : 'exclamation'}-circle"></i>
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

    // НОВЫЙ МЕТОД: Показать ошибку
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'shop-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки магазина</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-primary">Перезагрузить страницу</button>
            </div>
        `;
        
        document.getElementById('productsGrid')?.appendChild(errorDiv);
    }

    // МЕТОД: Настройка мобильного меню
    setupMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const mainNav = document.querySelector('.main-nav');
        
        if (menuToggle && mainNav) {
            menuToggle.addEventListener('click', () => {
                mainNav.classList.toggle('active');
                menuToggle.classList.toggle('active');
            });
        }
    }

    renderSectionsNavigation() {
        const container = document.getElementById('sectionsNavigation');
        if (!container) {
            console.error('Sections navigation container not found');
            return;
        }

        const sections = this.dataManager.getSections();
        const products = this.dataManager.getProducts({ active: true });

        console.log('Rendering sections:', sections.length, 'Products:', products.length);

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
        
        if (event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
        
        // Применяем фильтр
        this.currentFilters.section = sectionCode;
        this.renderProducts();
    }

    renderFilters() {
        const sections = this.dataManager.getSections();
        const sectionFilter = document.getElementById('sectionFilter');
        const categoryFilter = document.getElementById('categoryFilter');

        if (sectionFilter) {
            sectionFilter.innerHTML = `
                <option value="">Все разделы</option>
                ${sections.map(section => `
                    <option value="${section.code}" ${this.currentFilters.section === section.code ? 'selected' : ''}>
                        ${section.name}
                    </option>
                `).join('')}
            `;
        }

        if (categoryFilter) {
            const categories = [...new Set(this.dataManager.getProducts({ active: true }).map(p => p.category))];
            categoryFilter.innerHTML = `
                <option value="">Все категории</option>
                ${categories.map(category => `
                    <option value="${category}" ${this.currentFilters.category === category ? 'selected' : ''}>
                        ${category}
                    </option>
                `).join('')}
            `;
        }
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        const pagination = document.getElementById('pagination');
        if (!grid) {
            console.error('Products grid element not found!');
            return;
        }

        // Отладочная информация
        console.log('Current filters:', this.currentFilters);
        
        let products = this.dataManager.getProducts({ 
            active: true,
            category: this.currentFilters.category,
            section: this.currentFilters.section,
            search: this.currentFilters.search
        });

        console.log('Found products:', products.length, products);

        // Сортировка
        products = this.sortProducts(products, this.currentFilters.sort);

        // Пагинация
        const itemsPerPage = 12;
        const totalPages = Math.ceil(products.length / itemsPerPage);
        const currentPage = 1; // Можно добавить управление страницами

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const productsToShow = products.slice(startIndex, endIndex);

        if (productsToShow.length === 0) {
            grid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <h3>Товары не найдены</h3>
                    <p>Попробуйте изменить параметры поиска или фильтры</p>
                    <button class="btn btn-primary" onclick="shopApp.clearFilters()">
                        Сбросить фильтры
                    </button>
                </div>
            `;
            pagination.innerHTML = '';
            return;
        }

        grid.innerHTML = productsToShow.map(product => this.renderProductCard(product)).join('');
        this.renderPagination(totalPages, currentPage);
        this.updateCartButtons(); // Обновляем состояние кнопок корзины
    }

    renderProductCard(product) {
        const imageUrl = window.imageManager ? 
            window.imageManager.getProductFirstImage(product) : 
            (product.images && product.images.length > 0 ? product.images[0] : '../images/placeholder.jpg');
        
        const isOutOfStock = (product.stock || 0) <= 0;
        const inCart = this.isProductInCart(product.id);
        const cartQuantity = this.getProductCartQuantity(product.id);
        
        let buttonHTML = '';
        if (isOutOfStock) {
            buttonHTML = `
                <button class="btn-add-to-cart out-of-stock" disabled>
                    <i class="fas fa-times"></i>
                    Нет в наличии
                </button>
            `;
        } else if (inCart) {
            buttonHTML = `
                <button class="btn-add-to-cart in-cart" data-product="${product.id}">
                    <i class="fas fa-check"></i>
                    В корзине (${cartQuantity})
                </button>
            `;
        } else {
            buttonHTML = `
                <button class="btn-add-to-cart" data-product="${product.id}">
                    <i class="fas fa-shopping-cart"></i>
                    В корзину
                </button>
            `;
        }

        return `
            <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy"
                         onerror="this.src='../images/placeholder.jpg'">
                    ${product.isNew ? '<span class="product-badge new">Новинка</span>' : ''}
                    ${product.discount ? `<span class="product-badge discount">-${product.discount}%</span>` : ''}
                    ${isOutOfStock ? '<span class="product-badge out-of-stock">Нет в наличии</span>' : ''}
                </div>
                
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.shortDescription || product.description || ''}</p>
                    
                    <div class="product-meta">
                        <span class="product-category">${product.category}</span>
                        <span class="product-stock ${product.stock > 5 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                            ${product.stock > 5 ? 'В наличии' : product.stock > 0 ? `Осталось ${product.stock} шт.` : 'Нет в наличии'}
                        </span>
                    </div>
                    
                    <div class="product-price">
                        ${product.oldPrice ? `
                            <span class="old-price">${this.formatPrice(product.oldPrice)}</span>
                        ` : ''}
                        <span class="current-price">${this.formatPrice(product.price)}</span>
                    </div>
                    
                    <div class="product-actions">
                        ${buttonHTML}
                        <button class="btn-quick-view" data-product="${product.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Вспомогательные методы для работы с корзиной
    isProductInCart(productId) {
        try {
            const cart = JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
            return cart.some(item => item.id === productId);
        } catch (error) {
            return false;
        }
    }

    getProductCartQuantity(productId) {
        try {
            const cart = JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
            const item = cart.find(item => item.id === productId);
            return item ? item.quantity : 0;
        } catch (error) {
            return 0;
        }
    }

    sortProducts(products, sortType) {
        switch (sortType) {
            case 'price_asc':
                return [...products].sort((a, b) => a.price - b.price);
            case 'price_desc':
                return [...products].sort((a, b) => b.price - a.price);
            case 'name':
                return [...products].sort((a, b) => a.name.localeCompare(b.name));
            case 'newest':
            default:
                return [...products].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }
    }

    renderPagination(totalPages, currentPage) {
        const pagination = document.getElementById('pagination');
        if (!pagination || totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Предыдущая страница
        if (currentPage > 1) {
            paginationHTML += `<button class="page-btn prev" onclick="shopApp.goToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>`;
        }

        // Номера страниц
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="shopApp.goToPage(${i})">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }

        // Следующая страница
        if (currentPage < totalPages) {
            paginationHTML += `<button class="page-btn next" onclick="shopApp.goToPage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>`;
        }

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        // Реализация перехода по страницам
        console.log('Go to page:', page);
        // Можно добавить логику пагинации при необходимости
    }

    clearFilters() {
        this.currentFilters = {
            category: '',
            section: '',
            sort: 'newest',
            search: ''
        };
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        this.renderFilters();
        this.renderSectionsNavigation();
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
        const menuToggle = document.getElementById('menuToggle');
        const mainNav = document.querySelector('.main-nav');
        
        if (menuToggle && mainNav) {
            menuToggle.addEventListener('click', () => {
                mainNav.classList.toggle('active');
                menuToggle.classList.toggle('active');
            });
        }
    }
}

// Глобальная переменная для доступа из HTML
window.shopApp = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ShopApp...');
    
    // Ждем инициализации dataManager
    if (window.dataManager && window.dataManager.isInitialized) {
        window.shopApp = new ShopApp();
        console.log('ShopApp initialized successfully');
    } else {
        console.log('Waiting for DataManager initialization...');
        const checkDataManager = setInterval(() => {
            if (window.dataManager && window.dataManager.isInitialized) {
                clearInterval(checkDataManager);
                window.shopApp = new ShopApp();
                console.log('ShopApp initialized after wait');
            }
        }, 100);
        
        // Таймаут на случай если DataManager не инициализируется
        setTimeout(() => {
            if (!window.shopApp) {
                clearInterval(checkDataManager);
                console.log('Forcing ShopApp initialization...');
                window.shopApp = new ShopApp();
            }
        }, 2000);
    }
});