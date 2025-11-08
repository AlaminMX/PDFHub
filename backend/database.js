const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'pdfnest.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      storage_used INTEGER DEFAULT 0,
      subscription_tier TEXT DEFAULT 'FREE',
      subscription_status TEXT DEFAULT 'ACTIVE',
      email_verified BOOLEAN DEFAULT 0
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err.message);
  });

  // Files table
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      content_type TEXT DEFAULT 'application/pdf',
      category_id TEXT DEFAULT 'uncategorized',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creating files table:', err.message);
  });

  // Categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT 'bg-gray-100 text-gray-700',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creating categories table:', err.message);
  });

  // Insert default categories for new users
  const defaultCategories = [
    { id: 'uncategorized', name: 'Uncategorized', color: 'bg-gray-100 text-gray-700' },
    { id: 'work', name: 'Work', color: 'bg-red-100 text-red-700' },
    { id: 'personal', name: 'Personal', color: 'bg-blue-100 text-blue-700' },
    { id: 'finance', name: 'Finance', color: 'bg-green-100 text-green-700' }
  ];

  console.log('Database initialized successfully');
}

// Helper functions for database operations
const dbHelpers = {
  // Get user by email
  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Get user by ID
  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Create new user
  createUser: (user) => {
    return new Promise((resolve, reject) => {
      const { email, password, displayName } = user;
      db.run(
        'INSERT INTO users (email, password, display_name) VALUES (?, ?, ?)',
        [email, password, displayName],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...user });
        }
      );
    });
  },

  // Update user storage
  updateStorageUsage: (userId, storageUsed) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET storage_used = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [storageUsed, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  // Get user files
  getUserFiles: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Add file
  addFile: (file) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO files (id, user_id, original_name, file_name, file_size, file_path, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [file.id, file.userId, file.originalName, file.fileName, file.fileSize, file.filePath, file.categoryId],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...file });
        }
      );
    });
  },

  // Delete file
  deleteFile: (fileId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM files WHERE id = ? AND user_id = ?',
        [fileId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  // Get user categories
  getUserCategories: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM categories WHERE user_id = ? ORDER BY name',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Add category
  addCategory: (category) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO categories (id, user_id, name, color) VALUES (?, ?, ?, ?)',
        [category.id, category.userId, category.name, category.color],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...category });
        }
      );
    });
  },

  // Close database connection
  close: () => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
};

module.exports = { db, dbHelpers };