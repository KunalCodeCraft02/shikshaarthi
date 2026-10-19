// ========================================================================
// FILE: api-gateway/src/server.js (FIXED & ENHANCED)
// ========================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { authenticateRequest } = require('./middleware/auth.middleware');

const app = express();

const PORT = process.env.PORT || 3000;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const REWARDS_SERVICE_URL = process.env.REWARDS_SERVICE_URL || 'http://localhost:3002';
const RENTAL_SERVICE_URL = process.env.RENTAL_SERVICE_URL || 'http://localhost:3003';
// At the top, with other service URLs
const MESS_SERVICE_URL = process.env.MESS_SERVICE_URL || 'http://localhost:3004';
// At the top, with other service URLs
const MEDICAL_SERVICE_URL = process.env.MEDICAL_SERVICE_URL || 'http://localhost:3005';
const PLUMBER_SERVICE_URL = process.env.PLUMBER_SERVICE_URL || 'http://localhost:3006'; // <-- DEFINE
const ELECTRICIAN_SERVICE_URL = process.env.ELECTRICIAN_SERVICE_URL || 'http://localhost:3007'; // <-- ADD
const LAUNDRY_SERVICE_URL = process.env.LAUNDRY_SERVICE_URL || 'http://localhost:3008'; 

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://shikshaarthi.com',
  'https://www.shikshaarthi.com',
  'https://admin.shikshaarthi.com',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim()) : [])
].filter((origin, index, origins) => origin && origins.indexOf(origin) === index);
const getAllowedOrigin = origin => (
  origin && allowedOrigins.includes(origin) ? origin : undefined
);

console.log(`[Gateway] AUTH_SERVICE_URL: ${AUTH_SERVICE_URL}`);
console.log(`[Gateway] REWARDS_SERVICE_URL: ${REWARDS_SERVICE_URL}`);

// With other console logs
console.log(`[Gateway] MESS_SERVICE_URL: ${MESS_SERVICE_URL}`);
// With other console logs
console.log(`[Gateway] MEDICAL_SERVICE_URL: ${MEDICAL_SERVICE_URL}`);
console.log(`[Gateway] PLUMBER_SERVICE_URL: ${PLUMBER_SERVICE_URL}`);
console.log(`[Gateway] ELECTRICIAN_SERVICE_URL: ${ELECTRICIAN_SERVICE_URL}`); // <-- ADD
// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-user-id', 
    'x-user-email', 
    'x-user-role',
    'x-user-payload'
  ]
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle preflight OPTIONS requests BEFORE auth middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-email, x-user-role, x-user-payload');
  res.sendStatus(200);
});

// Health Check (before auth middleware)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    targets: {
      authService: AUTH_SERVICE_URL,
      rewardsService: REWARDS_SERVICE_URL,
      rentalService: RENTAL_SERVICE_URL
      
    }
  });
});

// Apply authentication middleware to all routes except health check
app.use(authenticateRequest);

