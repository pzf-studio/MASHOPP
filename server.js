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

          // Создание индексов
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
            CREATE INDEX IF NOT EXISTS idx_products_section ON products(section);
            CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
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
                  ['Премиум', 'premium']
                ];

                const stmt = db.prepare('INSERT INTO sections (name, code) VALUES (?, ?)');
                defaultSections.forEach(([name, code]) => {
                  stmt.run(name, code);
                });
                stmt.finalize();
                console.log('✅ Default sections created');
              }

              console.log('✅ Database initialized successfully');
              resolve();
            });
          });
        });
      });
    });
  });
}

// 🔥 API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MA Furniture DB Server is running',
    timestamp: new Date().toISOString()
  });
});

// Получить все товары
app.get('/api/products', (req, res) => {
  const { category, section, active, featured, search } = req.query;
  
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

  db.all(query, params, (err, products) => {
    if (err) {
      console.error('GET /api/products error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Парсим JSON поля
    const parsedProducts = products.map(product => ({
      ...product,
      features: product.features ? JSON.parse(product.features) : [],
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      images: product.images ? JSON.parse(product.images) : [],
      price: parseFloat(product.price),
      active: Boolean(product.active),
      featured: Boolean(product.featured)
    }));

    res.json(parsedProducts);
  });
});

// 🔥 БЫСТРЫЙ ПОИСК ПО АРТИКУЛУ
app.get('/api/products/sku/:sku', (req, res) => {
  db.get('SELECT * FROM products WHERE sku = ?', [req.params.sku], (err, product) => {
    if (err) {
      console.error('GET /api/products/sku error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const parsedProduct = {
      ...product,
      features: product.features ? JSON.parse(product.features) : [],
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      images: product.images ? JSON.parse(product.images) : [],
      price: parseFloat(product.price),
      active: Boolean(product.active),
      featured: Boolean(product.featured)
    };

    res.json(parsedProduct);
  });
});

// Получить товар по ID
app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (err) {
      console.error('GET /api/products/:id error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const parsedProduct = {
      ...product,
      features: product.features ? JSON.parse(product.features) : [],
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      images: product.images ? JSON.parse(product.images) : [],
      price: parseFloat(product.price),
      active: Boolean(product.active),
      featured: Boolean(product.featured)
    };

    res.json(parsedProduct);
  });
});

// Создать товар
app.post('/api/products', upload.array('images', 10), (req, res) => {
  const {
    name, price, category, section, sku, stock, description,
    features, specifications, badge, active, featured
  } = req.body;

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
      name, 
      parseFloat(price), 
      category, 
      section, 
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

        const parsedProduct = {
          ...newProduct,
          features: newProduct.features ? JSON.parse(newProduct.features) : [],
          specifications: newProduct.specifications ? JSON.parse(newProduct.specifications) : {},
          images: newProduct.images ? JSON.parse(newProduct.images) : [],
          price: parseFloat(newProduct.price),
          active: Boolean(newProduct.active),
          featured: Boolean(newProduct.featured)
        };

        res.status(201).json(parsedProduct);
      });
    }
  );
});

// 🔄 УЛУЧШЕННЫЙ МЕТОД ОБНОВЛЕНИЯ ТОВАРА
app.put('/api/products/:id', upload.array('images', 10), (req, res) => {
  const {
    name, price, category, section, sku, stock, description,
    features, specifications, badge, active, featured
  } = req.body;

  // Получаем текущий товар
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, currentProduct) => {
    if (err) {
      console.error('Error fetching product for update:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Обрабатываем изображения - сохраняем существующие если новые не загружены
    let imageUrls = currentProduct.images ? JSON.parse(currentProduct.images) : [];
    
    // Если загружены новые изображения, заменяем старые
    if (req.files && req.files.length > 0) {
      // Удаляем старые файлы изображений
      imageUrls.forEach(imageUrl => {
        const imagePath = path.join(__dirname, imageUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
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
        name || currentProduct.name,
        parseFloat(price || currentProduct.price),
        category || currentProduct.category,
        section || currentProduct.section,
        parseInt(stock || currentProduct.stock || 0),
        description || currentProduct.description || '',
        JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : (currentProduct.features ? JSON.parse(currentProduct.features) : [])),
        JSON.stringify(specifications || (currentProduct.specifications ? JSON.parse(currentProduct.specifications) : {})),
        badge || currentProduct.badge || '',
        finalActive,
        featured === 'true' ? 1 : 0,
        JSON.stringify(imageUrls),
        req.params.id
      ],
      function(err) {
        if (err) {
          console.error('PUT /api/products/:id error:', err);
          res.status(500).json({ error: err.message });
          return;
        }

        // Получаем обновленный товар
        db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, updatedProduct) => {
          if (err) {
            console.error('Error fetching updated product:', err);
            res.status(500).json({ error: err.message });
            return;
          }

          const parsedProduct = {
            ...updatedProduct,
            features: updatedProduct.features ? JSON.parse(updatedProduct.features) : [],
            specifications: updatedProduct.specifications ? JSON.parse(updatedProduct.specifications) : {},
            images: updatedProduct.images ? JSON.parse(updatedProduct.images) : [],
            price: parseFloat(updatedProduct.price),
            active: Boolean(updatedProduct.active),
            featured: Boolean(updatedProduct.featured)
          };

          res.json(parsedProduct);
        });
      }
    );
  });
});

