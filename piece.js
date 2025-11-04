// piece.js - Страница товара MA Furniture
document.addEventListener('DOMContentLoaded', function() {
    initializeProductPage();
    initializeCart();
    initializeMobileMenu();
});

function initializeProductPage() {
    // Получаем ID товара из URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    
    if (!productId) {
        showError('Товар не найден');
        return;
    }
    
    loadProduct(productId);
    loadRelatedProducts(productId);
}

function loadProduct(productId) {
    const product = dataSync.getProductById(productId);
    
    if (!product) {
        showError('Товар не найден');
        return;
    }
    
    renderProductDetails(product);
}

function renderProductDetails(product) {
    const container = document.getElementById('productDetails');
    
    // Форматируем характеристики
    const specsHtml = product.specifications && Object.keys(product.specifications).length > 0 ? 
        Object.entries(product.specifications).map(([key, value]) => `
            <div class="spec-row">
                <span class="spec-key">${key}:</span>
                <span class="spec-value">${value}</span>
            </div>
        `).join('') : 
        '<div class="spec-row">Информация отсутствует</div>';
    
    // Форматируем особенности
    const featuresHtml = product.features && product.features.length > 0 ? 
        product.features.map(feature => `<li>${feature}</li>`).join('') : 
        '<li>Информация отсутствует</li>';
    
    // Создаем галерею изображений
    let galleryHtml = '';
    if (product.images && product.images.length > 0) {
        galleryHtml = `
            <div class="product-gallery">
                <div class="gallery-main">
                    ${product.images.map((img, index) => `
                        <div class="gallery-slide ${index === 0 ? 'active' : ''}">
                            <img src="${img}" alt="${product.name}">
                        </div>
                    `).join('')}
                </div>
                ${product.images.length > 1 ? `
                    <div class="gallery-thumbs">
                        ${product.images.map((img, index) => `
                            <div class="thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
                                <img src="${img}" alt="${product.name}">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        galleryHtml = `
            <div class="product-gallery">
                <div class="gallery-main">
                    <div class="gallery-slide active">
                        <div style="width: 100%; height: 400px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
                            ${product.name}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="product-layout">
            ${galleryHtml}
            
            <div class="product-info">
                <div class="product-header">
                    <h1>${product.name}</h1>
                    ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                </div>
                
                <div class="product-price">
                    <span class="current-price">${formatPrice(product.price)}</span>
                </div>
                
                <div class="product-meta">
                    <div class="meta-item">
                        <span class="meta-label">Артикул:</span>
                        <span class="meta-value">${product.sku || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Наличие:</span>
                        <span class="meta-value ${(product.stock || 0) > 0 ? 'in-stock' : 'out-of-stock'}">
                            ${(product.stock || 0) > 0 ? 'В наличии' : 'Нет в наличии'}
                        </span>
                    </div>
                </div>
                
                <div class="product-description">
                    <p>${product.description || 'Описание товара отсутствует.'}</p>
                </div>
                
                <div class="product-features">
                    <h3>Особенности:</h3>
                    <ul>${featuresHtml}</ul>
                </div>
                
                <div class="product-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn minus">-</button>
                        <input type="number" class="quantity-input" value="1" min="1" max="${product.stock || 1}">
                        <button class="quantity-btn plus">+</button>
                    </div>
                    <button class="btn btn-primary btn-add-to-cart" 
                            ${(product.stock || 0) <= 0 ? 'disabled' : ''}
                            data-product="${product.id}">
                        <i class="fas fa-shopping-cart"></i>
                        ${(product.stock || 0) > 0 ? 'Добавить в корзину' : 'Нет в наличии'}
                    </button>
                    <button class="btn btn-outline btn-wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                
                <div class="product-specifications">
                    <h3>Характеристики:</h3>
                    <div class="specs-list">${specsHtml}</div>
                </div>
            </div>
        </div>
    `;
    
    // Инициализируем галерею
    initializeGallery();
    
    // Инициализируем обработчики событий
    initializeProductEventListeners(product);
}

function initializeGallery() {
    const thumbs = document.querySelectorAll('.gallery-thumbs .thumb');
    const slides = document.querySelectorAll('.gallery-slide');
    
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const index = parseInt(thumb.dataset.index);
            
            // Обновляем активный превью
            thumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            
            // Обновляем активный слайд
            slides.forEach(slide => slide.classList.remove('active'));
            slides[index].classList.add('active');
        });
    });
}

function initializeProductEventListeners(product) {
    // Quantity selector
    const quantityInput = document.querySelector('.quantity-input');
    const minusBtn = document.querySelector('.quantity-btn.minus');
    const plusBtn = document.querySelector('.quantity-btn.plus');
    
    minusBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
    });
    
    plusBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        const maxStock = product.stock || 1;
        if (currentValue < maxStock) {
            quantityInput.value = currentValue + 1;
        }
    });
    
    // Add to cart button
    const addToCartBtn = document.querySelector('.btn-add-to-cart');
    addToCartBtn.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value);
        addToCart(product.id, quantity);
        showNotification('Товар добавлен в корзину');
    });
    
    // Wishlist button
    const wishlistBtn = document.querySelector('.btn-wishlist');
    wishlistBtn.addEventListener('click', () => {
        wishlistBtn.classList.toggle('active');
        wishlistBtn.querySelector('i').classList.toggle('far');
        wishlistBtn.querySelector('i').classList.toggle('fas');
        
        if (wishlistBtn.classList.contains('active')) {
            wishlistBtn.style.color = '#d4af37';
            showNotification('Товар добавлен в избранное');
        } else {
            wishlistBtn.style.color = '';
            showNotification('Товар удален из избранного');
        }
    });
}

function loadRelatedProducts(currentProductId) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const currentProduct = products.find(p => p.id === currentProductId);
    
    if (!currentProduct) return;
    
    // Фильтруем связанные товары (той же категории, исключая текущий)
    const relatedProducts = products
        .filter(p => p.id !== currentProductId && 
                    p.category === currentProduct.category && 
                    p.active === true)
        .slice(0, 4); // Максимум 4 товара
    
    renderRelatedProducts(relatedProducts);
}

function renderRelatedProducts(products) {
    const container = document.getElementById('relatedProducts');
    
    if (products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                <p>Нет сопутствующих товаров</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const badge = product.badge ? `<div class="product-badge">${product.badge}</div>` : '';
        
        let imageContent = '';
        if (product.images && product.images.length > 0) {
            imageContent = `<img src="${product.images[0]}" alt="${product.name}" loading="lazy">`;
        } else {
            imageContent = `
                <div style="width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666; font-size: 0.9rem;">
                    ${product.name}
                </div>
            `;
        }
        
        return `
            <div class="product-card">
                <div class="product-image">
                    ${imageContent}
                    ${badge}
                    <button class="quick-view" data-product="${product.id}">Быстрый просмотр</button>
                    <a href="piece.html?id=${product.id}" class="product-link"></a>
                </div>
                <div class="product-info">
                    <h3 class="product-title">
                        <a href="piece.html?id=${product.id}">${product.name}</a>
                    </h3>
                    <div class="product-price">
                        <span class="current-price">${formatPrice(product.price)}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-cart" data-product="${product.id}">В корзину</button>
                        <button class="btn-wishlist">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Attach event listeners to related products
    attachRelatedProductsEventListeners();
}

function attachRelatedProductsEventListeners() {
    // Add to cart buttons
    document.querySelectorAll('#relatedProducts .btn-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.dataset.product);
            addToCart(productId);
            showNotification('Товар добавлен в корзину');
        });
    });
    
    // Wishlist buttons
    document.querySelectorAll('#relatedProducts .btn-wishlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.classList.toggle('far');
            e.target.classList.toggle('fas');
            e.target.classList.toggle('active');
            
            if (e.target.classList.contains('fas')) {
                e.target.style.color = '#d4af37';
                showNotification('Товар добавлен в избранное');
            } else {
                e.target.style.color = '';
                showNotification('Товар удален из избранного');
            }
        });
    });
    
    // Quick view buttons
    document.querySelectorAll('#relatedProducts .quick-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.dataset.product);
            showProductModal(productId);
        });
    });
}

