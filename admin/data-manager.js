// data-manager.js - Менеджер данных для магазина
class DataManager {
    constructor() {
        this.products = [];
        this.sections = [];
        this.init();
    }

    init() {
        this.loadProducts();
        this.loadSections();
        this.setupEventListeners();
    }

    loadProducts() {
        try {
            this.products = JSON.parse(localStorage.getItem('products')) || [];
            console.log('Loaded products:', this.products.length);
        } catch (error) {
            console.error('Error loading products:', error);
            this.products = [];
        }
    }

    loadSections() {
        try {
            this.sections = JSON.parse(localStorage.getItem('sections')) || [];
            console.log('Loaded sections:', this.sections.length);
        } catch (error) {
            console.error('Error loading sections:', error);
            this.sections = [];
        }
    }

    getProducts(filters = {}) {
        let filteredProducts = [...this.products];

        // Фильтр по категории
        if (filters.category) {
            filteredProducts = filteredProducts.filter(product => 
                product.category === filters.category
            );
        }

        // Фильтр по разделу
        if (filters.section) {
            filteredProducts = filteredProducts.filter(product => 
                product.section === filters.section
            );
        }

        // Фильтр по активности
        if (filters.active !== undefined) {
            filteredProducts = filteredProducts.filter(product => 
                product.active === filters.active
            );
        }

        // Фильтр по рекомендуемым
        if (filters.featured) {
            filteredProducts = filteredProducts.filter(product => 
                product.featured === true
            );
        }

        // Сортировка
        if (filters.sort) {
            switch (filters.sort) {
                case 'price_asc':
                    filteredProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    filteredProducts.sort((a, b) => b.price - a.price);
                    break;
                case 'name_asc':
                    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name_desc':
                    filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'newest':
                    filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
            }
        }

        return filteredProducts;
    }

    getProductById(id) {
        // Преобразуем ID к числу на случай строкового параметра
        const productId = parseInt(id);
        console.log('Searching for product ID:', productId, 'in products:', this.products);
        
        const product = this.products.find(product => product.id === productId);
        
        if (!product) {
            console.warn('Product not found with ID:', productId);
            // Пробуем найти по строковому ID
            return this.products.find(product => product.id == id);
        }
        
        return product;
    }

    getProductsByCategory(category) {
        return this.products.filter(product => 
            product.category === category && product.active === true
        );
    }

    getProductsBySection(section) {
        return this.products.filter(product => 
            product.section === section && product.active === true
        );
    }

    getFeaturedProducts() {
        return this.products.filter(product => 
            product.featured === true && product.active === true
        );
    }

    getSections() {
        return this.sections.filter(section => section.active !== false);
    }

    getSectionByCode(code) {
        return this.sections.find(section => section.code === code);
    }

    getCategories() {
        const categories = {
            'pantograph': 'Пантографы',
            'wardrobe': 'Гардеробные системы',
            'premium': 'Премиум коллекция',
            'kitchen': 'Кухонные лифты'
        };
        return categories;
    }

    setupEventListeners() {
        // Слушаем события обновления данных из админ-панели
        window.addEventListener('productsDataUpdated', () => {
            this.loadProducts();
            console.log('Products data updated');
        });

        window.addEventListener('sectionsDataUpdated', () => {
            this.loadSections();
            console.log('Sections data updated');
        });
    }
}

// Создаем глобальный экземпляр
const dataManager = new DataManager();
window.dataManager = dataManager;