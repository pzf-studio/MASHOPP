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

    async init() {
        console.log('ShopApp: Starting initialization...');
        
        // Ждем инициализацию DataManager
        if (!this.dataManager.isInitialized) {
            console.log('ShopApp: Waiting for DataManager initialization...');
            await this.waitForDataManager();
        }

        if (!this.dataManager.isServerConnected) {
            console.error('ShopApp: Database server not available');
            return; // DataManager уже показал сообщение о тех. работах
        }

        this.setupEventListeners();
        await this.renderSectionsNavigation();
        await this.renderProducts();
        await this.renderFilters();
        this.initializeMobileMenu();
        this.setupCartEventListeners();
        this.setupMobileMenu();
        
        console.log('ShopApp: Initialization complete');
    }

    async waitForDataManager() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.dataManager.isInitialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Таймаут на случай если DataManager не инициализируется
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    setupEventListeners() {
        // Фильтры
        document.getElementById('categoryFilter')?.addEventListener('change', async (e) => {
            this.currentFilters.category = e.target.value;
            await this.renderProducts();
        });

        document.getElementById('sectionFilter')?.addEventListener('change', async (e) => {
            this.currentFilters.section = e.target.value;
            await this.renderProducts();
        });

        document.getElementById('sortFilter')?.addEventListener('change', async (e) => {
            this.currentFilters.sort = e.target.value;
            await this.renderProducts();
        });

        // Поиск
        document.getElementById('searchInput')?.addEventListener('input', async (e) => {
            this.currentFilters.search = e.target.value.toLowerCase();
            await this.renderProducts();
        });

        // События обновления данных
        window.addEventListener('productsDataUpdated', async () => {
            console.log('ShopApp: Products data updated event received');
            await this.renderProducts();
            await this.renderFilters();
            await this.renderSectionsNavigation();
        });

        window.addEventListener('sectionsDataUpdated', async () => {
            console.log('ShopApp: Sections data updated event received');
            await this.renderFilters();
            await this.renderSectionsNavigation();
        });

        // События корзины
        window.addEventListener('cartUpdated', () => {
            this.updateCartButtons();
        });
    }

    setupCartEventListeners() {
        document.addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('.btn-add-to-cart');
            if (addToCartBtn && !addToCartBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = parseInt(addToCartBtn.dataset.product);
                this.handleAddToCart(productId, addToCartBtn);
            }
        });

        document.addEventListener('click', (e) => {
            const quickViewBtn = e.target.closest('.btn-quick-view');
            if (quickViewBtn) {
                e.preventDefault();
                const productId = parseInt(quickViewBtn.dataset.product);
                this.handleQuickView(productId);
            }
        });
    }

    async handleAddToCart(productId, button) {
        try {
            const product = await this.dataManager.getProductById(productId);
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
        } catch (error) {
            console.error('Error adding product to cart:', error);
            this.showNotification('Ошибка добавления в корзину', 'error');
        }
    }

    addProductDirectly(product, button = null) {
        try {
            if (button) {
                button.classList.add('adding');
                setTimeout(() => button.classList.remove('adding'), 400);
            }

            const cart = JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
            const existingItem = cart.find(item => item.id === product.id);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                let imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
                
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: imageUrl,
                    quantity: 1
                });
            }
            
            localStorage.setItem('ma_furniture_cart', JSON.stringify(cart));
            
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

    handleQuickView(productId) {
        // Открываем страницу товара в новой вкладке
        window.open(`piece.html?id=${productId}`, '_blank');
    }

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
                // Асинхронно проверяем наличие товара
                this.checkProductStock(productId).then(outOfStock => {
                    if (outOfStock) {
                        btn.innerHTML = `<i class="fas fa-times"></i> Нет в наличии`;
                        btn.disabled = true;
                        btn.classList.remove('in-cart');
                    } else {
                        btn.innerHTML = `<i class="fas fa-shopping-cart"></i> В корзину`;
                        btn.disabled = false;
                        btn.classList.remove('in-cart');
                    }
                });
            }
        });
    }

    async checkProductStock(productId) {
        try {
            const product = await this.dataManager.getProductById(productId);
            return (product?.stock || 0) <= 0;
        } catch (error) {
            console.error('Error checking product stock:', error);
            return true;
        }
    }

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

    async renderSectionsNavigation() {
        const container = document.getElementById('sectionsNavigation');
        if (!container) {
            console.error('Sections navigation container not found');
            return;
        }

        try {
            const sections = await this.dataManager.getSections();
            const products = await this.dataManager.getProducts({ active: true });

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
        } catch (error) {
            console.error('Error rendering sections navigation:', error);
            container.innerHTML = '<div class="error-message">Ошибка загрузки разделов</div>';
        }
    }

    async filterBySection(event, sectionCode) {
        event.preventDefault();
        
        document.querySelectorAll('.section-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
        
        this.currentFilters.section = sectionCode;
        await this.renderProducts();
    }

    async renderFilters() {
        try {
            const sections = await this.dataManager.getSections();
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
                const products = await this.dataManager.getProducts({ active: true });
                const categories = [...new Set(products.map(p => p.category))];
                categoryFilter.innerHTML = `
                    <option value="">Все категории</option>
                    ${categories.map(category => `
                        <option value="${category}" ${this.currentFilters.category === category ? 'selected' : ''}>
                            ${category}
                        </option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Error rendering filters:', error);
        }
    }

    async renderProducts() {
        const grid = document.getElementById('productsGrid');
        const pagination = document.getElementById('pagination');
        if (!grid) {
            console.error('Products grid element not found!');
            return;
        }

        try {
            let products = await this.dataManager.getProducts({ 
                active: true,
                category: this.currentFilters.category,
                section: this.currentFilters.section,
                search: this.currentFilters.search,
                sort: this.currentFilters.sort
            });

            console.log('Found products:', products.length);

            // Пагинация
            const itemsPerPage = 12;
            const totalPages = Math.ceil(products.length / itemsPerPage);
            const currentPage = 1;
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

            grid.innerHTML = await Promise.all(
                productsToShow.map(product => this.renderProductCard(product))
            ).then(cards => cards.join(''));
            
            this.renderPagination(totalPages, currentPage);
            this.updateCartButtons();

        } catch (error) {
            console.error('Error rendering products:', error);
            grid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка загрузки товаров</h3>
                    <p>Попробуйте обновить страницу</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Обновить страницу
                    </button>
                </div>
            `;
        }
    }

    async renderProductCard(product) {
        const imageUrl = product.images && product.images.length > 0 ? 
            product.images[0] : '../images/placeholder.jpg';
        
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
                    ${product.badge ? `<span class="product-badge ${product.badge.toLowerCase().includes('новинка') ? 'new' : 'discount'}">${product.badge}</span>` : ''}
                    ${isOutOfStock ? '<span class="product-badge out-of-stock">Нет в наличии</span>' : ''}
                </div>
                
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    
                    <div class="product-meta">
                        <span class="product-category">${this.dataManager.getCategories()[product.category] || product.category}</span>
                        <span class="product-stock ${product.stock > 5 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                            ${product.stock > 5 ? 'В наличии' : product.stock > 0 ? `Осталось ${product.stock} шт.` : 'Нет в наличии'}
                        </span>
                    </div>
                    
                    <div class="product-price">
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

    renderPagination(totalPages, currentPage) {
        const pagination = document.getElementById('pagination');
        if (!pagination || totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        if (currentPage > 1) {
            paginationHTML += `<button class="page-btn prev" onclick="shopApp.goToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>`;
        }

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="shopApp.goToPage(${i})">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }

        if (currentPage < totalPages) {
            paginationHTML += `<button class="page-btn next" onclick="shopApp.goToPage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>`;
        }

        pagination.innerHTML = paginationHTML;
    }

    async goToPage(page) {
        // Реализация перехода по страницам
        console.log('Go to page:', page);
        await this.renderProducts();
    }

    async clearFilters() {
        this.currentFilters = {
            category: '',
            section: '',
            sort: 'newest',
            search: ''
        };
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        await this.renderFilters();
        await this.renderSectionsNavigation();
        await this.renderProducts();
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing ShopApp...');
    
    // Ждем инициализацию dataManager
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
        
        setTimeout(() => {
            if (!window.shopApp && window.dataManager) {
                clearInterval(checkDataManager);
                console.log('Forcing ShopApp initialization...');
                window.shopApp = new ShopApp();
            }
        }, 5000);
    }
});