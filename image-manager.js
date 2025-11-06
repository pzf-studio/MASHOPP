// image-manager.js - Менеджер изображений для магазина
class ImageManager {
    constructor() {
        this.storageKey = 'ma_furniture_images';
        this.images = this.loadImages();
    }

    // Загрузка изображений из localStorage
    loadImages() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || {};
        } catch (error) {
            console.error('Error loading images:', error);
            return {};
        }
    }

    // Сохранение изображений в localStorage
    saveImages() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.images));
            return true;
        } catch (error) {
            console.error('Error saving images:', error);
            return false;
        }
    }

    // Сохранение изображения по артикулу
    saveImage(sku, imageData) {
        try {
            // Если изображение слишком большое, сжимаем его
            if (imageData && imageData.length > 50000) {
                console.log(`Compressing image for SKU: ${sku}, original size: ${imageData.length}`);
                // Для простоты просто обрезаем очень большие изображения
                // В реальном приложении здесь должна быть настоящая компрессия
                if (imageData.length > 100000) {
                    console.warn('Image too large, skipping:', sku);
                    return false;
                }
            }
            
            this.images[sku] = imageData;
            const success = this.saveImages();
            if (success) {
                console.log(`Image saved for SKU: ${sku}`);
            }
            return success;
        } catch (error) {
            console.error('Error saving image for SKU:', sku, error);
            return false;
        }
    }

    // Получение изображения по артикулу
    getImage(sku) {
        const image = this.images[sku];
        if (image) {
            console.log(`Image loaded for SKU: ${sku}`);
        }
        return image || null;
    }

    // Удаление изображения
    removeImage(sku) {
        delete this.images[sku];
        return this.saveImages();
    }

    // Пакетное сохранение изображений товара
    saveProductImages(product) {
        if (!product.sku || !product.images || !product.images.length) {
            console.warn('No SKU or images for product:', product.id);
            return false;
        }

        let savedCount = 0;
        product.images.forEach((image, index) => {
            if (this.saveImage(`${product.sku}_${index}`, image)) {
                savedCount++;
            }
        });
        
        console.log(`Saved ${savedCount} images for product SKU: ${product.sku}`);
        return savedCount > 0;
    }

    // Получение всех изображений товара
    getProductImages(product) {
        if (!product.sku) {
            console.warn('No SKU for product:', product.id);
            return [];
        }
        
        const images = [];
        let index = 0;
        
        while (true) {
            const image = this.getImage(`${product.sku}_${index}`);
            if (image) {
                images.push(image);
                index++;
            } else {
                break;
            }
        }
        
        console.log(`Loaded ${images.length} images for product SKU: ${product.sku}`);
        return images;
    }

    // Получение первого изображения товара (для корзины)
    getProductFirstImage(product) {
        if (!product.sku) {
            return product.images && product.images.length > 0 ? product.images[0] : null;
        }
        
        const image = this.getImage(`${product.sku}_0`);
        return image || (product.images && product.images.length > 0 ? product.images[0] : null);
    }

    // Очистка неиспользуемых изображений
    cleanupUnusedImages(usedSkus) {
        const usedKeys = new Set();
        
        // Собираем все используемые ключи
        usedSkus.forEach(sku => {
            let index = 0;
            while (this.images[`${sku}_${index}`]) {
                usedKeys.add(`${sku}_${index}`);
                index++;
            }
        });
        
        // Удаляем неиспользуемые изображения
        let removedCount = 0;
        Object.keys(this.images).forEach(key => {
            if (!usedKeys.has(key)) {
                delete this.images[key];
                removedCount++;
            }
        });
        
        const success = this.saveImages();
        console.log(`Cleaned up ${removedCount} unused images`);
        return success;
    }

    // Получение статистики
    getStats() {
        const totalImages = Object.keys(this.images).length;
        let totalSize = 0;
        
        Object.values(this.images).forEach(image => {
            if (image && typeof image === 'string') {
                totalSize += image.length;
            }
        });
        
        return {
            totalImages,
            totalSize: Math.round(totalSize / 1024) + ' KB'
        };
    }
}

// Глобальный экземпляр
window.imageManager = new ImageManager();

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('ImageManager initialized', window.imageManager.getStats());
});