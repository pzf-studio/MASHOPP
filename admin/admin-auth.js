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
        this.lockoutDuration = 30 * 60 * 1000;
    }

    checkSecurity() {
        const attempts = parseInt(localStorage.getItem('loginAttempts') || '0');
        const lastAttempt = parseInt(localStorage.getItem('lastLoginAttempt') || '0');
        const blockUntil = parseInt(localStorage.getItem('blockUntil') || '0');

        if (Date.now() - lastAttempt > 15 * 60 * 1000) {
            localStorage.setItem('loginAttempts', '0');
        }

        if (Date.now() < blockUntil) {
            const minutesLeft = Math.ceil((blockUntil - Date.now()) / (60 * 1000));
            return { 
                allowed: false, 
                message: `Слишком много попыток. Попробуйте через ${minutesLeft} минут.` 
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
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.testCredentials[username] === password;
    }
}

class SessionManager {
    constructor() {
        this.sessionDuration = 2 * 60 * 60 * 1000;
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

            if (Date.now() > session.expires) {
                this.clear();
                return false;
            }

            if (Date.now() - session.lastActivity > 15 * 60 * 1000) {
                this.clear();
                return false;
            }

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
        localStorage.removeItem('adminSession');
        SecurityLogger.logEvent('session_cleared');
    }
}

class AdminAuth {
    constructor() {
        this.security = new LoginSecurity();
        this.session = new SessionManager();
    }

    async authenticate(username, password) {
        const securityCheck = this.security.checkSecurity();
        if (!securityCheck.allowed) {
            throw new Error(securityCheck.message);
        }

        if (!InputValidator.validateUsername(username) || !InputValidator.validatePassword(password)) {
            this.security.recordFailedAttempt();
            return false;
        }

        const isValid = await CredentialManager.verify(username, password);

        if (isValid) {
            this.session.create(username);
            this.security.clearSecurityData();
            return true;
        } else {
            this.security.recordFailedAttempt();
            return false;
        }
    }

    validateSession() {
        return this.session.validate();
    }

    clearSession() {
        this.session.clear();
    }
}

const adminAuth = new AdminAuth();