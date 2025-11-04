// admin-auth.js - Система авторизации и безопасности для админ-панели
class SecurityLogger {
    static logEvent(eventType, details = {}) {
        const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
        logs.unshift({
            timestamp: new Date().toISOString(),
            event: eventType,
            details: details,
            userAgent: navigator.userAgent
        });

        if (logs.length > 100) logs.pop();
        localStorage.setItem('securityLogs', JSON.stringify(logs));
    }

    static getLogs() {
        return JSON.parse(localStorage.getItem('securityLogs') || '[]');
    }
}

class LoginSecurity {
    constructor() {
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 30 * 60 * 1000; // 30 минут
    }

    checkLoginSecurity() {
        const attempts = parseInt(localStorage.getItem('loginAttempts') || '0');
        const lastAttempt = parseInt(localStorage.getItem('lastLoginAttempt') || '0');
        const blockUntil = parseInt(localStorage.getItem('blockUntil') || '0');

        // Сбрасываем попытки если прошло больше 15 минут
        if (Date.now() - lastAttempt > 15 * 60 * 1000) {
            localStorage.setItem('loginAttempts', '0');
        }

        // Проверяем блокировку
        if (Date.now() < blockUntil) {
            const minutesLeft = Math.ceil((blockUntil - Date.now()) / (60 * 1000));
            return { 
                allowed: false, 
                message: `Слишком много попыток входа. Попробуйте через ${minutesLeft} минут.` 
            };
        }

        return { 
            allowed: attempts < this.maxLoginAttempts,
            attemptsLeft: this.maxLoginAttempts - attempts
        };
    }

    recordFailedAttempt() {
        const attempts = parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
        localStorage.setItem('loginAttempts', attempts.toString());
        localStorage.setItem('lastLoginAttempt', Date.now().toString());

        if (attempts >= this.maxLoginAttempts) {
            const blockUntil = Date.now() + this.lockoutDuration;
            localStorage.setItem('blockUntil', blockUntil.toString());
            SecurityLogger.logEvent('account_blocked', { blockUntil });
        }
    }

    clearSecurityData() {
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lastLoginAttempt');
        localStorage.removeItem('blockUntil');
    }
}

class InputValidator {
    static validateUsername(username) {
        if (typeof username !== 'string') return false;
        if (username.length > 100) return false;
        if (/[<>{}]/.test(username)) return false;
        return true;
    }

    static validatePassword(password) {
        return typeof password === 'string' && password.length > 0 && password.length <= 100;
    }
}

class CredentialManager {
    static testCredentials = {
        'admin': 'admin123',
        'maf_admin': 'password'
    };

    static async verify(username, password) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Имитация задержки
        return this.testCredentials[username] === password;
    }
}

class SessionManager {
    constructor() {
        this.sessionDuration = 2 * 60 * 60 * 1000; // 2 часа
    }

    create(username) {
        const session = {
            username: username,
            expires: Date.now() + this.sessionDuration,
            createdAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
            lastActivity: Date.now()
        };

        localStorage.setItem('adminSession', JSON.stringify(session));
        SecurityLogger.logEvent('session_created', { user: username });
    }

    validate() {
        try {
            const session = this.get();
            if (!session) return false;

            // Проверка времени жизни сессии
            if (Date.now() > session.expires) {
                this.clear();
                return false;
            }

            // Проверка неактивности (15 минут)
            if (Date.now() - session.lastActivity > 15 * 60 * 1000) {
                this.clear();
                return false;
            }

            // Обновляем время последней активности
            session.lastActivity = Date.now();
            localStorage.setItem('adminSession', JSON.stringify(session));

            return true;

        } catch (error) {
            this.clear();
            return false;
        }
    }

    get() {
        try {
            return JSON.parse(localStorage.getItem('adminSession'));
        } catch (error) {
            return null;
        }
    }

    clear() {
        const session = this.get();
        if (session) {
            SecurityLogger.logEvent('session_cleared', { user: session.username });
        }
        localStorage.removeItem('adminSession');
    }
}

class AdminAuth {
    constructor() {
        this.security = new LoginSecurity();
        this.session = new SessionManager();
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadUser();
    }

    async authenticate(username, password) {
        // Проверка безопасности
        const securityCheck = this.security.checkLoginSecurity();
        if (!securityCheck.allowed) {
            throw new Error(securityCheck.message);
        }

        // Валидация ввода
        if (!InputValidator.validateUsername(username) || !InputValidator.validatePassword(password)) {
            this.security.recordFailedAttempt();
            SecurityLogger.logEvent('invalid_input', { username: username });
            return false;
        }

        // Проверка учетных данных
        const isValid = await CredentialManager.verify(username, password);

        if (isValid) {
            this.session.create(username);
            this.security.clearSecurityData();
            SecurityLogger.logEvent('login_success', { username: username });
            return true;
        } else {
            this.security.recordFailedAttempt();
            SecurityLogger.logEvent('login_failed', { username: username });
            return false;
        }
    }

    validateSession() {
        return this.session.validate();
    }

    clearSession() {
        this.session.clear();
        this.currentUser = null;
    }

    getCurrentUser() {
        if (!this.validateSession()) {
            return null;
        }
        
        if (!this.currentUser) {
            const session = this.session.get();
            if (session) {
                this.currentUser = {
                    username: session.username,
                    loginTime: session.createdAt
                };
            }
        }
        
        return this.currentUser;
    }

    loadUser() {
        if (this.validateSession()) {
            this.currentUser = this.getCurrentUser();
        }
    }

    // 🔐 Метод для проверки безопасности при входе (используется в admin-login.html)
    checkLoginSecurity() {
        return this.security.checkLoginSecurity();
    }

    // 🔐 Метод для сброса данных безопасности (при успешном входе)
    clearSecurityData() {
        this.security.clearSecurityData();
    }
}

// Создаем глобальный экземпляр
const adminAuth = new AdminAuth();
window.adminAuth = adminAuth;