function showError(message) {
    const container = document.getElementById('productDetails');
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
            <h2>${message}</h2>
            <p>Попробуйте вернуться в <a href="shop.html">магазин</a> и выбрать другой товар.</p>
        </div>
    `;
}

// Cart functionality (similar to shop.js)
function initializeCart() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    function updateCartDisplay() {
        const cartCount = document.getElementById('cartCount');
        const cartTotal = document.getElementById('cartTotal');
        const cartItems = document.getElementById('cartItems');
        
        // Update cart count
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCount) cartCount.textContent = totalItems;
        
        // Update cart total
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (cartTotal) cartTotal.textContent = formatPrice(totalPrice);
        
        // Update cart items in sidebar
        if (cartItems) {
            cartItems.innerHTML = '';
            
            if (cart.length === 0) {
                cartItems.innerHTML = `
                    <div class="empty-cart">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Ваша корзина пуста</p>
                    </div>
                `;
            } else {
                cart.forEach(item => {
                    const cartItem = document.createElement('div');
                    cartItem.className = 'cart-item';
                    cartItem.innerHTML = `
                        <div class="cart-item-image">
                            ${item.image ? `<img src="${item.image}" alt="${item.name}">` : 
                              `<div style="width: 60px; height: 60px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666; font-size: 0.8rem;">${item.name}</div>`}
                        </div>
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <div class="cart-item-price">${formatPrice(item.price)}</div>
                            <div class="cart-item-controls">
                                <button class="quantity-btn minus" data-id="${item.id}">-</button>
                                <span class="quantity">${item.quantity}</span>
                                <button class="quantity-btn plus" data-id="${item.id}">+</button>
                                <button class="remove-btn" data-id="${item.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    cartItems.appendChild(cartItem);
                });
            }
        }
        
        // Attach event listeners to cart controls
        attachCartEventListeners();
    }
    
    function attachCartEventListeners() {
        // Quantity minus buttons
        document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = parseInt(btn.dataset.id);
                updateCartItemQuantity(productId, -1);
            });
        });
        
        // Quantity plus buttons
        document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = parseInt(btn.dataset.id);
                updateCartItemQuantity(productId, 1);
            });
        });
        
        // Remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = parseInt(btn.dataset.id);
                removeFromCart(productId);
            });
        });
    }
    
    function addToCart(productId, quantity = 1) {
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            showNotification('Товар не найден', 'error');
            return;
        }
        
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images && product.images.length > 0 ? product.images[0] : null,
                quantity: quantity
            });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
    }
    
    function updateCartItemQuantity(productId, change) {
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            item.quantity += change;
            
            if (item.quantity <= 0) {
                cart = cart.filter(item => item.id !== productId);
            }
            
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();
        }
    }
    
    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
        showNotification('Товар удален из корзины');
    }
    
    // Make functions available globally
    window.addToCart = addToCart;
    window.updateCartItemQuantity = updateCartItemQuantity;
    window.removeFromCart = removeFromCart;
    
    // Initialize cart display
    updateCartDisplay();
}

