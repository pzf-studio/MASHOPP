// sync.js - Синхронизация данных между админ-панелью и магазином
class DataSync {
    constructor() {
        this.storageKey = 'mafurniture_products';
        this.adminStorageKey = 'adminProducts';
        this.init();
    }

    init() {
        this.setupStorageListener();
        this.syncProducts();
    }

    // Синхронизация товаров из админки в магазин
    syncProducts() {
        try {
            // Получаем товары из админки
            const adminProducts = JSON.parse(localStorage.getItem(this.adminStorageKey)) || [];
            
            // Преобразуем формат для магазина
            const shopProducts = adminProducts.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                section: product.section || 'all',
                description: product.description,
                badge: product.badge,
                active: product.active !== false, // по умолчанию активен
                featured: product.featured || false,
                stock: product.stock || 0,
                sku: product.sku,
                images: product.images || [],
                features: this.parseFeatures(product.features),
                specifications: this.parseSpecifications(product.specifications),
                createdAt: product.createdAt || new Date().toISOString(),
                updatedAt: product.updatedAt || new Date().toISOString()
            }));

            // Сохраняем в хранилище магазина
            localStorage.setItem(this.storageKey, JSON.stringify(shopProducts));
            
            console.log(`Синхронизировано ${shopProducts.length} товаров`);
            
            // Отправляем событие об обновлении
            this.dispatchUpdateEvent();
            
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
        }
    }

    // Парсинг особенностей из текста
    parseFeatures(featuresInput) {
        if (!featuresInput) return [];
        if (Array.isArray(featuresInput)) return featuresInput;
        
        return featuresInput
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    // Парсинг характеристик из текста
    parseSpecifications(specsInput) {
        if (!specsInput) return {};
        if (typeof specsInput === 'object') return specsInput;
        
        const specifications = {};
        const lines = specsInput.split('\n');
        
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                specifications[key.trim()] = valueParts.join(':').trim();
            }
        });
        
        return specifications;
    }

    // Слушатель изменений в localStorage
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.adminStorageKey) {
                console.log('Обнаружены изменения в админ-панели');
                this.syncProducts();
            }
        });

        // Также слушаем кастомные события
        window.addEventListener('adminProductsUpdated', () => {
            this.syncProducts();
        });
    }

    // Отправка события об обновлении
    dispatchUpdateEvent() {
        const event = new CustomEvent('productsUpdated');
        window.dispatchEvent(event);
    }

    // Получение товаров для магазина
    getProducts() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    // Получение активных товаров
    getActiveProducts() {
        const products = this.getProducts();
        return products.filter(product => product.active);
    }

    // Поиск товара по ID
    getProductById(id) {
        const products = this.getProducts();
        return products.find(product => product.id === id);
    }

    // Получение товаров по категории
    getProductsByCategory(category) {
        const products = this.getActiveProducts();
        return products.filter(product => product.category === category);
    }

    // Получение рекомендуемых товаров
    getFeaturedProducts(limit = 8) {
        const products = this.getActiveProducts();
        return products
            .filter(product => product.featured)
            .slice(0, limit);
    }

    // Получение случайных товаров
    getRandomProducts(limit = 3) {
        const products = this.getActiveProducts();
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit);
    }
}

// Глобальная переменная для синхронизации
const dataSync = new DataSync();

// Функция для принудительной синхронизации
function forceSync() {
    dataSync.syncProducts();
    return dataSync.getProducts().length;
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataSync, dataSync, forceSync };
}