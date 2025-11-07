// admin-db.js - Админ-панель с поддержкой базы данных
class AdminPanelDB {
    constructor() {
        this.API_BASE = 'http://localhost:3001/api';
        this.products = [];
        this.sections = [];
        this.currentProductId = null;
        this.currentSectionId = null;
        this.isServerConnected = false;
        this.productToDelete = null;
        this.sectionToDelete = null;
        this.init();
    }

    async init() {
        await this.checkServerConnection();
        this.setupEventListeners();
        if (this.isServerConnected) {
            await this.loadData();
        } else {
            await this.loadFromLocalStorage();
        }
        this.hideLoading();
        console.log('✅ Admin panel with DB support initialized');
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.API_BASE}/health`, { 
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) throw new Error('Server not responding');
            
            console.log('✅ Connected to database server');
            this.isServerConnected = true;
            return true;
        } catch (error) {
            console.warn('❌ Database server not available, using localStorage fallback');
            this.showNotification('Сервер базы данных недоступен. Используется локальное хранилище.', 'warning');
            this.isServerConnected = false;
            return false;
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('pageLoading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    async apiRequest(endpoint, options = {}) {
        try {
            if (!this.isServerConnected) {
                throw new Error('Server not available');
            }

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
            
            if (error.message.includes('Failed to fetch') || error.message === 'Server not available') {
                this.isServerConnected = false;
                this.showNotification('Сервер недоступен. Используется локальное хранилище.', 'warning');
                throw new Error('SERVER_UNAVAILABLE');
            }
            
            throw error;
        }
    }

    async loadData() {
        try {
            const [productsData, sectionsData] = await Promise.all([
                this.apiRequest('/products'),
                this.apiRequest('/sections')
            ]);

            this.products = productsData;
            this.sections = sectionsData;

            this.renderProducts();
            this.renderSections();
            
            const inactiveProducts = this.products.filter(p => !p.active).length;
            if (inactiveProducts > 0) {
                console.log(`Найдено ${inactiveProducts} неактивных товаров`);
            }
            
            this.showNotification('Данные загружены из базы данных', 'success');
            
        } catch (error) {
            if (error.message === 'SERVER_UNAVAILABLE') {
                await this.loadFromLocalStorage();
            } else {
                console.error('Load data error:', error);
                this.showNotification('Ошибка загрузки данных', 'error');
                await this.loadFromLocalStorage();
            }
        }
    }

    async loadFromLocalStorage() {
        try {
            this.products = JSON.parse(localStorage.getItem('adminProducts')) || [];
            this.sections = JSON.parse(localStorage.getItem('adminSections')) || [];
            this.renderProducts();
            this.renderSections();
            this.showNotification('Данные загружены из локального хранилища', 'warning');
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.products = [];
            this.sections = [];
            this.renderProducts();
            this.renderSections();
            this.showNotification('Ошибка загрузки данных из локального хранилища', 'error');
        }
    }

    async quickSearchBySKU(sku) {
        try {
            if (!sku.trim()) {
                this.showNotification('Введите артикул для поиска', 'warning');
                return null;
            }

            const product = await this.apiRequest(`/products/sku/${sku.trim()}`);
            this.showNotification(`Найден товар: ${product.name}`, 'success');
            return product;
        } catch (error) {
            if (error.message === 'SERVER_UNAVAILABLE') {
                const product = this.products.find(p => p.sku === sku.trim());
                if (product) {
                    this.showNotification(`Найден товар: ${product.name} (локально)`, 'success');
                    return product;
                } else {
                    this.showNotification('Товар с таким артикулом не найден', 'error');
                    return null;
                }
            } else {
                this.showNotification('Товар с таким артикулом не найден', 'error');
                return null;
            }
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            this.openProductModal();
        });

        document.getElementById('addSectionBtn')?.addEventListener('click', () => {
            this.openSectionModal();
        });

        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadData();
        });

        const quickSearchBtn = document.getElementById('quickSearchBtn');
        const quickSearchInput = document.getElementById('quickSearchInput');
        
        if (quickSearchBtn && quickSearchInput) {
            quickSearchBtn.addEventListener('click', () => {
                this.handleQuickSearch(quickSearchInput.value.trim());
            });
            
            quickSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleQuickSearch(quickSearchInput.value.trim());
                }
            });
        }

        document.getElementById('migrateDataBtn')?.addEventListener('click', () => {
            this.migrateDataToDB();
        });

        this.setupModalListeners();
    }

    setupModalListeners() {
        document.getElementById('modalClose')?.addEventListener('click', () => {
            this.closeModal('productModal');
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            this.closeModal('productModal');
        });

        document.getElementById('sectionModalClose')?.addEventListener('click', () => {
            this.closeModal('sectionModal');
        });

        document.getElementById('cancelSectionBtn')?.addEventListener('click', () => {
            this.closeModal('sectionModal');
        });

        document.getElementById('productForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        document.getElementById('sectionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSection();
        });

        document.querySelectorAll('.badge-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('productBadge').value = option.dataset.badge;
            });
        });

        document.getElementById('uploadImagesBtn')?.addEventListener('click', () => {
            document.getElementById('productImages').click();
        });

        document.getElementById('productImages')?.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });

        document.getElementById('confirmDelete')?.addEventListener('click', () => {
            this.confirmDeleteProduct();
        });

        document.getElementById('cancelDelete')?.addEventListener('click', () => {
            this.closeModal('confirmModal');
        });

        document.getElementById('confirmSectionDelete')?.addEventListener('click', () => {
            this.confirmDeleteSection();
        });

        document.getElementById('cancelSectionDelete')?.addEventListener('click', () => {
            this.closeModal('sectionConfirmModal');
        });
    }

    async handleQuickSearch(sku) {
        const product = await this.quickSearchBySKU(sku);
        if (product) {
            this.openProductModal(product);
        }
    }

    async migrateDataToDB() {
        try {
            const localProducts = JSON.parse(localStorage.getItem('adminProducts')) || [];
            const localSections = JSON.parse(localStorage.getItem('adminSections')) || [];
            
            if (localProducts.length === 0 && localSections.length === 0) {
                this.showNotification('Нет данных для миграции', 'warning');
                return;
            }

            const result = await this.apiRequest('/migrate-from-localstorage', {
                method: 'POST',
                body: JSON.stringify({
                    products: localProducts,
                    sections: localSections
                })
            });

            this.showNotification(`Мигрировано ${result.migratedProducts} товаров в базу данных`, 'success');
            await this.loadData();
            
        } catch (error) {
            if (error.message === 'SERVER_UNAVAILABLE') {
                this.showNotification('Сервер недоступен для миграции', 'error');
            } else {
                this.showNotification('Ошибка миграции данных', 'error');
            }
        }
    }

    async deleteSection(id) {
        this.sectionToDelete = id;
        const section = this.sections.find(s => s.id === id);
        const message = document.getElementById('sectionConfirmMessage');
        const warning = document.getElementById('sectionProductsWarning');
        
        if (section) {
            const productCount = this.getProductCountInSection(section.code);
            message.textContent = `Вы уверены, что хотите удалить раздел "${section.name}"?`;
            
            if (productCount > 0) {
                warning.style.display = 'block';
                warning.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Внимание:</strong> В разделе "${section.name}" находится ${productCount} товар(ов). 
                    После удаления раздела эти товары станут <strong>неактивными</strong> и будут скрыты из магазина.
                `;
            } else {
                warning.style.display = 'none';
            }
        }
        
        document.getElementById('sectionConfirmModal').classList.add('active');
    }

    async confirmDeleteSection() {
        if (this.sectionToDelete) {
            try {
                const section = this.sections.find(s => s.id === this.sectionToDelete);
                if (!section) {
                    this.showNotification('Раздел не найден', 'error');
                    return;
                }

                const response = await this.apiRequest(`/sections/${this.sectionToDelete}`, {
                    method: 'DELETE'
                });
                
                this.showNotification(`Раздел удален. ${response.affectedProducts || 0} товаров стало неактивными.`, 'success');
                await this.loadData();
                
            } catch (error) {
                if (error.message === 'SERVER_UNAVAILABLE') {
                    this.showNotification('Сервер недоступен. Удаление невозможно.', 'error');
                } else {
                    console.error('Delete section error:', error);
                    this.showNotification(`Ошибка удаления: ${error.message}`, 'error');
                }
            }
            
            this.sectionToDelete = null;
        }
        this.closeModal('sectionConfirmModal');
    }

    async saveProductToDB(formData) {
        try {
            if (!this.validateProductForm(formData)) {
                return;
            }

            const sectionExists = this.sections.some(s => s.code === formData.section && s.active);
            if (!sectionExists && formData.section) {
                this.showNotification('Выбранный раздел не существует или неактивен', 'warning');
                return;
            }

            let result;
            if (this.currentProductId) {
                result = await this.apiRequest(`/products/${this.currentProductId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                this.showNotification('Товар успешно обновлен', 'success');
            } else {
                result = await this.apiRequest('/products', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                this.showNotification('Товар успешно добавлен', 'success');
            }

            await this.loadData();
            this.closeModal('productModal');
            
        } catch (error) {
            if (error.message === 'SERVER_UNAVAILABLE') {
                this.showNotification('Сервер недоступен. Сохранение невозможно.', 'error');
            } else {
                console.error('Save product error:', error);
                this.showNotification(`Ошибка сохранения: ${error.message}`, 'error');
            }
        }
    }

    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>
                    <div class="product-with-image">
                        ${product.images && product.images.length > 0 ? 
                            `<img src="${product.images[0]}" alt="${product.name}" class="product-image-small">` : 
                            '<div class="product-image-small" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;"><i class="fas fa-cube"></i></div>'
                        }
                        <div>
                            <strong>${product.name}</strong>
                            <br><small>Артикул: ${product.sku}</small>
                        </div>
                    </div>
                </td>
                <td>${this.getCategoryName(product.category)}</td>
                <td>${this.getSectionName(product.section)}</td>
                <td>${product.price.toLocaleString()} ₽</td>
                <td>${product.badge || '-'}</td>
                <td>
                    <span class="status-badge ${product.active ? 'active' : 'inactive'}">
                        ${product.active ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td>
                    <div class="product-actions">
                        <button class="btn-edit" onclick="adminPanelDB.editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Изменить
                        </button>
                        <button class="btn-delete" onclick="adminPanelDB.deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                        <button class="btn-view" onclick="adminPanelDB.viewProduct(${product.id})">
                            <i class="fas fa-eye"></i> Просмотр
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        const counter = document.getElementById('productCounter');
        if (counter) {
            const activeCount = this.products.filter(p => p.active).length;
            counter.textContent = `Товаров: ${activeCount}/${this.products.length}`;
        }
    }

    renderSections() {
        const tbody = document.getElementById('sectionsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.sections.map(section => `
            <tr>
                <td>${section.id}</td>
                <td>${section.name}</td>
                <td>${section.code}</td>
                <td>${this.getProductCountInSection(section.code)}</td>
                <td>
                    <span class="status-badge ${section.active ? 'active' : 'inactive'}">
                        ${section.active ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td>
                    <div class="product-actions">
                        <button class="btn-edit" onclick="adminPanelDB.editSection(${section.id})">
                            <i class="fas fa-edit"></i> Изменить
                        </button>
                        <button class="btn-delete" onclick="adminPanelDB.deleteSection(${section.id})">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        const counter = document.getElementById('sectionsCounter');
        if (counter) {
            counter.textContent = `Разделов: ${this.sections.length}`;
        }
    }

    getProductCountInSection(sectionCode) {
        return this.products.filter(product => 
            product.section === sectionCode && product.active
        ).length;
    }

    getCategoryName(category) {
        const categories = {
            'pantograph': 'Пантографы',
            'wardrobe': 'Гардеробные системы',
            'premium': 'Премиум коллекция',
            'kitchen': 'Кухонные лифты'
        };
        return categories[category] || category;
    }

    getSectionName(sectionCode) {
        const section = this.sections.find(s => s.code === sectionCode);
        return section ? section.name : sectionCode;
    }

    async saveProduct() {
        try {
            const formData = this.getProductFormData();
            
            if (!this.validateProductForm(formData)) {
                return;
            }

            await this.saveProductToDB(formData);
            
        } catch (error) {
            console.error('Save product error:', error);
            this.showNotification(`Ошибка сохранения: ${error.message}`, 'error');
        }
    }

    getProductFormData() {
        const images = this.getCurrentImages();
        
        return {
            name: document.getElementById('productName').value,
            price: document.getElementById('productPrice').value,
            category: document.getElementById('productCategory').value,
            section: document.getElementById('productSection').value,
            sku: document.getElementById('productSku').value.trim(),
            stock: document.getElementById('productStock').value,
            description: document.getElementById('productDescription').value,
            features: this.parseFeatures(document.getElementById('productFeatures').value),
            specifications: this.parseSpecifications(document.getElementById('productSpecifications').value),
            badge: document.getElementById('productBadge').value,
            active: document.getElementById('productActive').checked,
            featured: document.getElementById('productFeatured').checked,
            images: images
        };
    }

    validateProductForm(formData) {
        if (!formData.name || !formData.price || !formData.category || !formData.section) {
            this.showNotification('Заполните все обязательные поля', 'error');
            return false;
        }
        return true;
    }

    async deleteProduct(id) {
        this.productToDelete = id;
        document.getElementById('confirmModal').classList.add('active');
    }

    async confirmDeleteProduct() {
        if (this.productToDelete) {
            try {
                await this.apiRequest(`/products/${this.productToDelete}`, {
                    method: 'DELETE'
                });
                
                await this.loadData();
                this.showNotification('Товар удален из базы данных', 'success');
                
            } catch (error) {
                if (error.message === 'SERVER_UNAVAILABLE') {
                    this.showNotification('Сервер недоступен. Удаление невозможно.', 'error');
                } else {
                    this.showNotification(`Ошибка удаления: ${error.message}`, 'error');
                }
            }
            
            this.productToDelete = null;
        }
        this.closeModal('confirmModal');
    }

    async saveSection() {
        try {
            const formData = {
                name: document.getElementById('sectionName').value,
                code: document.getElementById('sectionCode').value,
                active: document.getElementById('sectionActive').checked
            };

            if (!formData.name || !formData.code) {
                this.showNotification('Заполните все поля', 'error');
                return;
            }

            if (this.currentSectionId) {
                await this.apiRequest(`/sections/${this.currentSectionId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                await this.apiRequest('/sections', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }

            await this.loadData();
            this.closeModal('sectionModal');
            
        } catch (error) {
            if (error.message === 'SERVER_UNAVAILABLE') {
                this.showNotification('Сервер недоступен. Сохранение невозможно.', 'error');
            } else {
                console.error('Save section error:', error);
                this.showNotification(`Ошибка сохранения: ${error.message}`, 'error');
            }
        }
    }

    async updateProductsSection(oldSectionCode, newSectionCode = '') {
        try {
            const response = await this.apiRequest('/products/update-section', {
                method: 'POST',
                body: JSON.stringify({
                    oldSection: oldSectionCode,
                    newSection: newSectionCode
                })
            });
            
            return response.updatedCount;
        } catch (error) {
            console.error('Update products section error:', error);
            return 0;
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById(tabName + 'Tab')?.classList.add('active');
        
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    }

    openProductModal(product = null) {
        this.currentProductId = product ? product.id : null;
        const modal = document.getElementById('productModal');
        const title = document.getElementById('modalTitle');
        
        if (product) {
            title.textContent = 'Редактировать товар';
            this.fillProductForm(product);
        } else {
            title.textContent = 'Добавить товар';
            this.resetProductForm();
        }
        
        this.renderSectionOptions();
        modal.classList.add('active');
    }

    openSectionModal(section = null) {
        this.currentSectionId = section ? section.id : null;
        const modal = document.getElementById('sectionModal');
        const title = document.getElementById('sectionModalTitle');
        
        if (section) {
            title.textContent = 'Редактировать раздел';
            this.fillSectionForm(section);
        } else {
            title.textContent = 'Добавить раздел';
            this.resetSectionForm();
        }
        
        modal.classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        this.currentProductId = null;
        this.currentSectionId = null;
    }

    resetProductForm() {
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productBadge').value = '';
        document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector('.badge-option[data-badge=""]').classList.add('selected');
        document.getElementById('imagePreview').innerHTML = '';
    }

    resetSectionForm() {
        document.getElementById('sectionForm').reset();
        document.getElementById('sectionId').value = '';
    }

    fillProductForm(product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productSection').value = product.section;
        document.getElementById('productSku').value = product.sku || '';
        document.getElementById('productStock').value = product.stock || 0;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productFeatures').value = Array.isArray(product.features) ? 
            product.features.join('\n') : (product.features || '');
        document.getElementById('productSpecifications').value = typeof product.specifications === 'object' ? 
            Object.entries(product.specifications).map(([k, v]) => `${k}: ${v}`).join('\n') : 
            (product.specifications || '');
        document.getElementById('productActive').checked = product.active !== false;
        document.getElementById('productFeatured').checked = product.featured || false;
        
        document.getElementById('productBadge').value = product.badge || '';
        document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector(`.badge-option[data-badge="${product.badge || ''}"]`)?.classList.add('selected');
        
        this.renderImagePreview(product.images || []);
    }

    fillSectionForm(section) {
        document.getElementById('sectionId').value = section.id;
        document.getElementById('sectionName').value = section.name;
        document.getElementById('sectionCode').value = section.code;
        document.getElementById('sectionActive').checked = section.active !== false;
    }

    renderSectionOptions() {
        const select = document.getElementById('productSection');
        select.innerHTML = '<option value="">Выберите раздел</option>' +
            this.sections.filter(s => s.active).map(section => 
                `<option value="${section.code}">${section.name}</option>`
            ).join('');
    }

    renderImagePreview(images) {
        const container = document.getElementById('imagePreview');
        container.innerHTML = images.map((image, index) => `
            <div class="preview-item">
                <img src="${image}" alt="Preview ${index + 1}">
                <button type="button" class="remove-image" onclick="adminPanelDB.removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    handleImageUpload(files) {
        const images = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    images.push(e.target.result);
                    if (images.length === files.length) {
                        this.addImagesToPreview(images);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    }

    addImagesToPreview(newImages) {
        const container = document.getElementById('imagePreview');
        const currentImages = this.getCurrentImages();
        const allImages = [...currentImages, ...newImages];
        this.renderImagePreview(allImages);
    }

    removeImage(index) {
        const currentImages = this.getCurrentImages();
        currentImages.splice(index, 1);
        this.renderImagePreview(currentImages);
    }

    getCurrentImages() {
        const container = document.getElementById('imagePreview');
        return Array.from(container.querySelectorAll('img')).map(img => img.src);
    }

    parseFeatures(featuresText) {
        return featuresText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    parseSpecifications(specsText) {
        const specifications = {};
        const lines = specsText.split('\n');
        
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                specifications[key.trim()] = valueParts.join(':').trim();
            }
        });
        
        return specifications;
    }

    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            this.openProductModal(product);
        }
    }

    editSection(id) {
        const section = this.sections.find(s => s.id === id);
        if (section) {
            this.openSectionModal(section);
        }
    }

    viewProduct(id) {
        window.open(`piece.html?id=${id}`, '_blank');
    }
}

let adminPanelDB;
document.addEventListener('DOMContentLoaded', () => {
    adminPanelDB = new AdminPanelDB();
});

window.adminPanelDB = adminPanelDB;