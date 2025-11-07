import { PriceFormatter } from './utils.js';

export class ProductRenderer {
    constructor(dataManager, cartSystem) {
        this.dataManager = dataManager;
        this.cartSystem = cartSystem;
        this.itemsPerPage = 15;
        this.currentPage = 1;
        this.currentFilter = 'all';
    }

    initialize() {
        this.initializeFilters();
        this.renderProducts();
        this.handleUrlFilters();
        this.attachEventListeners();
    }

    initializeFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleFilterClick(btn);
            });
        });
    }

    handleFilterClick(btn) {
        const filter = btn.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.currentFilter = filter;
        this.currentPage = 1;
        this.renderProducts();
    }

    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        const filteredProducts = this.getFilteredProducts();
        const productsToShow = this.getProductsForCurrentPage(filteredProducts);
        
        if (productsToShow.length === 0) {
            this.showNoProductsMessage(productsGrid, filteredProducts);
            return;
        }

        this.displayProducts(productsGrid, productsToShow);
        this.renderPagination(filteredProducts.length);
    }

    getFilteredProducts() {
        const activeProducts = this.dataManager.getActiveProducts();
        if (this.currentFilter === 'all') return activeProducts;
        
        return activeProducts.filter(product => 
            product.section === this.currentFilter || product.category === this.currentFilter
        );
    }

    getProductsForCurrentPage(filteredProducts) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return filteredProducts.slice(startIndex, endIndex);
    }

    showNoProductsMessage(productsGrid, filteredProducts) {
        productsGrid.innerHTML = this.createNoProductsHTML(filteredProducts);
        this.clearPagination();
    }

    createNoProductsHTML(filteredProducts) {
        const activeProducts = this.dataManager.getActiveProducts();
        const hasProducts = activeProducts.length > 0;
        
        return `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Товары не найдены</h3>
                <p>${hasProducts ? 'Нет товаров в выбранной категории' : 'Нет активных товаров'}</p>
                ${!hasProducts ? '<p><a href="admin/admin-login.html" style="color: #d4af37;">Добавьте товары в админ-панели</a></p>' : ''}
            </div>
        `;
    }

    displayProducts(productsGrid, products) {
        productsGrid.innerHTML = '';
        products.forEach(product => {
            const productCard = this.createProductCard(product);
            productsGrid.appendChild(productCard);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.category = product.category;
        card.dataset.section = product.section || 'all';
        
        card.innerHTML = this.createProductCardHTML(product);
        return card;
    }

    createProductCardHTML(product) {
        const badge = product.badge ? `<div class="product-badge">${product.badge}</div>` : '';
        const productUrl = `piece.html?id=${product.id}`;
        
        return `
            <div class="product-image">
                ${this.createProductImageHTML(product)}
                ${badge}
                <a href="${productUrl}" class="product-link"></a>
            </div>
            <div class="product-info">
                <h3 class="product-title">
                    <a href="${productUrl}">${product.name}</a>
                </h3>
                <div class="product-description">
                    ${product.description || 'Качественный товар от MA Furniture'}
                </div>
                <div class="product-price">
                    <span class="current-price">${PriceFormatter.format(product.price)}</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary add-to-cart-btn" data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i>
                        В корзину
                    </button>
                    <a href="${productUrl}" class="btn btn-outline">
                        <i class="fas fa-eye"></i>
                    </a>
                </div>
            </div>
        `;
    }

    createProductImageHTML(product) {
        if (product.images && product.images.length > 0) {
            return `<img src="${product.images[0]}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
        }
        return '<div class="image-placeholder" style="display: flex;"><i class="fas fa-couch"></i></div>';
    }

    renderPagination(totalItems) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        pagination.innerHTML = this.createPaginationHTML(totalPages);
    }

    createPaginationHTML(totalPages) {
        return `
            ${this.createPrevButton()}
            ${this.createPageButtons(totalPages)}
            ${this.createNextButton(totalPages)}
        `;
    }

    createPrevButton() {
        const disabled = this.currentPage === 1 ? 'disabled' : '';
        return `<button class="page-btn ${disabled}" onclick="productRenderer.goToPage(${this.currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;
    }

    createPageButtons(totalPages) {
        let buttons = '';
        for (let i = 1; i <= totalPages; i++) {
            const active = i === this.currentPage ? 'active' : '';
            buttons += `<button class="page-btn ${active}" onclick="productRenderer.goToPage(${i})">${i}</button>`;
        }
        return buttons;
    }

    createNextButton(totalPages) {
        const disabled = this.currentPage === totalPages ? 'disabled' : '';
        return `<button class="page-btn ${disabled}" onclick="productRenderer.goToPage(${this.currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>`;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderProducts();
    }

    clearPagination() {
        const pagination = document.getElementById('pagination');
        if (pagination) pagination.innerHTML = '';
    }

    handleUrlFilters() {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        
        if (category) {
            const filterBtn = document.querySelector(`[data-filter="${category}"]`);
            if (filterBtn) {
                filterBtn.click();
            }
        }
    }

    attachEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-btn')) {
                this.handleAddToCart(e);
            }
        });
    }

    handleAddToCart(event) {
        event.preventDefault();
        const button = event.target.closest('.add-to-cart-btn');
        const productId = parseInt(button.dataset.productId);
        const product = this.dataManager.getProductById(productId);
        
        if (product && this.cartSystem) {
            this.cartSystem.addProduct(product);
        }
    }
}