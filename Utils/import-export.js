// Utils/import-export.js - Система импорта/экспорта данных
class ImportExportManager {
    constructor() {
        this.supportedFormats = ['json', 'csv'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    // Экспорт данных в JSON
    exportToJSON(dataType = 'all') {
        try {
            let data = {};
            
            switch (dataType) {
                case 'products':
                    data.products = JSON.parse(localStorage.getItem('products') || '[]');
                    break;
                case 'sections':
                    data.sections = JSON.parse(localStorage.getItem('sections') || '[]');
                    break;
                case 'images':
                    data.images = JSON.parse(localStorage.getItem('ma_furniture_images') || '{}');
                    break;
                case 'cart':
                    data.cart = JSON.parse(localStorage.getItem('ma_furniture_cart') || '[]');
                    break;
                case 'all':
                default:
                    data.products = JSON.parse(localStorage.getItem('products') || '[]');
                    data.sections = JSON.parse(localStorage.getItem('sections') || '[]');
                    data.images = JSON.parse(localStorage.getItem('ma_furniture_images') || '{}');
                    data.cart = JSON.parse(localStorage.getItem('ma_furniture_cart') || '[]');
                    break;
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            this.downloadFile(url, `ma_furniture_${dataType}_${this.getTimestamp()}.json`);
            URL.revokeObjectURL(url);
            
            console.log(`Exported ${dataType} data successfully`);
            return true;
        } catch (error) {
            console.error('Export error:', error);
            return false;
        }
    }

    // Импорт данных из JSON
    async importFromJSON(file, options = {}) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            if (file.size > this.maxFileSize) {
                reject(new Error('File size too large'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.processImportedData(data, options);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid JSON file'));
                }
            };
            
            reader.onerror = () => reject(new Error('File reading error'));
            reader.readAsText(file);
        });
    }

    // Обработка импортированных данных
    processImportedData(data, options = {}) {
        const {
            mergeProducts = true,
            mergeSections = true,
            overwriteImages = false,
            backupBeforeImport = true
        } = options;

        // Создаем резервную копию
        if (backupBeforeImport) {
            this.exportToJSON('backup_' + this.getTimestamp());
        }

        try {
            // Импорт товаров
            if (data.products && Array.isArray(data.products)) {
                this.importProducts(data.products, mergeProducts);
            }

            // Импорт разделов
            if (data.sections && Array.isArray(data.sections)) {
                this.importSections(data.sections, mergeSections);
            }

            // Импорт изображений
            if (data.images && typeof data.images === 'object') {
                this.importImages(data.images, overwriteImages);
            }

            // Импорт корзины
            if (data.cart && Array.isArray(data.cart)) {
                this.importCart(data.cart);
            }

            console.log('Data imported successfully');
            this.showNotification('Данные успешно импортированы', 'success');
            
            // Обновляем страницу
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Import processing error:', error);
            this.showNotification('Ошибка импорта данных', 'error');
        }
    }

    // Импорт товаров
    importProducts(products, merge = true) {
        let existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
        
        if (merge) {
            // Объединяем товары, обновляя существующие и добавляя новые
            const existingIds = new Set(existingProducts.map(p => p.id));
            
            products.forEach(newProduct => {
                const existingIndex = existingProducts.findIndex(p => p.id === newProduct.id);
                if (existingIndex !== -1) {
                    // Обновляем существующий товар
                    existingProducts[existingIndex] = {
                        ...existingProducts[existingIndex],
                        ...newProduct,
                        updatedAt: new Date().toISOString()
                    };
                } else {
                    // Добавляем новый товар
                    existingProducts.push({
                        ...newProduct,
                        createdAt: newProduct.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }
            });
        } else {
            // Заменяем все товары
            existingProducts = products.map(product => ({
                ...product,
                createdAt: product.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
        }

        localStorage.setItem('products', JSON.stringify(existingProducts));
        console.log(`Imported ${products.length} products`);
    }

    // Импорт разделов
    importSections(sections, merge = true) {
        let existingSections = JSON.parse(localStorage.getItem('sections') || '[]');
        
        if (merge) {
            const existingIds = new Set(existingSections.map(s => s.id));
            
            sections.forEach(newSection => {
                const existingIndex = existingSections.findIndex(s => s.id === newSection.id);
                if (existingIndex !== -1) {
                    existingSections[existingIndex] = {
                        ...existingSections[existingIndex],
                        ...newSection
                    };
                } else {
                    existingSections.push(newSection);
                }
            });
        } else {
            existingSections = sections;
        }

        localStorage.setItem('sections', JSON.stringify(existingSections));
        console.log(`Imported ${sections.length} sections`);
    }

    // Импорт изображений
    importImages(images, overwrite = false) {
        let existingImages = JSON.parse(localStorage.getItem('ma_furniture_images') || '{}');
        
        if (overwrite) {
            existingImages = { ...images };
        } else {
            existingImages = { ...existingImages, ...images };
        }

        localStorage.setItem('ma_furniture_images', JSON.stringify(existingImages));
        console.log(`Imported ${Object.keys(images).length} images`);
    }

    // Импорт корзины
    importCart(cart) {
        localStorage.setItem('ma_furniture_cart', JSON.stringify(cart));
        console.log(`Imported cart with ${cart.length} items`);
    }

    // Скачивание файла
    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Получение временной метки
    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }

    // Показ уведомлений
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

    // Валидация данных перед импортом
    validateImportData(data) {
        const errors = [];

        if (data.products && !Array.isArray(data.products)) {
            errors.push('Products data must be an array');
        }

        if (data.sections && !Array.isArray(data.sections)) {
            errors.push('Sections data must be an array');
        }

        if (data.images && typeof data.images !== 'object') {
            errors.push('Images data must be an object');
        }

        if (data.cart && !Array.isArray(data.cart)) {
            errors.push('Cart data must be an array');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Получение статистики данных
    getDataStats() {
        return {
            products: (JSON.parse(localStorage.getItem('products') || '[]')).length,
            sections: (JSON.parse(localStorage.getItem('sections') || '[]')).length,
            images: Object.keys(JSON.parse(localStorage.getItem('ma_furniture_images') || '{}')).length,
            cart: (JSON.parse(localStorage.getItem('ma_furniture_cart') || '[]')).length
        };
    }
}

// Глобальный экземпляр
window.importExportManager = new ImportExportManager();