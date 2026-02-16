const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { generateUUID } = require('../utils/uuid');

const prisma = new PrismaClient();
const router = express.Router();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: true,
  // Custom key generator to include user agent
  keyGenerator: (req) => {
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  }
});

// Validation middleware
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Login endpoint
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const userAgent = req.get('User-Agent') || 'unknown';
    const ipAddress = req.ip;

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        admins: true
      }
    });

    if (!user) {
      // Log failed login attempt
      await logAuditEvent(null, 'LOGIN_FAILED', 'users', null, ipAddress, userAgent, `Failed login attempt for email: ${email}`);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      await logAuditEvent(user.id, 'LOGIN_BLOCKED', 'users', user.id, ipAddress, userAgent, 'Login attempt by inactive user');
      
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check if user has staff or admin role
    if (!['staff', 'admin'].includes(user.role)) {
      await logAuditEvent(user.id, 'LOGIN_UNAUTHORIZED', 'users', user.id, ipAddress, userAgent, 'Login attempt by non-staff user');
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff credentials required.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await logAuditEvent(user.id, 'LOGIN_FAILED', 'users', user.id, ipAddress, userAgent, 'Invalid password');
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store refresh token in database
    await prisma.auth_tokens.create({
      data: {
        id: generateUUID(), // Add this line
        user_id: user.id,
        refresh_token: refreshToken,
        user_agent: userAgent,
        ip_address: ipAddress,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Update last login for admins
    if (user.role === 'admin' && user.admins) {
      await prisma.admins.update({
        where: { id: user.id },
        data: { last_login: new Date() }
      });
    }

    // Log successful login
    await logAuditEvent(user.id, 'LOGIN_SUCCESS', 'users', user.id, ipAddress, userAgent, 'Successful login');

    // Return user data and tokens
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          isEmailVerified: user.is_email_verified
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Check if token exists in database
    const tokenRecord = await prisma.auth_tokens.findFirst({
      where: {
        refresh_token: refreshToken,
        user_id: decoded.userId,
        expires_at: {
          gt: new Date()
        }
      },
      include: {
        users: true
      }
    });

    if (!tokenRecord || !tokenRecord.users.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: tokenRecord.users.id,
        email: tokenRecord.users.email,
        role: tokenRecord.users.role,
        type: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      data: {
        accessToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userAgent = req.get('User-Agent') || 'unknown';
    const ipAddress = req.ip;

    if (refreshToken) {
      // Remove refresh token from database
      const tokenRecord = await prisma.auth_tokens.findFirst({
        where: { refresh_token: refreshToken },
        include: { users: true }
      });

      if (tokenRecord) {
        await prisma.auth_tokens.delete({
          where: { id: tokenRecord.id }
        });

        // Log logout
        await logAuditEvent(
          tokenRecord.user_id,
          'LOGOUT',
          'users',
          tokenRecord.user_id,
          ipAddress,
          userAgent,
          'User logged out'
        );
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to log audit events
async function logAuditEvent(userId, action, targetType, targetId, ipAddress, userAgent, details = null) {
  try {
    const data = {
      id: generateUUID(),
      action,
      target_type: targetType,
      target_id: targetId,
      ip_address: ipAddress,
      user_agent: userAgent,
      details
    };

    // Only add user relation if userId is provided
    if (userId) {
      data.users = {
        connect: { id: userId }
      };
    }

    await prisma.audit_logs.create({ data });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// Token verification endpoint
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // If we reach here, the token is valid (authenticateToken middleware passed)
    res.json({
      success: true,
      data: {
        user: req.user,
        valid: true
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;