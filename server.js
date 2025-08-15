const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

// Add startup error handling
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Wrap require statements in try-catch
let validateEnv, initDatabase, logger;

try {
  require('dotenv').config();
  console.log('✅ dotenv loaded');
} catch (error) {
  console.error('❌ Failed to load dotenv:', error.message);
  process.exit(1);
}

try {
  logger = require('./utils/logger');
  console.log('✅ Logger loaded');
} catch (error) {
  console.error('❌ Failed to load logger:', error.message);
  // Continue without logger
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

try {
  validateEnv = require('./utils/validateEnv');
  console.log('✅ Environment validator loaded');
} catch (error) {
  console.error('❌ Failed to load validateEnv:', error.message);
  // Continue without validation
  validateEnv = () => {};
}

try {
  const db = require('./config/database');
  initDatabase = db.initDatabase;
  console.log('✅ Database config loaded');
} catch (error) {
  console.error('❌ Failed to load database config:', error.message);
  process.exit(1);
}

// Import routes with error handling
let authRoutes, userRoutes, videoRoutes, scriptRoutes, paymentRoutes, demoRoutes, uploadRoutes;

try {
  authRoutes = require('./routes/auth');
  userRoutes = require('./routes/users');
  videoRoutes = require('./routes/videos');
  scriptRoutes = require('./routes/scripts');
  paymentRoutes = require('./routes/payments');
  demoRoutes = require('./routes/demo');
  uploadRoutes = require('./routes/upload');
  console.log('✅ All routes loaded');
} catch (error) {
  console.error('❌ Failed to load routes:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Create logs directory if it doesn't exist
try {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Logs directory created');
  }
} catch (error) {
  console.warn('⚠️ Could not create logs directory:', error.message);
}

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Basic environment check
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('Please set these variables in your Render environment settings.');
  process.exit(1);
}

console.log('✅ Required environment variables present');

// Validate environment variables
try {
  validateEnv();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  // Don't exit here, continue with warnings
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// General middleware
app.use(compression());
app.use(morgan('combined', { 
  stream: { 
    write: msg => logger ? logger.info(msg.trim()) : console.log(msg.trim())
  } 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

// Health check endpoint (before routes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Influencore Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'unknown'
  });
});

// API routes
try {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/scripts', scriptRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/demo', demoRoutes);
  app.use('/api/upload', uploadRoutes);
  console.log('✅ Routes configured');
} catch (error) {
  console.error('❌ Failed to configure routes:', error.message);
  process.exit(1);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Application Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' ? err.message : 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('🚀 Starting server initialization...');
    
    // Test database connection first
    if (initDatabase) {
      console.log('📊 Connecting to database...');
      await initDatabase();
      console.log('✅ Database connected successfully');
    } else {
      console.warn('⚠️ No database initialization function available');
    }
    
    // Start HTTP server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log('🎉 Server started successfully!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED PROMISE REJECTION! 💥 Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error('Stack:', err.stack);
  httpServer.close(() => {
    process.exit(1);
  });
});

// Start the server
startServer().catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});
