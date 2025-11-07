// shop-init.js - Инициализация магазина
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing shop...');
    
    // Ждем инициализации всех менеджеров
    const initShop = () => {
        if (window.dataManager && window.cartSystem) {
            console.log('All managers initialized, starting shop...');
            window.shopApp = new ShopApp();
        } else {
            console.log('Waiting for managers...');
            setTimeout(initShop, 100);
        }
    };
    
    initShop();
});