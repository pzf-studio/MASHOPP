export class PriceFormatter {
    static format(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }
}

export class NotificationManager {
    static show(message, type = 'success') {
        this.removeExisting();
        const notification = this.createNotification(message, type);
        document.body.appendChild(notification);
        this.animateNotification(notification);
    }

    static removeExisting() {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
    }

    static createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = this.createNotificationContent(message, type);
        return notification;
    }

    static createNotificationContent(message, type) {
        const icon = type === 'success' ? 'check' : 'exclamation';
        return `
            <div class="notification-content">
                <i class="fas fa-${icon}-circle"></i>
                ${message}
            </div>
        `;
    }

    static animateNotification(notification) {
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => this.removeNotification(notification), 3000);
    }

    static removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }
}