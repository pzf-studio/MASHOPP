// admin.js - Основная логика админ-панели MA Furniture
class AdminPanel {
    constructor() {
        // 🔐 Проверка авторизации
        if (!adminAuth.validateSession()) {
            window.location.href = 'admin-login.html';
            return;
        }

        this.products = [];
        this.sections = [];
        this.currentProductId = null;
        this.currentSectionId = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.renderProducts();
        this.renderSections();
        this.hideLoading();
        console.log('Admin panel initialized');
    }

    hideLoading() {
        const loadingElement = document.getElementById('pageLoading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    // 🔐 Уведомления
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    setupEventListeners() {
        // Табы
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Кнопка добавления товара
        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            this.openProductModal();
        });

        // Кнопка добавления раздела
        document.getElementById('addSectionBtn')?.addEventListener('click', () => {
            this.openSectionModal();
        });

        // Кнопка обновления
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadData();
        });

        // Закрытие модальных окон
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

        // Форма товара
        document.getElementById('productForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Форма раздела
        document.getElementById('sectionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSection();
        });

        // Выбор бейджа
        document.querySelectorAll('.badge-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('productBadge').value = option.dataset.badge;
            });
        });

        // Загрузка изображений
        document.getElementById('uploadImagesBtn')?.addEventListener('click', () => {
            document.getElementById('productImages').click();
        });

        document.getElementById('productImages')?.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });

        // Подтверждение удаления
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

    switchTab(tabName) {
        // Скрыть все табы
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Показать выбранный таб
        document.getElementById(tabName + 'Tab')?.classList.add('active');
        
        // Обновить активную кнопку таба
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    }

    async loadData() {
        try {
            // Загрузка из localStorage
            this.products = JSON.parse(localStorage.getItem('adminProducts')) || [];
            this.sections = JSON.parse(localStorage.getItem('adminSections')) || [];

            // Если разделов нет, создаем базовые
            if (this.sections.length === 0) {
                this.sections = [
                    { id: 1, name: 'Классические', code: 'classic', product_count: 0, active: true },
                    { id: 2, name: 'Современные', code: 'modern', product_count: 0, active: true },
                    { id: 3, name: 'Премиум', code: 'premium', product_count: 0, active: true }
                ];
                this.saveSections();
            }

            this.renderProducts();
            this.renderSections();
            
            this.showNotification('Данные загружены', 'success');
            
        } catch (error) {
            console.error('Load data error:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
        }
    }

    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        // Обновляем счетчик товаров в разделах
        this.updateSectionCounts();

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>
                    <div class="product-with-image">
                        ${product.images && product.images.length > 0 ? 
                            `<img src="${product.images[0]}" alt="${product.name}" class="product-image-small">` : 
                            '<div class="product-image-small" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;"><i class="fas fa-cube"></i></div>'
                        }
                        <div>${product.name}</div>
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
                        <button class="btn-edit" onclick="adminPanel.editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Изменить
                        </button>
                        <button class="btn-delete" onclick="adminPanel.deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                        <button class="btn-view" onclick="adminPanel.viewProduct(${product.id})">
                            <i class="fas fa-eye"></i> Просмотр
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Обновляем счетчик
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
                <td>${section.product_count}</td>
                <td>
                    <span class="status-badge ${section.active ? 'active' : 'inactive'}">
                        ${section.active ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td>
                    <div class="product-actions">
                        <button class="btn-edit" onclick="adminPanel.editSection(${section.id})">
                            <i class="fas fa-edit"></i> Изменить
                        </button>
                        <button class="btn-delete" onclick="adminPanel.deleteSection(${section.id})">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Обновляем счетчик разделов
        const counter = document.getElementById('sectionsCounter');
        if (counter) {
            counter.textContent = `Разделов: ${this.sections.length}`;
        }
    }

    updateSectionCounts() {
        this.sections.forEach(section => {
            section.product_count = this.products.filter(product => 
                product.section === section.code && product.active
            ).length;
        });
        this.saveSections();
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
        
        // Бейдж
        document.getElementById('productBadge').value = product.badge || '';
        document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector(`.badge-option[data-badge="${product.badge || ''}"]`).classList.add('selected');
        
        // Изображения
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
                <button type="button" class="remove-image" onclick="adminPanel.removeImage(${index})">
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

    saveProduct() {
        try {
            const formData = new FormData(document.getElementById('productForm'));
            const images = this.getCurrentImages();
            
            const productData = {
                id: this.currentProductId || this.generateProductId(),
                name: document.getElementById('productName').value,
                price: parseInt(document.getElementById('productPrice').value),
                category: document.getElementById('productCategory').value,
                section: document.getElementById('productSection').value,
                sku: document.getElementById('productSku').value,
                stock: parseInt(document.getElementById('productStock').value) || 0,
                description: document.getElementById('productDescription').value,
                features: this.parseFeatures(document.getElementById('productFeatures').value),
                specifications: this.parseSpecifications(document.getElementById('productSpecifications').value),
                badge: document.getElementById('productBadge').value,
                active: document.getElementById('productActive').checked,
                featured: document.getElementById('productFeatured').checked,
                images: images,
                updatedAt: new Date().toISOString()
            };

            if (!productData.name || !productData.price || !productData.category || !productData.section) {
                this.showNotification('Заполните все обязательные поля', 'error');
                return;
            }

            if (this.currentProductId) {
                // Редактирование
                const index = this.products.findIndex(p => p.id === this.currentProductId);
                if (index !== -1) {
                    productData.createdAt = this.products[index].createdAt;
                    this.products[index] = productData;
                    this.showNotification('Товар обновлен', 'success');
                }
            } else {
                // Добавление
                productData.createdAt = new Date().toISOString();
                this.products.push(productData);
                this.showNotification('Товар добавлен', 'success');
            }

            this.saveProducts();
            this.renderProducts();
            this.closeModal('productModal');
            this.notifyProductsUpdate();

        } catch (error) {
            console.error('Save product error:', error);
            this.showNotification('Ошибка сохранения товара', 'error');
        }
    }

    saveSection() {
        try {
            const sectionData = {
                id: this.currentSectionId || this.generateSectionId(),
                name: document.getElementById('sectionName').value,
                code: document.getElementById('sectionCode').value,
                active: document.getElementById('sectionActive').checked,
                product_count: 0
            };

            if (!sectionData.name || !sectionData.code) {
                this.showNotification('Заполните все поля', 'error');
                return;
            }

            // Проверка уникальности кода
            const existingSection = this.sections.find(s => 
                s.code === sectionData.code && s.id !== this.currentSectionId
            );
            if (existingSection) {
                this.showNotification('Раздел с таким кодом уже существует', 'error');
                return;
            }

            if (this.currentSectionId) {
                // Редактирование
                const index = this.sections.findIndex(s => s.id === this.currentSectionId);
                if (index !== -1) {
                    this.sections[index] = { ...this.sections[index], ...sectionData };
                    this.showNotification('Раздел обновлен', 'success');
                }
            } else {
                // Добавление
                this.sections.push(sectionData);
                this.showNotification('Раздел добавлен', 'success');
            }

            this.saveSections();
            this.renderSections();
            this.closeModal('sectionModal');
            this.notifySectionsUpdate(); // Уведомляем об обновлении разделов

        } catch (error) {
            console.error('Save section error:', error);
            this.showNotification('Ошибка сохранения раздела', 'error');
        }
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

    generateProductId() {
        const maxId = this.products.reduce((max, product) => Math.max(max, product.id), 0);
        return maxId + 1;
    }

    generateSectionId() {
        const maxId = this.sections.reduce((max, section) => Math.max(max, section.id), 0);
        return maxId + 1;
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

    deleteProduct(id) {
        this.productToDelete = id;
        const product = this.products.find(p => p.id === id);
        document.getElementById('confirmModal').classList.add('active');
    }

    deleteSection(id) {
        this.sectionToDelete = id;
        const section = this.sections.find(s => s.id === id);
        const message = document.getElementById('sectionConfirmMessage');
        message.textContent = `Вы уверены, что хотите удалить раздел "${section.name}"?`;
        document.getElementById('sectionConfirmModal').classList.add('active');
    }

    confirmDeleteProduct() {
        if (this.productToDelete) {
            this.products = this.products.filter(p => p.id !== this.productToDelete);
            this.saveProducts();
            this.renderProducts();
            this.showNotification('Товар удален', 'success');
            this.notifyProductsUpdate();
            this.productToDelete = null;
        }
        this.closeModal('confirmModal');
    }

    confirmDeleteSection() {
        if (this.sectionToDelete) {
            // Проверяем, есть ли товары в этом разделе
            const productsInSection = this.products.filter(p => {
                const section = this.sections.find(s => s.id === this.sectionToDelete);
                return section && p.section === section.code;
            });

            if (productsInSection.length > 0) {
                this.showNotification('Нельзя удалить раздел, в котором есть товары', 'error');
                this.closeModal('sectionConfirmModal');
                return;
            }

            this.sections = this.sections.filter(s => s.id !== this.sectionToDelete);
            this.saveSections();
            this.renderSections();
            this.notifySectionsUpdate(); // Уведомляем об обновлении разделов
            this.showNotification('Раздел удален', 'success');
            this.sectionToDelete = null;
        }
        this.closeModal('sectionConfirmModal');
    }

    viewProduct(id) {
        window.open(`piece.html?id=${id}`, '_blank');
    }

    saveProducts() {
        localStorage.setItem('adminProducts', JSON.stringify(this.products));
    }

    saveSections() {
        localStorage.setItem('adminSections', JSON.stringify(this.sections));
    }

    // 🔐 Уведомление об обновлении товаров (для синхронизации с магазином)
    notifyProductsUpdate() {
        // Отправляем кастомное событие
        const event = new CustomEvent('adminProductsUpdated');
        window.dispatchEvent(event);
        
        // Также обновляем localStorage для cross-tab синхронизации
        localStorage.setItem('adminProducts', JSON.stringify(this.products));
        
        console.log('Уведомление об обновлении товаров отправлено');
        this.showNotification('Изменения синхронизированы с магазином', 'success');
    }

    // 🔐 Уведомление об обновлении разделов
    notifySectionsUpdate() {
        // Отправляем кастомное событие
        const event = new CustomEvent('adminSectionsUpdated');
        window.dispatchEvent(event);
        
        // Также обновляем localStorage для cross-tab синхронизации
        localStorage.setItem('adminSections', JSON.stringify(this.sections));
        
        console.log('Уведомление об обновлении разделов отправлено');
        this.showNotification('Разделы синхронизированы с магазином', 'success');
    }
}

// Инициализация
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

// Глобальные функции для HTML
window.adminPanel = adminPanel;