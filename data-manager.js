// data-manager.js - Менеджер данных для магазина
class DataManager {
    constructor() {
        this.categories = {
            'pantograph': 'Пантографы',
            'wardrobe': 'Гардеробные системы', 
            'premium': 'Премиум коллекция',
            'kitchen': 'Кухонные лифты'
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Слушаем события обновления данных
        window.addEventListener('productsDataUpdated', () => {
            console.log('Products data updated');
        });

        window.addEventListener('sectionsDataUpdated', () => {
            console.log('Sections data updated');
        });
    }

    loadInitialData() {
        // Загружаем начальные данные, если их нет
        if (!localStorage.getItem('products')) {
            this.initializeSampleData();
        }
    }

    initializeSampleData() {
        const sampleProducts = [
            {
                id: 1,
                name: 'Пантограф Премиум',
                price: 45000,
                category: 'pantograph',
                section: 'classic',
                description: 'Эксклюзивный пантограф для гардеробной системы',
                badge: 'Новинка',
                active: true,
                featured: true,
                stock: 5,
                images: ['images/products/pantograph1.jpg'],
                features: ['Высококачественные материалы', 'Плавный ход', 'Надежная конструкция'],
                specifications: {
                    'Материал': 'Массив дерева',
                    'Размеры': '200x90x45 см',
                    'Вес': '35 кг'
                }
            }
        ];

        const sampleSections = [
            { id: 1, name: 'Классические', code: 'classic', product_count: 1, active: true },
            { id: 2, name: 'Современные', code: 'modern', product_count: 0, active: true },
            { id: 3, name: 'Премиум', code: 'premium', product_count: 0, active: true }
        ];

        localStorage.setItem('products', JSON.stringify(sampleProducts));
        localStorage.setItem('sections', JSON.stringify(sampleSections));
    }

    // Получение товаров с фильтрацией
    getProducts(filters = {}) {
        let products = JSON.parse(localStorage.getItem('products')) || [];
        
        // Применяем фильтры
        if (filters.active !== undefined) {
            products = products.filter(product => product.active === filters.active);
        }
        
        if (filters.category) {
            products = products.filter(product => product.category === filters.category);
        }
        
        if (filters.section) {
            products = products.filter(product => product.section === filters.section);
        }
        
        if (filters.featured) {
            products = products.filter(product => product.featured);
        }

        // Сортировка
        if (filters.sort) {
            switch (filters.sort) {
                case 'price_asc':
                    products.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    products.sort((a, b) => b.price - a.price);
                    break;
                case 'name':
                    products.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'newest':
                default:
                    products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                    break;
            }
        }

        return products;
    }

    // Получение разделов
    getSections() {
        return JSON.parse(localStorage.getItem('sections')) || [];
    }

    // Получение категорий
    getCategories() {
        return this.categories;
    }

    // Получение товара по ID
    getProductById(id) {
        const products = this.getProducts();
        return products.find(product => product.id === id);
    }

    // Получение рекомендуемых товаров
    getFeaturedProducts(limit = 8) {
        return this.getProducts({ featured: true, active: true }).slice(0, limit);
    }

    // Получение товаров по категории
    getProductsByCategory(category, limit = null) {
        let products = this.getProducts({ category, active: true });
        if (limit) {
            products = products.slice(0, limit);
        }
        return products;
    }

    // Получение товаров по разделу
    getProductsBySection(section, limit = null) {
        let products = this.getProducts({ section, active: true });
        if (limit) {
            products = products.slice(0, limit);
        }
        return products;
    }

    // Поиск товаров
    searchProducts(query) {
        const products = this.getProducts({ active: true });
        const lowerQuery = query.toLowerCase();
        
        return products.filter(product => 
            product.name.toLowerCase().includes(lowerQuery) ||
            product.description.toLowerCase().includes(lowerQuery) ||
            product.category.toLowerCase().includes(lowerQuery)
        );
    }

    // Обновление данных
    updateProducts(products) {
        localStorage.setItem('products', JSON.stringify(products));
        window.dispatchEvent(new CustomEvent('productsDataUpdated'));
    }

    updateSections(sections) {
        localStorage.setItem('sections', JSON.stringify(sections));
        window.dispatchEvent(new CustomEvent('sectionsDataUpdated'));
    }
}

// Создаем глобальный экземпляр
window.dataManager = new DataManager();