function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET'
  ];

  const optional = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
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
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`  - ${envVar}`));
    console.error('Please set these variables in your Render environment settings.');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Missing optional environment variables (some features may be disabled):');
    warnings.forEach(envVar => console.warn(`  - ${envVar}`));
  }

  // Validate specific formats (but don't exit on warnings)
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.warn('⚠️ DATABASE_URL should be a PostgreSQL connection string');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️ JWT_SECRET should be at least 32 characters long for security');
  }

  console.log('✅ Environment variables validated');
}

module.exports = validateEnv;