// Enhanced proxy configuration
const createProxyOptions = (target, serviceName) => ({
  target,
  changeOrigin: true,
  secure: false,
  timeout: 30000,
  proxyTimeout: 30000,
  
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Gateway] 🚀 Proxying ${req.method} ${req.originalUrl} to ${target}`);
    
    // Forward authentication headers
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      proxyReq.setHeader('x-user-email', req.headers['x-user-email']);
      proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
      console.log(`[Gateway] 👤 Forwarding authenticated request for user: ${req.headers['x-user-id']}`);
    }

    // Forward the original Authorization header
    if (req.headers.authorization) {
      proxyReq.setHeader('authorization', req.headers.authorization);
    }

    // express.json() consumes the request stream before the proxy sees it.
    // Re-stream the parsed body so POST/PUT/PATCH requests reach the service.
    fixRequestBody(proxyReq, req);
  },
  
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[Gateway] ✅ Response from ${serviceName}: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
    
    // Ensure CORS headers are set
    const origin = getAllowedOrigin(req.headers.origin);
    if (origin) {
      proxyRes.headers['Access-Control-Allow-Origin'] = origin;
    }
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, x-user-id, x-user-email, x-user-role';
  },
  
  onError: (err, req, res) => {
    console.error(`[Gateway] ❌ Proxy error for ${serviceName}:`, {
      message: err.message,
      code: err.code,
      url: req.originalUrl,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    if (!res.headersSent) {
      // Set CORS headers for error responses
      const origin = getAllowedOrigin(req.headers.origin);
      if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      res.header('Access-Control-Allow-Credentials', 'true');
      
      let statusCode = 502;
      let message = `Gateway error while connecting to ${serviceName}`;
      let error = 'BAD_GATEWAY';

      if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = `${serviceName} is currently unavailable`;
        error = 'SERVICE_UNAVAILABLE';
      } else if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        statusCode = 504;
        message = `${serviceName} request timed out`;
        error = 'GATEWAY_TIMEOUT';
      }

      res.status(statusCode).json({ 
        success: false,
        message,
        error,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Create proxy instances
const authServiceProxy = createProxyMiddleware(createProxyOptions(AUTH_SERVICE_URL, 'Auth Service'));
const rewardsServiceProxy = createProxyMiddleware(createProxyOptions(REWARDS_SERVICE_URL, 'Rewards Service'));
const rentalServiceProxy = createProxyMiddleware(createProxyOptions(RENTAL_SERVICE_URL, 'Rewards Service'));
// With other proxy instances
const messServiceProxy = createProxyMiddleware(createProxyOptions(MESS_SERVICE_URL, 'Mess Service'));
// --- ROUTING RULES ---
// With other proxy instances
const medicalServiceProxy = createProxyMiddleware(createProxyOptions(MEDICAL_SERVICE_URL, 'Medical Service'));
const plumberServiceProxy = createProxyMiddleware(createProxyOptions(PLUMBER_SERVICE_URL, 'Plumber Service'));
const electricianServiceProxy = createProxyMiddleware(createProxyOptions(ELECTRICIAN_SERVICE_URL, 'Electrician Service')); // <-- ADD
const laundryServiceProxy = createProxyMiddleware(createProxyOptions(LAUNDRY_SERVICE_URL, 'Laundry Service')); // <-- ADD
// Auth service routes
app.use('/api/auth', (req, res, next) => {
  console.log(`[Gateway] 🔐 Routing ${req.method} ${req.originalUrl} to Auth Service`);
  authServiceProxy(req, res, next);
});

// Admin routes (also handled by auth service)
app.use('/api/admin', (req, res, next) => {
  console.log(`[Gateway] 👑 Routing ${req.method} ${req.originalUrl} to Auth Service (Admin)`);
  authServiceProxy(req, res, next);
});

// Rewards service routes
app.use('/api/rewards', (req, res, next) => {
  console.log(`[Gateway] 🎁 Routing ${req.method} ${req.originalUrl} to Rewards Service`);
  rewardsServiceProxy(req, res, next);
});

// Rewards service routes
app.use('/api/rentals', (req, res, next) => {
  console.log(`[Gateway] 🎁 Routing ${req.method} ${req.originalUrl} to Rental Service`);
  rentalServiceProxy(req, res, next);
});


// With other routing rules
app.use('/api/mess', (req, res, next) => {
  console.log(`[Gateway] 🍖 Routing ${req.method} ${req.originalUrl} to Mess Service`);
  messServiceProxy(req, res, next);
});

// With other routing rules
app.use('/api/medical', (req, res, next) => {
  console.log(`[Gateway] ⚕️  Routing ${req.method} ${req.originalUrl} to Medical Service`);
  medicalServiceProxy(req, res, next);
});

// With other routing rules
app.use('/api/plumber', (req, res, next) => {
  console.log(`[Gateway] ⚕️  Routing ${req.method} ${req.originalUrl} to Plumber Service`);
  plumberServiceProxy(req, res, next);
});

// Electrician service routes
app.use('/api/electrician', (req, res, next) => {
  console.log(`[Gateway] 💡 Routing ${req.method} ${req.originalUrl} to Electrician Service`);
  electricianServiceProxy(req, res, next);
});
// ADD THE NEW LAUNDRY ROUTE
app.use('/api/laundry', (req, res, next) => {
  console.log(`[Gateway] 🧺 Routing ${req.method} ${req.originalUrl} to Laundry Service`);
  laundryServiceProxy(req, res, next);
});
// 404 Handler for unmatched routes
app.use((req, res) => {
  console.log(`[Gateway] ❓ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    message: `Route '${req.originalUrl}' not found on API Gateway`,
    availableRoutes: [
      '/api/auth/*',
      '/api/admin/*', 
      '/api/rewards/*',
      '/api/rentals/*',
      '/api/mess/*',
      '/api/medical/*',
      '/api/plumber/*',
      '/api/electrician/*', // <-- ADD
      '/api/laundry/*', // <-- ADD
      '/health'
    ],
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('[Gateway] 💥 Unhandled error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });
  
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Internal gateway error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway is UP and running on port ${PORT}`);
  console.log(`📡 Proxying /api/auth/** to ${AUTH_SERVICE_URL}`);
  console.log(`👑 Proxying /api/admin/** to ${AUTH_SERVICE_URL}`);
  console.log(`🎁 Proxying /api/rewards/** to ${REWARDS_SERVICE_URL}`);
  console.log(`-> Proxying /api/rentals to ${RENTAL_SERVICE_URL}`); 
  console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
  console.log(`\n🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Set server timeout
server.timeout = 35000;

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n[Gateway] 🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('[Gateway] ✅ HTTP server closed gracefully');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('[Gateway] ⚠️  Could not close server in time, force closing');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('uncaughtException', (error) => {
  console.error('[Gateway] 💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Gateway] 💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});