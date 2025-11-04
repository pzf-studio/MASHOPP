import { ProductRenderer } from './product-renderer.js';
import { MobileMenu } from './mobile-menu.js';
import { NotificationManager } from './utils.js';

class IndexApp {
    constructor() {
        this.mobileMenu = null;
        this.productRenderer = null;
    }

    initialize() {
        this.migrateProductImages();
        this.initializeSmoothScroll();
        this.initializeFAQ();
        this.initializeMobileMenu();
        
        this.loadRecommendedProducts();
        this.loadRandomProducts();
        
        this.setupEventListeners();
    }

    migrateProductImages() {
        const products = JSON.parse(localStorage.getItem('products')) || [];
        let needsUpdate = false;
        
        products.forEach(product => {
            if (product.image && (!product.images || product.images.length === 0)) {
                product.images = [product.image];
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            localStorage.setItem('products', JSON.stringify(products));
        }
    }

    initializeSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => this.handleSmoothScroll(e, anchor));
        });
    }

    handleSmoothScroll(e, anchor) {
        e.preventDefault();
        const targetId = anchor.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    initializeFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => this.toggleFAQItem(item, faqItems));
        });
    }

    toggleFAQItem(clickedItem, allItems) {
        const isActive = clickedItem.classList.contains('active');
        
        allItems.forEach(item => item.classList.remove('active'));
        
        if (!isActive) {
            clickedItem.classList.add('active');
        }
    }

    initializeMobileMenu() {
        this.mobileMenu = new MobileMenu();
        this.mobileMenu.initialize();
    }

    loadRecommendedProducts() {
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const recommendedGrid = document.querySelector('.recommended-products-grid');
        
        if (!recommendedGrid) return;
        
        const recommendedProducts = products.filter(product => product.recommended === 'true');
        
        if (recommendedProducts.length === 0) {
            this.showEmptyProductsMessage(recommendedGrid, 'Рекомендуемые товары появятся здесь');
            return;
        }
        
        recommendedGrid.innerHTML = '';
        recommendedProducts.forEach(product => {
            const productCard = this.createProductCard(product);
            recommendedGrid.appendChild(productCard);
        });
    }

    loadRandomProducts() {
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const randomGrid = document.querySelector('.random-products-grid');
        
        if (!randomGrid) return;
        
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        const randomProducts = shuffled.slice(0, 3);
        
        if (randomProducts.length === 0) {
            this.showEmptyProductsMessage(randomGrid, 'Случайные товары появятся здесь');
            return;
        }
        
        randomGrid.innerHTML = '';
        randomProducts.forEach(product => {
            const productCard = this.createRandomProductCard(product);
            randomGrid.appendChild(productCard);
        });
    }

    showEmptyProductsMessage(container, message) {
        container.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-box-open"></i>
                <p>${message}</p>
            </div>
        `;
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = this.createProductCardHTML(product);
        return card;
    }

    createProductCardHTML(product) {
        const productImage = (product.images && product.images.length > 0) 
            ? product.images[0] 
            : product.image || null;
        
        const imageHTML = productImage ? 
            `<img src="${productImage}" alt="${product.name}" loading="lazy">` : 
            '<div class="no-image"><i class="fas fa-box"></i><p>Изображение отсутствует</p></div>';
        
        const badgeHTML = product.badge ? `<span class="product-badge">${product.badge}</span>` : '';
        
        return `
            <div class="product-image">
                ${imageHTML}
                ${badgeHTML}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description || 'Описание товара'}</p>
                <div class="product-price">${this.formatPrice(product.price)}</div>
            </div>
        `;
    }

    createRandomProductCard(product) {
        const card = document.createElement('div');
        card.className = 'random-product-card';
        card.innerHTML = this.createRandomProductCardHTML(product);
        return card;
    }

    createRandomProductCardHTML(product) {
        const productImage = (product.images && product.images.length > 0) 
            ? product.images[0] 
            : product.image || null;
        
        const imageHTML = productImage ? 
            `<img src="${productImage}" alt="${product.name}" loading="lazy">` : 
            '<div class="no-image"><i class="fas fa-box"></i><p>Изображение отсутствует</p></div>';
        
        const badgeHTML = product.badge ? `<span class="random-product-badge">${product.badge}</span>` : '';
        
        return `
            <div class="random-product-image">
                ${imageHTML}
                ${badgeHTML}
            </div>
            <div class="random-product-content">
                <div class="random-product-category">${product.category || 'Категория'}</div>
                <h3 class="random-product-title">${product.name}</h3>
                <div class="random-product-price">${this.formatPrice(product.price)}</div>
                <ul class="random-product-features">
                    <li>Высокое качество</li>
                    <li>Быстрая доставка</li>
                    <li>Гарантия возврата</li>
                </ul>
                <div class="random-product-actions">
                    <a href="shop.html?product=${product.id}" class="btn btn-small">
                        <i class="fas fa-eye"></i> Подробнее
                    </a>
                </div>
            </div>
        `;
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }

    setupEventListeners() {
        window.addEventListener('productsDataUpdated', () => {
            this.loadRecommendedProducts();
            this.loadRandomProducts();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const indexApp = new IndexApp();
    indexApp.initialize();
});