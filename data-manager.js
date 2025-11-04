class DataManager {
    constructor() {
        this.products = [];
        this.sections = [];
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupSync();
    }

    loadFromStorage() {
        try {
            const adminProducts = JSON.parse(localStorage.getItem('adminProducts')) || [];
            const adminSections = JSON.parse(localStorage.getItem('adminSections')) || [];
            
            this.products = adminProducts.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                section: product.section || 'all',
                description: product.description || 'Описание товара',
                badge: product.badge,
                active: product.active !== false,
                featured: product.featured || false,
                stock: product.stock || 0,
                sku: product.sku || `MF-${product.id}`,
                images: product.images || [],
                features: Array.isArray(product.features) ? product.features : [],
                specifications: typeof product.specifications === 'object' ? product.specifications : {},
                createdAt: product.createdAt || new Date().toISOString(),
                updatedAt: product.updatedAt || new Date().toISOString()
            }));

            this.sections = adminSections;

            localStorage.setItem('products', JSON.stringify(this.products));
            
            console.log(`DataManager: Загружено ${this.products.length} товаров, ${this.sections.length} разделов`);

        } catch (error) {
            console.error('DataManager: Ошибка загрузки данных:', error);
            this.products = [];
            this.sections = [];
        }
    }

    setupSync() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'adminProducts' || e.key === 'adminSections') {
                console.log('DataManager: Обнаружены изменения в админ-панели');
                this.loadFromStorage();
                this.notifyUpdate();
            }
        });

        window.addEventListener('adminProductsUpdated', () => {
            console.log('DataManager: Событие обновления товаров');
            this.loadFromStorage();
            this.notifyUpdate();
        });
    }

    notifyUpdate() {
        const event = new CustomEvent('productsDataUpdated', {
            detail: { products: this.products, sections: this.sections }
        });
        window.dispatchEvent(event);
    }

    getProducts() {
        return this.products;
    }

    getActiveProducts() {
        return this.products.filter(product => product.active);
    }

    getProductById(id) {
        return this.products.find(product => product.id === parseInt(id));
    }

    getProductsByCategory(category) {
        return this.getActiveProducts().filter(product => product.category === category);
    }

    getProductsBySection(section) {
        return this.getActiveProducts().filter(product => product.section === section);
    }

    getFeaturedProducts(limit = 8) {
        return this.getActiveProducts()
            .filter(product => product.featured)
            .slice(0, limit);
    }

    getRandomProducts(limit = 3) {
        const activeProducts = this.getActiveProducts();
        const shuffled = [...activeProducts].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit);
    }

    getSections() {
        return this.sections.filter(section => section.active);
    }

    searchProducts(query) {
        const searchTerm = query.toLowerCase();
        return this.getActiveProducts().filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
    }
}

const dataManager = new DataManager();