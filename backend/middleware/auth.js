const jwt = require('jsonwebtoken');
const { dbHelpers } = require('../database');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    jwt.verify(token, JWT_SECRET, async (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Get full user data from database
      try {
        const userData = await dbHelpers.getUserById(user.id);
        if (!userData) {
          return res.status(403).json({
            success: false,
            error: 'User not found'
          });
        }

        // Don't send password to client
        delete userData.password;
        req.user = userData;
        next();
      } catch (dbError) {
        return res.status(500).json({
          success: false,
          error: 'Database error'
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// Middleware to check storage quota
const checkStorageQuota = (req, res, next) => {
  const user = req.user;
  const fileSize = parseInt(req.headers['content-length']) || 0;

  // Define storage quotas
  const quotas = {
    FREE: parseInt(process.env.FREE_QUOTA) || 524288000,      // 500MB
    PRO: parseInt(process.env.PRO_QUOTA) || 5368709120,        // 5GB
    BUSINESS: parseInt(process.env.BUSINESS_QUOTA) || 53687091200 // 50GB
  };

  const userQuota = quotas[user.subscription_tier] || quotas.FREE;
  const currentUsage = user.storage_used || 0;
  const projectedUsage = currentUsage + fileSize;

  if (projectedUsage > userQuota) {
    return res.status(413).json({
      success: false,
      error: 'Storage quota exceeded',
      data: {
        currentUsage,
        fileSize,
        projectedUsage,
        quota: userQuota,
        tier: user.subscription_tier
      }
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  checkStorageQuota
};