// Удалить товар
app.delete('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
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
      const images = JSON.parse(product.images);
      images.forEach(imageUrl => {
        const imagePath = path.join(__dirname, imageUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    db.run('DELETE FROM products WHERE id = ?', [req.params.id], (err) => {
      if (err) {
        console.error('DELETE /api/products/:id error:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ message: 'Product deleted successfully' });
    });
  });
});

// API для разделов
app.get('/api/sections', (req, res) => {
  db.all('SELECT * FROM sections ORDER BY name', (err, sections) => {
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
  
  db.run(
    'INSERT INTO sections (name, code, active) VALUES (?, ?, ?)',
    [name, code, active === 'true'],
    function(err) {
      if (err) {
        console.error('POST /api/sections error:', err);
        res.status(500).json({ error: err.message });
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
  const { name, code, active } = req.body;
  
  db.run(
    'UPDATE sections SET name = ?, code = ?, active = ? WHERE id = ?',
    [name, code, active === 'true', req.params.id],
    function(err) {
      if (err) {
        console.error('PUT /api/sections/:id error:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      db.get('SELECT * FROM sections WHERE id = ?', [req.params.id], (err, updatedSection) => {
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

// 🔄 УЛУЧШЕННЫЙ МЕТОД УДАЛЕНИЯ РАЗДЕЛА С ОБРАБОТКОЙ ТОВАРОВ
app.delete('/api/sections/:id', (req, res) => {
  const sectionId = req.params.id;

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
            affectedProducts: affectedProducts
          });
        });
      }
    );
  });
});

// 🔄 API для массового обновления раздела товаров
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

// 🔍 Метод для получения товаров по разделу
app.get('/api/products/section/:sectionCode', (req, res) => {
  const { sectionCode } = req.params;
  
  db.all('SELECT * FROM products WHERE section = ?', [sectionCode], (err, products) => {
    if (err) {
      console.error('GET /api/products/section/:sectionCode error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    const parsedProducts = products.map(product => ({
      ...product,
      features: product.features ? JSON.parse(product.features) : [],
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      images: product.images ? JSON.parse(product.images) : [],
      price: parseFloat(product.price),
      active: Boolean(product.active),
      featured: Boolean(product.featured)
    }));

    res.json(parsedProducts);
  });
});

// Статистика
app.get('/api/stats', (req, res) => {
  db.get(`
    SELECT 
      COUNT(*) as total_products,
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_products,
      SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured_products,
      COUNT(DISTINCT category) as categories_count,
      COUNT(DISTINCT section) as sections_count
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

// Миграция данных из localStorage
app.post('/api/migrate-from-localstorage', (req, res) => {
  const { products, sections } = req.body;
  
  let migratedCount = 0;
  let completed = 0;
  const total = (products ? products.length : 0) + (sections ? sections.length : 0);
  
  // Мигрируем разделы
  if (sections && Array.isArray(sections)) {
    sections.forEach((section) => {
      db.run(
        'INSERT OR IGNORE INTO sections (name, code, active) VALUES (?, ?, ?)',
        [section.name, section.code, section.active],
        () => {
          completed++;
          if (completed === total) {
            res.json({ 
              message: `Migration completed successfully`,
              migratedProducts: migratedCount
            });
          }
        }
      );
    });
  }
  
  // Мигрируем товары
  if (products && Array.isArray(products)) {
    products.forEach((product) => {
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
        function() {
          migratedCount++;
          completed++;
          if (completed === total) {
            res.json({ 
              message: `Migration completed successfully`,
              migratedProducts: migratedCount
            });
          }
        }
      );
    });
  }

  // Если нет данных для миграции
  if (total === 0) {
    res.json({ 
      message: `No data to migrate`,
      migratedProducts: 0
    });
  }
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
      console.log('   GET  /api/products/sku/:sku         - Поиск по артикулу');
      console.log('   POST /api/products                  - Создать товар');
      console.log('   PUT  /api/products/:id              - Обновить товар');
      console.log('   DEL  /api/products/:id              - Удалить товар');
      console.log('   GET  /api/sections                  - Все разделы');
      console.log('   POST /api/migrate-from-localstorage - Миграция данных');
      console.log('   DEL  /api/sections/:id              - Удалить раздел (с обработкой товаров)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();