import { CartSystem } from './cart-system.js';
import { ProductRenderer } from './product-renderer.js';
import { MobileMenu } from './mobile-menu.js';

class ShopApp {
    constructor() {
        this.cartSystem = null;
        this.productRenderer = null;
        this.mobileMenu = null;
    }

    initialize() {
        console.log('Initializing MA Furniture Shop...');
        
        this.initializeCart();
        this.initializeProductRenderer();
        this.initializeMobileMenu();
        this.setupEventListeners();
    }

    initializeCart() {
        this.cartSystem = new CartSystem();
        window.cartSystem = this.cartSystem;
    }

    initializeProductRenderer() {
        if (typeof dataManager !== 'undefined') {
            this.productRenderer = new ProductRenderer(dataManager, this.cartSystem);
            window.productRenderer = this.productRenderer;
            this.productRenderer.initialize();
        }
    }

    initializeMobileMenu() {
        this.mobileMenu = new MobileMenu();
        this.mobileMenu.initialize();
    }

    setupEventListeners() {
        window.addEventListener('productsDataUpdated', () => {
            console.log('Shop: Данные товаров обновлены');
            if (this.productRenderer) {
                this.productRenderer.initialize();
            }
        });

        this.setupCartEventListeners();
    }

    setupCartEventListeners() {
        const cartClose = document.getElementById('cartClose');
        const continueShoppingBtn = document.getElementById('continueShoppingBtn');
        const checkoutBtn = document.getElementById('checkoutBtn');
        const cartOverlay = document.getElementById('cartOverlay');

        if (cartClose) {
            cartClose.addEventListener('click', () => this.cartSystem.closeCart());
        }

        if (continueShoppingBtn) {
            continueShoppingBtn.addEventListener('click', () => this.cartSystem.closeCart());
        }

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.cartSystem.checkout());
        }

        if (cartOverlay) {
            cartOverlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) this.cartSystem.closeCart();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('cartOverlay')?.classList.contains('active')) {
                this.cartSystem.closeCart();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const shopApp = new ShopApp();
    shopApp.initialize();
});