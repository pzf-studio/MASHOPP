// Utils/data-manager.js - Менеджер данных для магазина с поддержкой БД
class DataManager {
    constructor() {
        this.categories = {
            'pantograph': 'Пантографы',
            'wardrobe': 'Гардеробные системы', 
            'premium': 'Премиум коллекция',
            'kitchen': 'Кухонные лифты'
        };
        this.isInitialized = false;
        this.API_BASE = 'http://localhost:3001/api';
        this.isServerConnected = false;
        this.init();
    }

    async init() {
        await this.checkServerConnection();
        if (!this.isServerConnected) {
            this.showTechnicalWorksMessage();
            return;
        }
        
        this.setupEventListeners();
        await this.loadInitialData();
        this.isInitialized = true;
        console.log('DataManager initialized successfully with database');
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.API_BASE}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Server not responding');
            
            console.log('✅ Connected to database server');
            this.isServerConnected = true;
            return true;
        } catch (error) {
            console.error('❌ Database server not available:', error);
            this.isServerConnected = false;
            return false;
        }
    }

    showTechnicalWorksMessage() {
        // Создаем сообщение о технических работах
        const message = document.createElement('div');
        message.className = 'technical-works-message';
        message.innerHTML = `
            <div class="technical-works-content">
                <div class="technical-works-icon">
                    <i class="fas fa-tools"></i>
                </div>
                <h2>Ведутся технические работы</h2>
                <p>Магазин временно недоступен, но вы можете связаться с нами напрямую!</p>
                <div class="technical-works-details">
                    <p><strong>Телефон:</strong> +7 (910) 005-34-24</p>
                    <p><strong>Наше сообщество:</strong> _________</p>
                </div>
                <button onclick="location.reload()" class="btn btn-primary">
                    <i class="fas fa-refresh"></i> Попробовать снова
                </button>
            </div>
        `;
        
        // Добавляем стили
        const styles = document.createElement('style');
        styles.textContent = `
            .technical-works-message {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-family: 'Arial', sans-serif;
            }
            .technical-works-content {
                text-align: center;
                max-width: 500px;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .technical-works-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                color: #ffd700;
            }
            .technical-works-content h2 {
                font-size: 2rem;
                margin-bottom: 1rem;
                color: white;
            }
            .technical-works-content p {
                font-size: 1.1rem;
                margin-bottom: 1rem;
                line-height: 1.5;
            }
            .technical-works-details {
                background: rgba(0, 0, 0, 0.2);
                padding: 1rem;
                border-radius: 8px;
                margin: 1.5rem 0;
                text-align: left;
            }
            .technical-works-details p {
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }
            .btn {
                margin-top: 1rem;
                padding: 12px 24px;
                background: #ffd700;
                color: #333;
                border: none;
                border-radius: 5px;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.3s ease;
            }
            .btn:hover {
                background: #ffed4a;
            }
        `;
        
        document.head.appendChild(styles);
        document.body.innerHTML = '';
        document.body.appendChild(message);
    }

    async apiRequest(endpoint, options = {}) {
        if (!this.isServerConnected) {
            throw new Error('Database server not available');
        }

        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        window.addEventListener('productsDataUpdated', () => {
            console.log('Products data updated');
        });

        window.addEventListener('sectionsDataUpdated', () => {
            console.log('Sections data updated');
        });
    }

    async loadInitialData() {
        // Проверяем соединение с сервером
        if (!this.isServerConnected) {
            throw new Error('Database server not available');
        }

        try {
            // Загружаем начальные данные
            const [products, sections] = await Promise.all([
                this.apiRequest('/products?active=true'),
                this.apiRequest('/sections?active=true')
            ]);

            console.log('Initial data loaded:', {
                products: products.length,
                sections: sections.length
            });

        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
        }
    }

    // Получение товаров с фильтрацией
    async getProducts(filters = {}) {
        try {
            let endpoint = '/products?';
            const params = [];

            if (filters.active !== undefined) {
                params.push(`active=${filters.active}`);
            }
            
            if (filters.category) {
                params.push(`category=${filters.category}`);
            }
            
            if (filters.section) {
                params.push(`section=${filters.section}`);
            }
            
            if (filters.featured) {
                params.push(`featured=${filters.featured}`);
            }

            if (filters.search) {
                params.push(`search=${encodeURIComponent(filters.search)}`);
            }

            if (filters.sort) {
                params.push(`sort=${filters.sort}`);
            }

            if (filters.limit) {
                params.push(`limit=${filters.limit}`);
            }

            endpoint += params.join('&');

            const products = await this.apiRequest(endpoint);
            return products;
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    // Получение разделов
    async getSections() {
        try {
            return await this.apiRequest('/sections?active=true');
        } catch (error) {
            console.error('Error getting sections:', error);
            return [];
        }
    }

    // Получение категорий
    getCategories() {
        return this.categories;
    }

    // Получение товара по ID
    async getProductById(id) {
        try {
            return await this.apiRequest(`/products/${id}`);
        } catch (error) {
            console.error('Error getting product by ID:', error);
            return null;
        }
    }

    // Получение товара по артикулу
    async getProductBySku(sku) {
        try {
            return await this.apiRequest(`/products/sku/${sku}`);
        } catch (error) {
            console.error('Error getting product by SKU:', error);
            return null;
        }
    }

    // Получение рекомендуемых товаров
    async getFeaturedProducts(limit = 8) {
        return this.getProducts({ featured: true, active: true, limit });
    }

    // Получение товаров по категории
    async getProductsByCategory(category, limit = null) {
        const filters = { category, active: true };
        if (limit) filters.limit = limit;
        return this.getProducts(filters);
    }

    // Получение товаров по разделу
    async getProductsBySection(section, limit = null) {
        const filters = { section, active: true };
        if (limit) filters.limit = limit;
        return this.getProducts(filters);
    }

    // Поиск товаров
    async searchProducts(query) {
        return this.getProducts({ search: query, active: true });
    }

    // Обновление данных (для админ-панели)
    async updateProducts(products) {
        try {
            // В реальном приложении здесь будет вызов API для обновления
            console.log('Products update requested:', products);
            window.dispatchEvent(new CustomEvent('productsDataUpdated'));
        } catch (error) {
            console.error('Error updating products:', error);
            throw error;
        }
    }

    async updateSections(sections) {
        try {
            // В реальном приложении здесь будет вызов API для обновления
            console.log('Sections update requested:', sections);
            window.dispatchEvent(new CustomEvent('sectionsDataUpdated'));
        } catch (error) {
            console.error('Error updating sections:', error);
            throw error;
        }
    }

    // Проверка доступности сервера
    async checkHealth() {
        return await this.checkServerConnection();
    }
}

// Создаем глобальный экземпляр
window.dataManager = new DataManager();