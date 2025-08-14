const logger = require('./logger');

function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];

  const optional = [
    'OPENAI_API_KEY',
    'STRIPE_SECRET_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  required.forEach(envVar => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  // Check optional variables
  optional.forEach(envVar => {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  });

  if (missing.length > 0) {
    logger.error('Missing required environment variables:');
    missing.forEach(envVar => logger.error(`  - ${envVar}`));
    logger.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  if (warnings.length > 0) {
    logger.warn('Missing optional environment variables (some features may be disabled):');
    warnings.forEach(envVar => logger.warn(`  - ${envVar}`));
  }

  // Validate specific formats
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    logger.error('DATABASE_URL must be a valid PostgreSQL connection string');
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  logger.info('Environment variables validated successfully');
}

module.exports = validateEnv;
