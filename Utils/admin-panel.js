// Utils/admin-panel.js - Панель администратора для управления данными
class AdminPanel {
    constructor() {
        this.currentView = 'products';
        this.currentProduct = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialView();
        this.setupImageUpload();
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Кнопки действий
        document.getElementById('addProductBtn')?.addEventListener('click', () => this.showProductForm());
        document.getElementById('importBtn')?.addEventListener('click', () => this.showImportModal());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());
        document.getElementById('saveProductBtn')?.addEventListener('click', () => this.saveProduct());
        document.getElementById('cancelProductBtn')?.addEventListener('click', () => this.hideProductForm());
        document.getElementById('importConfirmBtn')?.addEventListener('click', () => this.handleImport());
        document.getElementById('importCancelBtn')?.addEventListener('click', () => this.hideImportModal());
    }

    setupImageUpload() {
        const imageUpload = document.getElementById('productImages');
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Обновляем активную ссылку
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-view') === view);
        });

        // Показываем соответствующую секцию
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.toggle('active', section.id === `${view}Section`);
        });

        // Загружаем данные для выбранного представления
        this.loadViewData(view);
    }

    loadInitialView() {
        this.switchView('products');
    }

    loadViewData(view) {
        switch (view) {
            case 'products':
                this.loadProducts();
                break;
            case 'sections':
                this.loadSections();
                break;
            case 'images':
                this.loadImages();
                break;
            case 'stats':
                this.loadStats();
                break;
        }
    }

    // УПРАВЛЕНИЕ ТОВАРАМИ
    loadProducts() {
        const products = window.dataManager.getProducts();
        const tbody = document.querySelector('#productsSection tbody');
        
        if (!tbody) return;

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.category || '-'}</td>
                <td>${product.price ? this.formatPrice(product.price) : '-'}</td>
                <td>${product.active ? 'Да' : 'Нет'}</td>
                <td>
                    <button class="btn btn-sm btn-edit" onclick="adminPanel.editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="adminPanel.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    showProductForm(product = null) {
        this.currentProduct = product;
        const form = document.getElementById('productForm');
        const title = document.getElementById('productFormTitle');
        
        if (product) {
            title.textContent = 'Редактировать товар';
            this.populateProductForm(product);
        } else {
            title.textContent = 'Добавить товар';
            this.clearProductForm();
        }
        
        form.classList.add('active');
    }

    hideProductForm() {
        document.getElementById('productForm').classList.remove('active');
        this.currentProduct = null;
    }

    populateProductForm(product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productSku').value = product.sku || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productActive').checked = product.active !== false;
        document.getElementById('productFeatured').checked = product.featured || false;

        // Загрузка изображений
        this.loadProductImages(product);
    }

    clearProductForm() {
        document.getElementById('productForm').reset();
        document.getElementById('productImagesPreview').innerHTML = '';
        document.getElementById('productId').value = '';
    }

    loadProductImages(product) {
        const preview = document.getElementById('productImagesPreview');
        preview.innerHTML = '';

        if (product.images && product.images.length > 0) {
            product.images.forEach((image, index) => {
                const imgElement = document.createElement('div');
                imgElement.className = 'image-preview-item';
                imgElement.innerHTML = `
                    <img src="${image}" alt="Изображение ${index + 1}">
                    <button type="button" class="remove-image" onclick="adminPanel.removeProductImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(imgElement);
            });
        }
    }

    async saveProduct() {
        const formData = this.getProductFormData();
        
        if (!this.validateProductForm(formData)) {
            this.showNotification('Заполните обязательные поля', 'error');
            return;
        }

        try {
            const products = window.dataManager.getProducts();
            let updatedProducts;

            if (this.currentProduct) {
                // Обновление существующего товара
                updatedProducts = products.map(p => 
                    p.id === this.currentProduct.id 
                        ? { ...p, ...formData, updatedAt: new Date().toISOString() }
                        : p
                );
            } else {
                // Добавление нового товара
                const newProduct = {
                    ...formData,
                    id: this.generateProductId(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                updatedProducts = [...products, newProduct];
            }

            window.dataManager.updateProducts(updatedProducts);
            
            // Сохраняем изображения в ImageManager
            if (formData.images && formData.images.length > 0 && formData.sku) {
                const productWithImages = updatedProducts.find(p => p.id === (this.currentProduct?.id || newProduct.id));
                if (productWithImages) {
                    window.imageManager.saveProductImages(productWithImages);
                }
            }

            this.hideProductForm();
            this.loadProducts();
            this.showNotification('Товар успешно сохранен', 'success');

        } catch (error) {
            console.error('Error saving product:', error);
            this.showNotification('Ошибка сохранения товара', 'error');
        }
    }

    getProductFormData() {
        return {
            name: document.getElementById('productName').value,
            sku: document.getElementById('productSku').value,
            category: document.getElementById('productCategory').value,
            price: parseInt(document.getElementById('productPrice').value) || 0,
            description: document.getElementById('productDescription').value,
            active: document.getElementById('productActive').checked,
            featured: document.getElementById('productFeatured').checked,
            images: this.getProductImages()
        };
    }

    getProductImages() {
        const preview = document.getElementById('productImagesPreview');
        const images = [];
        
        preview.querySelectorAll('img').forEach(img => {
            if (img.src && !img.src.includes('placeholder')) {
                images.push(img.src);
            }
        });
        
        return images;
    }

    validateProductForm(data) {
        return data.name && data.name.trim().length > 0;
    }

    generateProductId() {
        const products = window.dataManager.getProducts();
        return Math.max(0, ...products.map(p => p.id)) + 1;
    }

    editProduct(id) {
        const product = window.dataManager.getProductById(id);
        if (product) {
            this.showProductForm(product);
        }
    }

    deleteProduct(id) {
        if (confirm('Вы уверены, что хотите удалить этот товар?')) {
            const products = window.dataManager.getProducts();
            const updatedProducts = products.filter(p => p.id !== id);
            window.dataManager.updateProducts(updatedProducts);
            this.loadProducts();
            this.showNotification('Товар удален', 'success');
        }
    }

    // ЗАГРУЗКА ИЗОБРАЖЕНИЙ
    handleImageUpload(event) {
        const files = event.target.files;
        const preview = document.getElementById('productImagesPreview');
        
        for (let file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgElement = document.createElement('div');
                imgElement.className = 'image-preview-item';
                imgElement.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <button type="button" class="remove-image" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(imgElement);
            };
            reader.readAsDataURL(file);
        }
        
        // Очищаем input
        event.target.value = '';
    }

    removeProductImage(index) {
        if (this.currentProduct && this.currentProduct.images) {
            this.currentProduct.images.splice(index, 1);
            this.loadProductImages(this.currentProduct);
        }
    }

    // УПРАВЛЕНИЕ РАЗДЕЛАМИ
    loadSections() {
        const sections = window.dataManager.getSections();
        const tbody = document.querySelector('#sectionsSection tbody');
        
        if (!tbody) return;

        tbody.innerHTML = sections.map(section => `
            <tr>
                <td>${section.id}</td>
                <td>${section.name}</td>
                <td>${section.code}</td>
                <td>${section.product_count || 0}</td>
                <td>${section.active ? 'Да' : 'Нет'}</td>
                <td>
                    <button class="btn btn-sm btn-edit" onclick="adminPanel.editSection(${section.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // СТАТИСТИКА
    loadStats() {
        const stats = window.importExportManager.getDataStats();
        const imageStats = window.imageManager.getStats();
        
        document.getElementById('productsCount').textContent = stats.products;
        document.getElementById('sectionsCount').textContent = stats.sections;
        document.getElementById('imagesCount').textContent = stats.images;
        document.getElementById('cartItemsCount').textContent = stats.cart;
        document.getElementById('imagesSize').textContent = imageStats.totalSize;
        document.getElementById('totalImages').textContent = imageStats.totalImages;
    }

    // ИМПОРТ/ЭКСПОРТ
    showImportModal() {
        document.getElementById('importModal').classList.add('active');
    }

    hideImportModal() {
        document.getElementById('importModal').classList.remove('active');
    }

    async handleImport() {
        const fileInput = document.getElementById('importFile');
        const mergeData = document.getElementById('mergeData').checked;
        const overwriteImages = document.getElementById('overwriteImages').checked;
        
        if (!fileInput.files.length) {
            this.showNotification('Выберите файл для импорта', 'error');
            return;
        }

        try {
            await window.importExportManager.importFromJSON(fileInput.files[0], {
                mergeProducts: mergeData,
                mergeSections: mergeData,
                overwriteImages: overwriteImages
            });
            
            this.hideImportModal();
            this.loadViewData(this.currentView);
            
        } catch (error) {
            this.showNotification('Ошибка импорта: ' + error.message, 'error');
        }
    }

    exportData() {
        const dataType = document.getElementById('exportDataType').value;
        window.importExportManager.exportToJSON(dataType);
        this.showNotification('Данные экспортированы', 'success');
    }

    // УТИЛИТЫ
    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
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
}

// Глобальный экземпляр
window.adminPanel = new AdminPanel();