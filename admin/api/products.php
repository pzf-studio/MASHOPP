<?php
// api/products.php - Управление товарами
require_once 'auth.php';

class ProductsAPI extends AuthAPI {
    
    public function handleRequest() {
        // Проверка авторизации
        if (!$this->verifyAuth()) {
            $this->sendError("Unauthorized");
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        switch($action) {
            case 'get':
                $this->getProducts();
                break;
            case 'save':
                $this->saveProduct($input);
                break;
            case 'delete':
                $this->deleteProduct($input);
                break;
            case 'getSections':
                $this->getSections();
                break;
            default:
                $this->sendError("Invalid action");
        }
    }
    
    private function verifyAuth() {
        $headers = getallheaders();
        $token = str_replace('Bearer ', '', $headers['Authorization'] ?? '');
        
        try {
            $payload = JWT::decode($token, $this->secret_key);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    private function getProducts() {
        $stmt = $this->db->prepare("SELECT * FROM products ORDER BY id DESC");
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendSuccess(['products' => $products]);
    }
    
    private function saveProduct($data) {
        $product = $data['product'] ?? [];
        
        // Валидация
        $errors = $this->validateProduct($product);
        if (!empty($errors)) {
            $this->sendError(implode(', ', $errors));
        }
        
        if (isset($product['id'])) {
            $this->updateProduct($product);
        } else {
            $this->createProduct($product);
        }
    }
    
    private function validateProduct($product) {
        $errors = [];
        
        if (empty($product['name'])) {
            $errors[] = "Name is required";
        }
        
        if (!isset($product['price']) || $product['price'] < 0) {
            $errors[] = "Valid price is required";
        }
        
        // Защита от XSS
        foreach ($product as $key => $value) {
            if (is_string($value)) {
                $product[$key] = $this->sanitizeInput($value);
            }
        }
        
        return $errors;
    }
    
    private function createProduct($product) {
        $stmt = $this->db->prepare("
            INSERT INTO products (name, price, category, description, images, active, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $product['name'],
            $product['price'],
            $product['category'] ?? '',
            $product['description'] ?? '',
            json_encode($product['images'] ?? []),
            $product['active'] ?? 1
        ]);
        
        $this->sendSuccess(['message' => 'Product created', 'id' => $this->db->lastInsertId()]);
    }
    
    private function updateProduct($product) {
        $stmt = $this->db->prepare("
            UPDATE products SET 
            name = ?, price = ?, category = ?, description = ?, images = ?, active = ?, updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([
            $product['name'],
            $product['price'],
            $product['category'] ?? '',
            $product['description'] ?? '',
            json_encode($product['images'] ?? []),
            $product['active'] ?? 1,
            $product['id']
        ]);
        
        $this->sendSuccess(['message' => 'Product updated']);
    }
}

$api = new ProductsAPI();
$api->handleRequest();
?>