// ========================================================================
// FILE: api-gateway/src/middleware/auth.middleware.js (FIXED)
// ========================================================================
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const config = require('../config');

const authenticateRequest = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Handle case where 'Bearer ' might be missing
      token = authHeader;
    }
  }

  // Log for debugging
  console.log(`[Gateway-Auth] Processing ${req.method} ${req.originalUrl}`);
  console.log(`[Gateway-Auth] Auth header present: ${!!authHeader}`);
  console.log(`[Gateway-Auth] Token extracted: ${token ? 'Yes (length: ' + token.length + ')' : 'No'}`);

  // If no token, let the request pass through
  // Downstream services will handle their own auth requirements
  if (!token) {
    console.log(`[Gateway-Auth] No token provided, passing through to downstream service`);
    return next();
  }

  // Validate token format before attempting verification
  if (!isValidJWTFormat(token)) {
    console.warn(`[Gateway-Auth] Invalid JWT format detected`);
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: 'Invalid token format',
      message: 'Authentication token is malformed. Please log in again.'
    });
  }

  try {
    // Verify the token with the EXACT same options as the auth-service
    const payload = jwt.verify(token, config.JWT_SECRET, {
      issuer: config.TOKEN_ISSUER,
      audience: config.TOKEN_AUDIENCE,
    });

    console.log(`[Gateway-Auth] Token payload:`, {
      userId: payload.userId,
      email: payload.email,
      type: payload.type,
      exp: new Date(payload.exp * 1000).toISOString()
    });

    // We only allow access tokens at the gateway level
    if (payload.type !== 'access') {
      console.warn(`[Gateway-Auth] Blocked non-access token (type: ${payload.type}) for user ${payload.userId}`);
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid token type',
        message: 'Please use a valid access token.'
      });
    }

    // Check if token is expired (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn(`[Gateway-Auth] Token expired for user ${payload.userId}`);
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }

    // Attach user information to request headers for downstream services
    req.headers['x-user-id'] = payload.userId;
    req.headers['x-user-email'] = payload.email;
    req.headers['x-user-role'] = payload.role;
    
    // Also attach to request object for internal use
    req.userPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };

    console.log(`[Gateway-Auth] ✅ Token verified successfully for user: ${payload.userId} (${payload.email})`);
    next();

  } catch (err) {
    // Enhanced error handling for different JWT errors
    let errorMessage = 'Authentication failed';
    let clientMessage = 'Your session is invalid or has expired. Please log in again.';

    if (err.name === 'TokenExpiredError') {
      console.warn(`[Gateway-Auth] Token expired: ${err.message}`);
      errorMessage = 'Token expired';
      clientMessage = 'Your session has expired. Please log in again.';
    } else if (err.name === 'JsonWebTokenError') {
      console.warn(`[Gateway-Auth] JWT error: ${err.message}`);
      if (err.message.includes('malformed')) {
        errorMessage = 'Malformed token';
        clientMessage = 'Invalid authentication token. Please log in again.';
      } else if (err.message.includes('signature')) {
        errorMessage = 'Invalid signature';
        clientMessage = 'Authentication token signature is invalid. Please log in again.';
      }
    } else if (err.name === 'NotBeforeError') {
      console.warn(`[Gateway-Auth] Token not active yet: ${err.message}`);
      errorMessage = 'Token not active';
    } else {
      console.warn(`[Gateway-Auth] Unexpected JWT error: ${err.name} - ${err.message}`);
    }

    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: errorMessage,
      message: clientMessage
    });
  }
};

// Helper function to validate JWT format
function isValidJWTFormat(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // JWT should have exactly 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Each part should be base64url encoded (basic check)
  for (const part of parts) {
    if (!part || !/^[A-Za-z0-9_-]+$/.test(part)) {
      return false;
    }
  }

  return true;
}

module.exports = {
  authenticateRequest
};