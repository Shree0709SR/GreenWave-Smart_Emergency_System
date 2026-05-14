/**
 * Auth Middleware — JWT verification and Role-Based Access Control
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'greenwave_setcs_secret_2026';

/**
 * Verify JWT token from Authorization header
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Check if user has one of the allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }
    next();
  };
}

/**
 * Check if user has a specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: `Permission denied: ${permission} required` 
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize, requirePermission, JWT_SECRET };
