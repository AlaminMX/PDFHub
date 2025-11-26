const express = require('express');
const { dbHelpers } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get user's categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const categories = await dbHelpers.getUserCategories(userId);

    res.json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories'
    });
  }
});

// Add new category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, color } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    const category = {
      id: uuidv4(),
      userId: userId,
      name: name.trim(),
      color: color || 'bg-gray-100 text-gray-700'
    };

    const createdCategory = await dbHelpers.addCategory(category);

    res.status(201).json({
      success: true,
      data: {
        category: createdCategory
      }
    });
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
});

// Update category
router.put('/:categoryId', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, color } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Update category
    const result = await new Promise((resolve, reject) => {
      req.db.run(
        'UPDATE categories SET name = ?, color = ? WHERE id = ? AND user_id = ?',
        [name.trim(), color || 'bg-gray-100 text-gray-700', categoryId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
});

// Delete category
router.delete('/:categoryId', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const userId = req.user.id;

    // Don't allow deleting the 'uncategorized' category
    if (categoryId === 'uncategorized') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the uncategorized category'
      });
    }

    // Move all files in this category to 'uncategorized'
    await new Promise((resolve, reject) => {
      req.db.run(
        'UPDATE files SET category_id = ? WHERE category_id = ? AND user_id = ?',
        ['uncategorized', categoryId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Delete the category
    const result = await new Promise((resolve, reject) => {
      req.db.run(
        'DELETE FROM categories WHERE id = ? AND user_id = ?',
        [categoryId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
});

module.exports = router;