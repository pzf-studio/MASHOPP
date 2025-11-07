// server.js - Сервер для MA Furniture с базой данных (CommonJS)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - исправленный CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Обработка preflight запросов
app.options('*', cors());

// Настройка Multer для загрузки изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Инициализация базы данных
let db;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database('./mafurniture.db', (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');

      // Включаем foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Создание таблицы товаров
      db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sku TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          category TEXT NOT NULL,
          section TEXT NOT NULL,
          stock INTEGER DEFAULT 0,
          description TEXT,
          features TEXT,
          specifications TEXT,
          badge TEXT,
          active BOOLEAN DEFAULT 1,
          featured BOOLEAN DEFAULT 0,
          images TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating products table:', err);
          reject(err);
          return;
        }

        // Создание таблицы разделов
        db.exec(`
          CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating sections table:', err);
            reject(err);
            return;
          }

          // Создание индексов для оптимизации
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
            CREATE INDEX IF NOT EXISTS idx_products_section ON products(section);
            CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
            CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
            CREATE INDEX IF NOT EXISTS idx_sections_code ON sections(code);
            CREATE INDEX IF NOT EXISTS idx_sections_active ON sections(active);
          `, (err) => {
            if (err) {
              console.warn('⚠️ Warning creating indexes:', err);
            }

            // Добавляем тестовые разделы если их нет
            db.get('SELECT COUNT(*) as count FROM sections', (err, row) => {
              if (err) {
                console.warn('⚠️ Warning checking sections:', err);
                resolve();
                return;
              }

              if (row.count === 0) {
                const defaultSections = [
                  ['Классические', 'classic'],
                  ['Современные', 'modern'],
                  ['Премиум', 'premium'],
                  ['Эксклюзивные', 'exclusive']
                ];

                const stmt = db.prepare('INSERT OR IGNORE INTO sections (name, code) VALUES (?, ?)');
                defaultSections.forEach(([name, code]) => {
                  stmt.run(name, code);
                });
                stmt.finalize();
                console.log('✅ Default sections created');
              }

              // Добавляем тестовые товары если их нет
              db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
                if (err) {
                  console.warn('⚠️ Warning checking products:', err);
                  resolve();
                  return;
                }

                if (row.count === 0) {
                  const defaultProducts = [
                    {
                      sku: 'MF001',
                      name: 'Пантограф классический',
                      price: 15000,
                      category: 'pantograph',
                      section: 'classic',
                      description: 'Классический пантограф для гардеробной системы',
                      stock: 5,
                      features: JSON.stringify(['Выдвижная система', 'Плавный ход']),
                      specifications: JSON.stringify({ 'Материал': 'Сталь', 'Цвет': 'Хром' }),
                      badge: 'Новинка',
                      active: 1,
                      featured: 1,
                      images: JSON.stringify(['/images/placeholder.jpg'])
                    },
                    {
                      sku: 'MF002', 
                      name: 'Гардеробная система премиум',
                      price: 45000,
                      category: 'wardrobe',
                      section: 'premium',
                      description: 'Премиум гардеробная система с итальянской фурнитурой',
                      stock: 3,
                      features: JSON.stringify(['Итальянская фурнитура', 'Система мягкого закрывания']),
                      specifications: JSON.stringify({ 'Материал': 'Дуб', 'Цвет': 'Белый' }),
                      badge: 'Хит продаж',
                      active: 1,
                      featured: 1,
                      images: JSON.stringify(['/images/placeholder.jpg'])
                    }
                  ];

                  const stmt = db.prepare(`
                    INSERT INTO products (sku, name, price, category, section, stock, description, features, specifications, badge, active, featured, images)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `);
                  
                  defaultProducts.forEach(product => {
                    stmt.run(
                      product.sku,
                      product.name,
                      product.price,
                      product.category,
                      product.section,
                      product.stock,
                      product.description,
                      product.features,
                      product.specifications,
                      product.badge,
                      product.active,
                      product.featured,
                      product.images
                    );
                  });
                  stmt.finalize();
                  console.log('✅ Default products created');
                }

                console.log('✅ Database initialized successfully');
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

// 🔥 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function parseProduct(product) {
  if (!product) return null;
  
  return {
    ...product,
    features: product.features ? safeJSONParse(product.features, []) : [],
    specifications: product.specifications ? safeJSONParse(product.specifications, {}) : {},
    images: product.images ? safeJSONParse(product.images, []) : [],
    price: parseFloat(product.price),
    stock: parseInt(product.stock) || 0,
    active: Boolean(product.active),
    featured: Boolean(product.featured)
  };
}

function safeJSONParse(str, defaultValue) {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('JSON parse error:', error, 'for string:', str);
    return defaultValue;
  }
}

function validateProductData(productData) {
  const errors = [];
  
  if (!productData.name || productData.name.trim().length === 0) {
    errors.push('Product name is required');
  }
  
  if (!productData.price || isNaN(productData.price) || productData.price < 0) {
    errors.push('Valid price is required');
  }
  
  if (!productData.category || productData.category.trim().length === 0) {
    errors.push('Category is required');
  }
  
  if (!productData.sku || productData.sku.trim().length === 0) {
    errors.push('SKU is required');
  }
  
  return errors;
}

function generateSKU(productName) {
  const timestamp = Date.now().toString().slice(-6);
  const namePart = productName
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]/g, '')
    .slice(0, 3)
    .toUpperCase();
  
  return `MF${namePart}${timestamp}`;
}

// 🔥 API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MA Furniture DB Server is running',
    timestamp: new Date().toISOString(),
    database: 'SQLite',
    version: '1.0.0'
  });
});

