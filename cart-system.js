// cart-system.js - Полная система корзины с обработкой ошибок
class CartSystem {
    constructor() {
        this.storageKey = 'ma_furniture_cart';
        this.cart = this.loadCart();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCartDisplay();
        this.setupStorageListener();
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Загрузка корзины с обработкой ошибок
    loadCart() {
        try {
            const cartData = localStorage.getItem(this.storageKey);
            return cartData ? JSON.parse(cartData) : [];
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            return [];
        }
    }

    setupEventListeners() {
        // Открытие/закрытие корзины
        document.getElementById('cartIcon')?.addEventListener('click', () => this.openCart());
        document.getElementById('cartClose')?.addEventListener('click', () => this.closeCart());
        document.getElementById('continueShoppingBtn')?.addEventListener('click', () => this.closeCart());
        
        // Оформление заказа
        document.getElementById('checkoutBtn')?.addEventListener('click', () => this.checkout());
        
        // Клик по оверлею
        document.getElementById('cartOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'cartOverlay') this.closeCart();
        });

        // УДАЛЕНО: Делегирование событий для кнопок добавления в корзину
        // Теперь этим занимается только shop.js
    }

    setupStorageListener() {
        // Слушаем изменения в localStorage от других вкладок
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                console.log('Cart updated from another tab');
                this.syncCart();
            }
        });

        // Слушаем кастомные события
        window.addEventListener('cartUpdated', (e) => {
            if (e.detail && e.detail.source !== 'self') {
                console.log('Cart updated from custom event');
                this.syncCart();
            }
        });
    }

    // НОВЫЙ МЕТОД: Публичный метод для добавления товара
    addProduct(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }
        
        this.saveCart();
        this.updateCartDisplay();
        this.showNotification(`"${product.name}" добавлен в корзину`);
    }

    // НОВЫЙ МЕТОД: Публичный метод с анимацией
    addProductWithAnimation(product, button = null) {
        if (button) {
            // Запускаем анимацию перед добавлением
            this.showAddToCartAnimation(product, button);
            
            // Небольшая задержка для лучшего визуального эффекта
            setTimeout(() => {
                this.addProduct(product);
            }, 300);
        } else {
            this.addProduct(product);
        }
    }

    // УДАЛЕН: метод addProductFromButton - теперь используется addProductWithAnimation

    parsePrice(priceText) {
        if (!priceText) return 0;
        return parseInt(priceText.replace(/[^\d]/g, '')) || 0;
    }

    openCart() {
        document.getElementById('cartOverlay').classList.add('active');
        this.renderCartItems();
    }

    closeCart() {
        const cartSidebar = document.querySelector('.cart-sidebar');
        if (cartSidebar) {
            cartSidebar.classList.add('closing');
        }
        
        setTimeout(() => {
            document.getElementById('cartOverlay').classList.remove('active');
            if (cartSidebar) {
                cartSidebar.classList.remove('closing');
            }
        }, 300);
    }

    removeProduct(productId) {
        this.animateRemoveProduct(productId);
        
        setTimeout(() => {
            this.cart = this.cart.filter(item => item.id !== productId);
            this.saveCart();
            this.updateCartDisplay();
            this.showNotification('Товар удален из корзины');
        }, 300);
    }

    updateProductQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        // Анимация изменения
        this.animateQuantityChange(productId, change);

        item.quantity += change;
        
        if (item.quantity < 1) {
            this.animateRemoveProduct(productId);
            setTimeout(() => {
                this.removeProduct(productId);
            }, 300);
            return;
        }
        
        if (item.quantity > 99) {
            item.quantity = 99;
            this.showNotification('Максимальное количество товара - 99 шт.');
        }
        
        this.saveCart();
        this.updateCartDisplay();
        this.animateCartTotal();
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Сохранение с обработкой ошибок
    saveCart() {
        try {
            // Ограничиваем размер корзины
            if (this.cart.length > 50) {
                this.cart = this.cart.slice(0, 50);
                this.showNotification('Корзина ограничена 50 товарами', 'warning');
            }

            // Очищаем данные от лишней информации для экономии места
            const compactCart = this.cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image ? item.image.substring(0, 100) : null, // ограничиваем длину URL
                quantity: item.quantity
            }));

            localStorage.setItem(this.storageKey, JSON.stringify(compactCart));
            
            // Дополнительно отправляем событие для синхронизации между вкладками
            window.dispatchEvent(new CustomEvent('cartUpdated', {
                detail: { 
                    cart: this.cart,
                    source: 'self'
                }
            }));
            
            return true;
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
            this.showNotification('Ошибка сохранения корзины. Данные могут быть потеряны.', 'error');
            
            // Пробуем очистить localStorage и сохранить снова
            if (error.name === 'QuotaExceededError') {
                this.clearStorageAndRetry();
            }
            return false;
        }
    }

    // НОВЫЙ МЕТОД: Очистка хранилища при переполнении
    clearStorageAndRetry() {
        try {
            // Сохраняем только корзину, удаляем всё остальное
            const cartData = localStorage.getItem(this.storageKey);
            localStorage.clear();
            
            if (cartData) {
                localStorage.setItem(this.storageKey, cartData);
            }
            
            this.showNotification('Память очищена. Попробуйте снова.', 'warning');
        } catch (clearError) {
            console.error('Error clearing localStorage:', clearError);
            this.showNotification('Критическая ошибка памяти. Перезагрузите страницу.', 'error');
        }
    }

    // НОВЫЙ МЕТОД: Принудительная синхронизация с localStorage
    syncCart() {
        try {
            const savedCart = this.loadCart();
            this.cart = savedCart;
            this.updateCartDisplay();
            return this.cart;
        } catch (error) {
            console.error('Error syncing cart:', error);
            return this.cart;
        }
    }

    // НОВЫЙ МЕТОД: Получение данных корзины для других страниц
    getCartData() {
        return JSON.parse(JSON.stringify(this.cart)); // возвращаем копию
    }

    // НОВЫЙ МЕТОД: Очистка корзины после оформления заказа
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartDisplay();
        this.showNotification('Корзина очищена');
    }

    updateCartDisplay() {
        this.updateCartCounter();
        if (this.isCartOpen()) {
            this.renderCartItems();
        }
    }

    updateCartCounter() {
        const cartCount = document.getElementById('cartCount');
        if (!cartCount) return;

        const totalItems = this.getTotalItemsCount();
        cartCount.textContent = totalItems;
        
        if (totalItems > 0) {
            cartCount.style.display = 'flex';
        } else {
            cartCount.style.display = 'none';
        }
    }

    getTotalItemsCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    isCartOpen() {
        return document.getElementById('cartOverlay')?.classList.contains('active');
    }

    renderCartItems() {
        const cartItems = document.getElementById('cartItems');
        const cartEmpty = document.getElementById('cartEmpty');
        const cartFooter = document.getElementById('cartFooter');
        
        if (!cartItems || !cartEmpty || !cartFooter) return;

        if (this.cart.length === 0) {
            this.showEmptyCart(cartItems, cartEmpty, cartFooter);
            return;
        }

        this.showCartWithItems(cartItems, cartEmpty, cartFooter);
    }

    showEmptyCart(cartItems, cartEmpty, cartFooter) {
        cartItems.style.display = 'none';
        cartEmpty.style.display = 'block';
        cartFooter.style.display = 'none';
    }

    showCartWithItems(cartItems, cartEmpty, cartFooter) {
        cartEmpty.style.display = 'none';
        cartItems.style.display = 'block';
        cartFooter.style.display = 'block';
        
        cartItems.innerHTML = this.generateCartItemsHTML();
        this.updateCartTotal();
    }

    generateCartItemsHTML() {
        return this.cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    ${item.image && item.image.length > 10 ? 
                        `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling?.style.display='flex';">` : 
                        '<div class="image-placeholder"><i class="fas fa-couch"></i></div>'
                    }
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <div class="cart-item-price">${this.formatPrice(item.price)}</div>
                    <div class="cart-item-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="cartSystem.updateProductQuantity(${item.id}, -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" readonly>
                            <button class="quantity-btn" onclick="cartSystem.updateProductQuantity(${item.id}, 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="remove-item" onclick="cartSystem.removeProduct(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateCartTotal() {
        const cartTotalAmount = document.getElementById('cartTotalAmount');
        if (cartTotalAmount) {
            cartTotalAmount.textContent = this.formatPrice(this.getCartTotal());
        }
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }

    // Анимации
    showAddToCartAnimation(product, button) {
        // Анимация кнопки
        button.classList.add('adding');
        setTimeout(() => button.classList.remove('adding'), 400);
        
        // Анимация иконки корзины
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon) {
            cartIcon.classList.add('animate');
            setTimeout(() => cartIcon.classList.remove('animate'), 600);
        }
        
        // Анимация счетчика
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.classList.add('pulse');
            setTimeout(() => cartCount.classList.remove('pulse'), 300);
        }
    }

    animateQuantityChange(productId, change) {
        const itemElement = document.querySelector(`.cart-item[data-id="${productId}"]`);
        if (itemElement) {
            itemElement.classList.add('updating');
            setTimeout(() => itemElement.classList.remove('updating'), 300);
        }
        
        // Анимация инпута количества
        const quantityInput = document.querySelector(`.cart-item[data-id="${productId}"] .quantity-input`);
        if (quantityInput) {
            quantityInput.classList.add('changing');
            setTimeout(() => quantityInput.classList.remove('changing'), 300);
        }
    }

    animateRemoveProduct(productId) {
        const itemElement = document.querySelector(`.cart-item[data-id="${productId}"]`);
        if (itemElement) {
            itemElement.classList.add('removing');
        }
    }

    animateCartTotal() {
        const totalElement = document.getElementById('cartTotalAmount');
        if (totalElement) {
            totalElement.classList.add('updating');
            setTimeout(() => totalElement.classList.remove('updating'), 300);
        }
    }

    showNotification(message, type = 'success') {
        // Создаем стили для уведомлений если их нет
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: white;
                    border-radius: 5px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    padding: 1rem 1.5rem;
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                    z-index: 1400;
                    border-left: 4px solid #8B7355;
                }
                .notification.show {
                    transform: translateX(0);
                }
                .notification.success {
                    border-left-color: #27ae60;
                }
                .notification.error {
                    border-left-color: #e74c3c;
                }
                .notification.warning {
                    border-left-color: #f39c12;
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .notification.success .notification-content i {
                    color: #27ae60;
                }
                .notification.error .notification-content i {
                    color: #e74c3c;
                }
                .notification.warning .notification-content i {
                    color: #f39c12;
                }
            `;
            document.head.appendChild(styles);
        }

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

    checkout() {
        if (this.cart.length === 0) {
            this.showNotification('Корзина пуста');
            return;
        }

        const checkoutBtn = document.getElementById('checkoutBtn');
        const originalText = checkoutBtn.innerHTML;
        
        // Анимация загрузки
        checkoutBtn.classList.add('loading');
        checkoutBtn.disabled = true;

        setTimeout(() => {
            // Восстанавливаем кнопку
            checkoutBtn.classList.remove('loading');
            checkoutBtn.innerHTML = originalText;
            checkoutBtn.disabled = false;
            
            // Переходим на страницу оформления заказа
            window.location.href = 'checkout.html';
        }, 1000);
    }
}

// Глобальные функции для доступа к корзине с других страниц
window.getCartData = function() {
    if (window.cartSystem) {
        return window.cartSystem.getCartData();
    } else {
        // Если cartSystem не инициализирован, читаем напрямую из localStorage
        try {
            return JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
        } catch (error) {
            console.error('Error getting cart data:', error);
            return [];
        }
    }
};

window.clearCart = function() {
    if (window.cartSystem) {
        window.cartSystem.clearCart();
    } else {
        try {
            localStorage.removeItem('ma_furniture_cart');
            // Отправляем событие об очистке
            window.dispatchEvent(new CustomEvent('cartUpdated', {
                detail: { 
                    cart: [],
                    source: 'clear'
                }
            }));
        } catch (error) {
            console.error('Error clearing cart:', error);
        }
    }
};

window.syncCart = function() {
    if (window.cartSystem) {
        return window.cartSystem.syncCart();
    } else {
        try {
            return JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
        } catch (error) {
            console.error('Error syncing cart:', error);
            return [];
        }
    }
};

// НОВАЯ ГЛОБАЛЬНАЯ ФУНКЦИЯ: Добавление товара с анимацией
window.addToCartWithAnimation = function(productId, button) {
    if (window.cartSystem) {
        const product = window.dataManager?.getProductById(productId);
        if (!product) {
            console.error('Product not found:', productId);
            return;
        }

        const productData = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images && product.images.length > 0 ? product.images[0] : null
        };

        window.cartSystem.addProductWithAnimation(productData, button);
    }
};

// Инициализация корзины после загрузки DOM
let cartSystem;
document.addEventListener('DOMContentLoaded', () => {
    cartSystem = new CartSystem();
    window.cartSystem = cartSystem;
});