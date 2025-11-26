const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { dbHelpers } = require('../database');
const { authenticateToken, checkStorageQuota } = require('../middleware/auth');
const { upload, handleUploadError, deleteUploadedFile } = require('../middleware/upload');

const router = express.Router();
const uploadsDir = process.env.UPLOAD_DIR || './uploads';

// Upload files
router.post('/upload',
  authenticateToken,
  checkStorageQuota,
  upload.array('files', 10),
  handleUploadError,
  async (req, res) => {
    try {
      const files = req.files;
      const userId = req.user.id;
      const categoryId = req.body.categoryId || 'uncategorized';

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
      }

      const uploadedFiles = [];
      let totalSizeAdded = 0;

      for (const file of files) {
        const fileId = uuidv4();

        // Save file metadata to database
        const fileRecord = {
          id: fileId,
          userId: userId,
          originalName: file.originalname,
          fileName: file.filename,
          fileSize: file.size,
          filePath: file.path,
          categoryId: categoryId
        };

        await dbHelpers.addFile(fileRecord);

        // Add to uploaded files array (without file path for security)
        uploadedFiles.push({
          id: fileId,
          name: file.originalname,
          size: file.size,
          url: `/api/files/download/${fileId}`,
          categoryId: categoryId,
          uploadedAt: new Date().toISOString()
        });

        totalSizeAdded += file.size;
      }

      // Update user's storage usage
      const newStorageUsed = (req.user.storage_used || 0) + totalSizeAdded;
      await dbHelpers.updateStorageUsage(userId, newStorageUsed);

      res.status(201).json({
        success: true,
        data: {
          files: uploadedFiles,
          totalSizeAdded,
          storageUsed: newStorageUsed
        }
      });
    } catch (error) {
      console.error('Upload error:', error);

      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          deleteUploadedFile(file.path);
        });
      }

      res.status(500).json({
        success: false,
        error: 'Upload failed'
      });
    }
  }
);

// Get user's files
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.query.category;

    let query = 'SELECT * FROM files WHERE user_id = ?';
    const params = [userId];

    if (categoryId && categoryId !== 'all') {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY uploaded_at DESC';

    const files = await new Promise((resolve, reject) => {
      req.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Transform files for client
    const clientFiles = files.map(file => ({
      id: file.id,
      name: file.original_name,
      size: file.file_size,
      url: `/api/files/download/${file.id}`,
      categoryId: file.category_id,
      uploadedAt: file.uploaded_at
    }));

    res.json({
      success: true,
      data: {
        files: clientFiles
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve files'
    });
  }
});

// Download file
router.get('/download/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Get file from database
    const file = await new Promise((resolve, reject) => {
      req.db.get(
        'SELECT * FROM files WHERE id = ? AND user_id = ?',
        [fileId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Length', file.file_size);

    // Send file
    res.sendFile(path.resolve(file.file_path));
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed'
    });
  }
});

// Update file category
router.put('/:fileId/category', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { categoryId } = req.body;
    const userId = req.user.id;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Category ID is required'
      });
    }

    // Update file category
    const result = await new Promise((resolve, reject) => {
      req.db.run(
        'UPDATE files SET category_id = ? WHERE id = ? AND user_id = ?',
        [categoryId, fileId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'File category updated successfully'
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update file category'
    });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Get file from database
    const file = await new Promise((resolve, reject) => {
      req.db.get(
        'SELECT * FROM files WHERE id = ? AND user_id = ?',
        [fileId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete file from database
    await dbHelpers.deleteFile(fileId, userId);

    // Delete file from disk
    deleteUploadedFile(file.file_path);

    // Update user's storage usage
    const newStorageUsed = Math.max(0, (req.user.storage_used || 0) - file.file_size);
    await dbHelpers.updateStorageUsage(userId, newStorageUsed);

    res.json({
      success: true,
      message: 'File deleted successfully',
      data: {
        storageUsed: newStorageUsed,
        fileSizeRemoved: file.file_size
      }
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

// Get storage usage
router.get('/storage/usage', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const quotas = {
      FREE: parseInt(process.env.FREE_QUOTA) || 524288000,      // 500MB
      PRO: parseInt(process.env.PRO_QUOTA) || 5368709120,        // 5GB
      BUSINESS: parseInt(process.env.BUSINESS_QUOTA) || 53687091200 // 50GB
    };

    const currentQuota = quotas[user.subscription_tier] || quotas.FREE;
    const currentUsage = user.storage_used || 0;
    const usagePercentage = (currentUsage / currentQuota) * 100;

    res.json({
      success: true,
      data: {
        currentUsage,
        quota: currentQuota,
        usagePercentage: Math.min(usagePercentage, 100),
        tier: user.subscription_tier,
        available: currentQuota - currentUsage
      }
    });
  } catch (error) {
    console.error('Storage usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage usage'
    });
  }
});

module.exports = router;