// Получить все товары
app.get('/api/products', (req, res) => {
  const { category, section, active, featured, search, limit, offset } = req.query;
  
  let query = `SELECT * FROM products WHERE 1=1`;
  const params = [];

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  if (section) {
    query += ` AND section = ?`;
    params.push(section);
  }

  if (active !== undefined) {
    query += ` AND active = ?`;
    params.push(active === 'true');
  }

  if (featured !== undefined) {
    query += ` AND featured = ?`;
    params.push(featured === 'true');
  }

  if (search) {
    query += ` AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ` ORDER BY created_at DESC`;

  // Пагинация
  if (limit) {
    query += ` LIMIT ?`;
    params.push(parseInt(limit));
  }

  if (offset) {
    query += ` OFFSET ?`;
    params.push(parseInt(offset));
  }

  db.all(query, params, (err, products) => {
    if (err) {
      console.error('GET /api/products error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    const parsedProducts = products.map(parseProduct);
    res.json(parsedProducts);
  });
});

// 🔥 БЫСТРЫЙ ПОИСК ПО АРТИКУЛУ (ОСНОВНОЙ КЛЮЧ)
app.get('/api/products/sku/:sku', (req, res) => {
  const { sku } = req.params;
  
  if (!sku || sku.trim().length === 0) {
    return res.status(400).json({ error: 'SKU parameter is required' });
  }

  db.get('SELECT * FROM products WHERE sku = ?', [sku.trim()], (err, product) => {
    if (err) {
      console.error('GET /api/products/sku error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const parsedProduct = parseProduct(product);
    res.json(parsedProduct);
  });
});

// Получить товар по ID
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
    if (err) {
      console.error('GET /api/products/:id error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const parsedProduct = parseProduct(product);
    res.json(parsedProduct);
  });
});

// Создать товар
app.post('/api/products', upload.array('images', 10), (req, res) => {
  try {
    const {
      name, price, category, section, sku, stock, description,
      features, specifications, badge, active, featured
    } = req.body;

    // Валидация данных
    const validationErrors = validateProductData({ name, price, category, sku });
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }

    // Генерируем SKU если не предоставлен
    const finalSku = sku || generateSKU(name);
    
    // Обрабатываем загруженные изображения
    const imageUrls = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    db.run(
      `INSERT INTO products (
        sku, name, price, category, section, stock, description,
        features, specifications, badge, active, featured, images
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalSku, 
        name.trim(), 
        parseFloat(price), 
        category.trim(), 
        section.trim(), 
        parseInt(stock || 0), 
        description || '',
        JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : []),
        JSON.stringify(specifications || {}),
        badge || '',
        active === 'true', 
        featured === 'true', 
        JSON.stringify(imageUrls)
      ],
      function(err) {
        if (err) {
          console.error('POST /api/products error:', err);
          if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Product with this SKU already exists' });
          } else {
            res.status(500).json({ error: err.message });
          }
          return;
        }

        // Получаем созданный товар
        db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, newProduct) => {
          if (err) {
            console.error('Error fetching created product:', err);
            res.status(500).json({ error: err.message });
            return;
          }

          const parsedProduct = parseProduct(newProduct);
          res.status(201).json(parsedProduct);
        });
      }
    );
  } catch (error) {
    console.error('POST /api/products unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить товар
app.put('/api/products/:id', upload.array('images', 10), (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const {
      name, price, category, section, sku, stock, description,
      features, specifications, badge, active, featured
    } = req.body;

    // Валидация данных
    const validationErrors = validateProductData({ name, price, category, sku });
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }

    // Получаем текущий товар
    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, currentProduct) => {
      if (err) {
        console.error('Error fetching product for update:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!currentProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Обрабатываем изображения - сохраняем существующие если новые не загружены
      let imageUrls = currentProduct.images ? safeJSONParse(currentProduct.images, []) : [];
      
      // Если загружены новые изображения, заменяем старые
      if (req.files && req.files.length > 0) {
        // Удаляем старые файлы изображений
        imageUrls.forEach(imageUrl => {
          if (imageUrl.startsWith('/uploads/products/')) {
            const imagePath = path.join(__dirname, imageUrl);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
          }
        });
        
        // Сохраняем новые изображения
        imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
      }

      // Если раздел был сброшен (пустая строка), делаем товар неактивным
      const finalActive = (section === '' || section === null) ? 0 : (active === 'true' ? 1 : 0);

      db.run(
        `UPDATE products SET 
          sku = ?, name = ?, price = ?, category = ?, section = ?, stock = ?, description = ?,
          features = ?, specifications = ?, badge = ?, active = ?, featured = ?, images = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          sku || currentProduct.sku,
          name.trim(),
          parseFloat(price),
          category.trim(),
          section.trim(),
          parseInt(stock || currentProduct.stock || 0),
          description || currentProduct.description || '',
          JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : (currentProduct.features ? safeJSONParse(currentProduct.features, []) : [])),
          JSON.stringify(specifications || (currentProduct.specifications ? safeJSONParse(currentProduct.specifications, {}) : {})),
          badge || currentProduct.badge || '',
          finalActive,
          featured === 'true' ? 1 : 0,
          JSON.stringify(imageUrls),
          productId
        ],
        function(err) {
          if (err) {
            console.error('PUT /api/products/:id error:', err);
            res.status(500).json({ error: err.message });
            return;
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'Product not found or no changes made' });
          }

          // Получаем обновленный товар
          db.get('SELECT * FROM products WHERE id = ?', [productId], (err, updatedProduct) => {
            if (err) {
              console.error('Error fetching updated product:', err);
              res.status(500).json({ error: err.message });
              return;
            }

            const parsedProduct = parseProduct(updatedProduct);
            res.json(parsedProduct);
          });
        }
      );
    });
  } catch (error) {
    console.error('PUT /api/products/:id unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить товар
app.delete('/api/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  
  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) {
      console.error('Error fetching product for deletion:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Удаляем связанные изображения
    if (product.images) {
      const images = safeJSONParse(product.images, []);
      images.forEach(imageUrl => {
        if (imageUrl.startsWith('/uploads/products/')) {
          const imagePath = path.join(__dirname, imageUrl);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
      });
    }

    db.run('DELETE FROM products WHERE id = ?', [productId], (err) => {
      if (err) {
        console.error('DELETE /api/products/:id error:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ 
        message: 'Product deleted successfully',
        deletedSku: product.sku
      });
    });
  });
});

// API для разделов
app.get('/api/sections', (req, res) => {
  const { active } = req.query;
  
  let query = 'SELECT * FROM sections';
  const params = [];
  
  if (active !== undefined) {
    query += ' WHERE active = ?';
    params.push(active === 'true');
  }
  
  query += ' ORDER BY name';

  db.all(query, params, (err, sections) => {
    if (err) {
      console.error('GET /api/sections error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(sections.map(section => ({
      ...section,
      active: Boolean(section.active)
    })));
  });
});

app.post('/api/sections', (req, res) => {
  const { name, code, active } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  db.run(
    'INSERT INTO sections (name, code, active) VALUES (?, ?, ?)',
    [name.trim(), code.trim(), active === 'true'],
    function(err) {
      if (err) {
        console.error('POST /api/sections error:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: 'Section with this code already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }

      db.get('SELECT * FROM sections WHERE id = ?', [this.lastID], (err, newSection) => {
        if (err) {
          console.error('Error fetching created section:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        res.status(201).json({ ...newSection, active: Boolean(newSection.active) });
      });
    }
  );
});

app.put('/api/sections/:id', (req, res) => {
  const sectionId = parseInt(req.params.id);
  
  if (isNaN(sectionId) || sectionId <= 0) {
    return res.status(400).json({ error: 'Invalid section ID' });
  }

  const { name, code, active } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  db.run(
    'UPDATE sections SET name = ?, code = ?, active = ? WHERE id = ?',
    [name.trim(), code.trim(), active === 'true', sectionId],
    function(err) {
      if (err) {
        console.error('PUT /api/sections/:id error:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: 'Section with this code already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Section not found or no changes made' });
      }

      db.get('SELECT * FROM sections WHERE id = ?', [sectionId], (err, updatedSection) => {
        if (err) {
          console.error('Error fetching updated section:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ ...updatedSection, active: Boolean(updatedSection.active) });
      });
    }
  );
});

// Удалить раздел
app.delete('/api/sections/:id', (req, res) => {
  const sectionId = parseInt(req.params.id);
  
  if (isNaN(sectionId) || sectionId <= 0) {
    return res.status(400).json({ error: 'Invalid section ID' });
  }

  // Сначала получаем информацию о разделе
  db.get('SELECT * FROM sections WHERE id = ?', [sectionId], (err, section) => {
    if (err) {
      console.error('Error fetching section for deletion:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Обновляем товары этого раздела: делаем неактивными и сбрасываем раздел
    db.run(
      'UPDATE products SET section = ?, active = 0 WHERE section = ?',
      ['', section.code],
      function(err) {
        if (err) {
          console.error('Error updating products for section deletion:', err);
          res.status(500).json({ error: err.message });
          return;
        }

        const affectedProducts = this.changes;
        
        // Теперь удаляем сам раздел
        db.run('DELETE FROM sections WHERE id = ?', [sectionId], (err) => {
          if (err) {
            console.error('DELETE /api/sections/:id error:', err);
            res.status(500).json({ error: err.message });
            return;
          }

          res.json({ 
            message: 'Section deleted successfully',
            affectedProducts: affectedProducts,
            deletedSection: section.code
          });
        });
      }
    );
  });
});

// Получить товары по разделу
app.get('/api/products/section/:sectionCode', (req, res) => {
  const { sectionCode } = req.params;
  
  db.all('SELECT * FROM products WHERE section = ? AND active = 1', [sectionCode], (err, products) => {
    if (err) {
      console.error('GET /api/products/section/:sectionCode error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    const parsedProducts = products.map(parseProduct);
    res.json(parsedProducts);
  });
});

// Массовое обновление раздела товаров
app.post('/api/products/update-section', (req, res) => {
  const { oldSection, newSection } = req.body;
  
  if (!oldSection) {
    return res.status(400).json({ error: 'Old section code is required' });
  }

  db.run(
    'UPDATE products SET section = ?, active = ? WHERE section = ?',
    [newSection || '', newSection ? 1 : 0, oldSection],
    function(err) {
      if (err) {
        console.error('POST /api/products/update-section error:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ 
        message: 'Products section updated successfully',
        updatedCount: this.changes
      });
    }
  );
});

// Статистика
app.get('/api/stats', (req, res) => {
  db.get(`
    SELECT 
      COUNT(*) as total_products,
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_products,
      SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured_products,
      COUNT(DISTINCT category) as categories_count,
      COUNT(DISTINCT section) as sections_count,
      (SELECT COUNT(*) FROM sections) as total_sections
    FROM products
  `, (err, stats) => {
    if (err) {
      console.error('GET /api/stats error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(stats);
  });
});

// Поиск товаров
app.get('/api/search', (req, res) => {
  const { q, category, section } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  let query = `SELECT * FROM products WHERE active = 1 AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)`;
  const params = [`%${q}%`, `%${q}%`, `%${q}%`];

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  if (section) {
    query += ` AND section = ?`;
    params.push(section);
  }

  query += ` ORDER BY 
    CASE WHEN name LIKE ? THEN 1 
         WHEN sku LIKE ? THEN 2
         ELSE 3 
    END`;
  
  params.unshift(`%${q}%`, `%${q}%`);

  db.all(query, params, (err, products) => {
    if (err) {
      console.error('GET /api/search error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    const parsedProducts = products.map(parseProduct);
    res.json(parsedProducts);
  });
});

// Миграция данных из localStorage
app.post('/api/migrate-from-localstorage', (req, res) => {
  const { products, sections } = req.body;
  
  let migratedProducts = 0;
  let migratedSections = 0;
  let errors = [];

  const migrateSection = (section) => {
    return new Promise((resolve) => {
      db.run(
        'INSERT OR IGNORE INTO sections (name, code, active) VALUES (?, ?, ?)',
        [section.name, section.code, section.active !== false],
        function(err) {
          if (err) {
            errors.push(`Section ${section.name}: ${err.message}`);
          } else if (this.changes > 0) {
            migratedSections++;
          }
          resolve();
        }
      );
    });
  };

  const migrateProduct = (product) => {
    return new Promise((resolve) => {
      db.run(
        `INSERT OR IGNORE INTO products (
          sku, name, price, category, section, stock, description,
          features, specifications, badge, active, featured, images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.sku || generateSKU(product.name),
          product.name,
          product.price,
          product.category,
          product.section,
          product.stock || 0,
          product.description || '',
          JSON.stringify(product.features || []),
          JSON.stringify(product.specifications || {}),
          product.badge || '',
          product.active !== false,
          product.featured || false,
          JSON.stringify(product.images || [])
        ],
        function(err) {
          if (err) {
            errors.push(`Product ${product.name}: ${err.message}`);
          } else if (this.changes > 0) {
            migratedProducts++;
          }
          resolve();
        }
      );
    });
  };

  const migrateAll = async () => {
    // Мигрируем разделы
    if (sections && Array.isArray(sections)) {
      for (const section of sections) {
        await migrateSection(section);
      }
    }
    
    // Мигрируем товары
    if (products && Array.isArray(products)) {
      for (const product of products) {
        await migrateProduct(product);
      }
    }

    res.json({ 
      message: 'Migration completed',
      migratedProducts,
      migratedSections,
      errors: errors.length > 0 ? errors : undefined
    });
  };

  migrateAll().catch(error => {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  });
});

// Функция генерации SKU
function generateSKU(productName) {
  const timestamp = Date.now().toString().slice(-6);
  const namePart = productName
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]/g, '')
    .slice(0, 3)
    .toUpperCase();
  
  return `MF${namePart}${timestamp}`;
}

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Запуск сервера
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 MA Furniture Server running on http://localhost:${PORT}`);
      console.log('📚 API endpoints:');
      console.log('   GET  /api/health                    - Health check');
      console.log('   GET  /api/products                  - Все товары');
      console.log('   GET  /api/products/sku/:sku         - Поиск по артикулу (ключ)');
      console.log('   POST /api/products                  - Создать товар');
      console.log('   PUT  /api/products/:id              - Обновить товар');
      console.log('   DEL  /api/products/:id              - Удалить товар');
      console.log('   GET  /api/sections                  - Все разделы');
      console.log('   POST /api/migrate-from-localstorage - Миграция данных');
      console.log('   GET  /api/search                    - Поиск товаров');
      console.log('   GET  /api/stats                     - Статистика');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();