import { PriceFormatter, NotificationManager } from './utils.js';

export class CartSystem {
    constructor() {
        this.cart = this.loadCart();
    }

    loadCart() {
        return JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
    }

    saveCart() {
        localStorage.setItem('ma_furniture_cart', JSON.stringify(this.cart));
    }

    addProduct(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push(this.createCartItem(product));
        }
        
        this.saveCart();
        this.updateCartDisplay();
        this.showAddToCartAnimation();
        NotificationManager.show(`"${product.name}" добавлен в корзину`, 'success');
    }

    createCartItem(product) {
        return {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0] || '',
            quantity: 1
        };
    }

    removeProduct(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartDisplay();
        this.renderCartItems();
        NotificationManager.show('Товар удален из корзины', 'success');
    }

    updateProductQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        item.quantity += change;
        
        if (item.quantity < 1) {
            this.removeProduct(productId);
            return;
        }
        
        if (item.quantity > 99) {
            item.quantity = 99;
            NotificationManager.show('Максимальное количество товара - 99 шт.', 'error');
        }
        
        this.saveCart();
        this.updateCartDisplay();
        this.renderCartItems();
    }

    setProductQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        if (quantity < 1) {
            this.removeProduct(productId);
            return;
        }
        
        if (quantity > 99) {
            quantity = 99;
            NotificationManager.show('Максимальное количество товара - 99 шт.', 'error');
        }
        
        item.quantity = quantity;
        this.saveCart();
        this.updateCartDisplay();
        this.renderCartItems();
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
            cartCount.classList.add('show');
            this.animateCartCounter(cartCount);
        } else {
            cartCount.classList.remove('show');
        }
    }

    getTotalItemsCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    animateCartCounter(cartCount) {
        cartCount.style.animation = 'none';
        setTimeout(() => {
            cartCount.style.animation = 'cartBounce 0.5s ease';
        }, 10);
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
        this.updateCheckoutButton();
    }

    generateCartItemsHTML() {
        return this.cart.map(item => this.createCartItemHTML(item)).join('');
    }

    createCartItemHTML(item) {
        const itemTotal = item.price * item.quantity;
        return `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    ${this.createCartItemImageHTML(item)}
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <div class="cart-item-price">${PriceFormatter.format(item.price)}</div>
                    <div class="cart-item-actions">
                        ${this.createQuantityControlsHTML(item)}
                        <button class="remove-item" onclick="cartSystem.removeProduct(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createCartItemImageHTML(item) {
        if (item.image) {
            return `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
        }
        return '';
    }

    createQuantityControlsHTML(item) {
        return `
            <div class="quantity-controls">
                <button class="quantity-btn decrease-btn" onclick="cartSystem.updateProductQuantity(${item.id}, -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" 
                       onchange="cartSystem.setProductQuantity(${item.id}, parseInt(this.value))">
                <button class="quantity-btn increase-btn" onclick="cartSystem.updateProductQuantity(${item.id}, 1)">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }

    updateCartTotal() {
        const cartTotalAmount = document.getElementById('cartTotalAmount');
        if (cartTotalAmount) {
            cartTotalAmount.textContent = PriceFormatter.format(this.getCartTotal());
        }
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    updateCheckoutButton() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = this.cart.length === 0;
        }
    }

    showAddToCartAnimation() {
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon) {
            cartIcon.classList.add('animate');
            setTimeout(() => cartIcon.classList.remove('animate'), 500);
        }
    }

    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartDisplay();
        this.renderCartItems();
        NotificationManager.show('Корзина очищена', 'success');
    }
}