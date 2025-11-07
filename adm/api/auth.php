<?php
// api/auth.php - Бэкенд аутентификация
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

session_start();

class AuthAPI {
    private $db;
    private $secret_key = "your-secret-key-here";
    
    public function __construct() {
        $this->connectDB();
        $this->setupRateLimiting();
    }
    
    private function connectDB() {
        // Подключение к базе данных
        try {
            $this->db = new PDO("mysql:host=localhost;dbname=ma_furniture", "username", "password");
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $e) {
            $this->sendError("Database connection failed");
        }
    }
    
    private function setupRateLimiting() {
        $ip = $this->getClientIP();
        $key = "rate_limit_" . $ip;
        
        if (!isset($_SESSION[$key])) {
            $_SESSION[$key] = ['count' => 0, 'reset' => time() + 3600];
        }
        
        if (time() > $_SESSION[$key]['reset']) {
            $_SESSION[$key] = ['count' => 0, 'reset' => time() + 3600];
        }
        
        if ($_SESSION[$key]['count'] > 10) {
            $this->sendError("Rate limit exceeded");
        }
        
        $_SESSION[$key]['count']++;
    }
    
    public function handleRequest() {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        switch($action) {
            case 'login':
                $this->login($input);
                break;
            case 'verify':
                $this->verifyToken($input);
                break;
            case 'logout':
                $this->logout();
                break;
            default:
                $this->sendError("Invalid action");
        }
    }
    
    private function login($data) {
        $username = $this->sanitizeInput($data['username'] ?? '');
        $password = $data['password'] ?? '';
        
        // Валидация
        if (empty($username) || empty($password)) {
            $this->sendError("Username and password required");
        }
        
        // Поиск пользователя
        $stmt = $this->db->prepare("SELECT * FROM admin_users WHERE username = ? AND active = 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->logFailedAttempt($username);
            $this->sendError("Invalid credentials");
        }
        
        // Генерация токена
        $token = $this->generateToken($user);
        
        $this->sendSuccess([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ]
        ]);
    }
    
    private function generateToken($user) {
        $payload = [
            'user_id' => $user['id'],
            'username' => $user['username'],
            'exp' => time() + 7200 // 2 часа
        ];
        
        return JWT::encode($payload, $this->secret_key);
    }
    
    private function verifyToken($data) {
        $token = $data['token'] ?? '';
        
        try {
            $payload = JWT::decode($token, $this->secret_key);
            $this->sendSuccess(['valid' => true, 'user' => (array)$payload]);
        } catch (Exception $e) {
            $this->sendError("Invalid token");
        }
    }
    
    private function logFailedAttempt($username) {
        $ip = $this->getClientIP();
        $stmt = $this->db->prepare("INSERT INTO login_attempts (username, ip_address, attempted_at) VALUES (?, ?, NOW())");
        $stmt->execute([$username, $ip]);
    }
    
    private function sanitizeInput($input) {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }
    
    private function getClientIP() {
        return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
    private function sendSuccess($data) {
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    private function sendError($message) {
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
}

// JWT класс (упрощенный)
class JWT {
    public static function encode($payload, $key) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode($payload);
        
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $key, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }
    
    public static function decode($jwt, $key) {
        $parts = explode('.', $jwt);
        if (count($parts) != 3) {
            throw new Exception('Invalid token format');
        }
        
        list($header, $payload, $signature) = $parts;
        
        $validSignature = hash_hmac('sha256', $header . "." . $payload, $key, true);
        $validSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));
        
        if ($signature !== $validSignature) {
            throw new Exception('Invalid signature');
        }
        
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            throw new Exception('Token expired');
        }
        
        return $payload;
    }
}

// Запуск API
$api = new AuthAPI();
$api->handleRequest();
?>