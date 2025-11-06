document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            const isActive = item.classList.contains('active');
            
            // Закрываем все FAQ элементы
            faqItems.forEach(faqItem => {
                faqItem.classList.remove('active');
            });
            
            // Если кликнутый элемент не был активен - открываем его
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
});