// Mobile menu functionality
function initializeMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMenu = document.getElementById('closeMenu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.add('active');
        });
    }
    
    if (closeMenu && mobileMenu) {
        closeMenu.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
    }
    
    // Cart toggle
    const cartToggle = document.getElementById('cartToggle');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    
    if (cartToggle && cartSidebar) {
        cartToggle.addEventListener('click', () => {
            cartSidebar.classList.add('active');
        });
    }
    
    if (closeCart && cartSidebar) {
        closeCart.addEventListener('click', () => {
            cartSidebar.classList.remove('active');
        });
    }
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function showNotification(message, type = 'success') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Product modal functionality (for quick view from related products)
function showProductModal(productId) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Товар не найден', 'error');
        return;
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('productModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Format features and specifications
    const featuresHtml = product.features && product.features.length > 0 ? 
        product.features.map(feature => `<li>${feature}</li>`).join('') : 
        '<li>Информация отсутствует</li>';
    
    const specsHtml = product.specifications && Object.keys(product.specifications).length > 0 ? 
        Object.entries(product.specifications).map(([key, value]) => `
            <div class="spec-row">
                <span class="spec-key">${key}:</span>
                <span class="spec-value">${value}</span>
            </div>
        `).join('') : 
        '<div class="spec-row">Информация отсутствует</div>';
    
    // Image content
    let imageContent = '';
    if (product.images && product.images.length > 0) {
        imageContent = product.images.map((img, index) => `
            <div class="modal-image ${index === 0 ? 'active' : ''}">
                <img src="${img}" alt="${product.name}">
            </div>
        `).join('');
    } else {
        imageContent = `
            <div class="modal-image active">
                <div style="width: 100%; height: 300px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
                    ${product.name}
                </div>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-body">
                <div class="modal-images">
                    ${imageContent}
                </div>
                <div class="modal-info">
                    <h2>${product.name}</h2>
                    ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                    <div class="modal-price">${formatPrice(product.price)}</div>
                    
                    <div class="product-description">
                        <p>${product.description || 'Описание товара отсутствует.'}</p>
                    </div>
                    
                    <div class="product-features">
                        <h4>Особенности:</h4>
                        <ul>${featuresHtml}</ul>
                    </div>
                    
                    <div class="product-specifications">
                        <h4>Характеристики:</h4>
                        <div class="specs-list">${specsHtml}</div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="addToCart(${product.id}); showNotification('Товар добавлен в корзину')">
                            <i class="fas fa-shopping-cart"></i> В корзину
                        </button>
                        <button class="btn btn-outline">
                            <i class="far fa-heart"></i>
                        </button>
                        <a href="piece.html?id=${product.id}" class="btn btn-outline">
                            <i class="fas fa-external-link-alt"></i> Подробнее
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Attach close event
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
    
    modal.classList.add('active');
}

// Make functions available globally
window.showProductModal = showProductModal;
window.formatPrice = formatPrice;
window.showNotification = showNotification;