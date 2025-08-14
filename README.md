Influencore Backend
A production-ready Node.js backend for the Influencore AI Video Generation SaaS platform.

🚀 Features
User Authentication: JWT-based auth with Supabase integration
AI Video Generation: OpenAI-powered video creation pipeline
Script Generation: AI-powered script writing with multiple templates
Subscription Management: Stripe integration with multiple pricing tiers
File Storage: AWS S3 and Supabase Storage support
Real-time Updates: Socket.io for live progress tracking
Rate Limiting: Comprehensive rate limiting for API protection
Email Notifications: Automated email system with templates
Usage Tracking: Detailed analytics and usage monitoring
Demo System: Public demo endpoints for marketing
📦 Tech Stack
Runtime: Node.js 18+
Framework: Express.js
Database: PostgreSQL with Sequelize ORM
Authentication: JWT + Supabase Auth
Payments: Stripe
Storage: AWS S3 / Supabase Storage
AI: OpenAI GPT-4
Email: Nodemailer
Real-time: Socket.io
Validation: Joi + express-validator
Logging: Winston
🛠️ Installation
Prerequisites
Node.js 18+
PostgreSQL database
Supabase account
(Optional) AWS S3, Stripe, OpenAI accounts for full functionality
Quick Start
Clone and install dependencies
bash
git clone <repository-url>
cd influencore-backend
npm install
Set up environment variables
bash
cp .env.example .env
# Edit .env with your configuration
Database setup
bash
# The app will auto-create tables on first run in development
npm run dev
Start the server
bash
# Development
npm run dev

# Production
npm start
The server will start on http://localhost:3000

🔧 Environment Configuration
Required Variables
bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/influencore_db

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000,https://your-domain.vercel.app
Optional Variables (for full functionality)
bash
# OpenAI (for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email (for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
📚 API Documentation
Base URL
Development: http://localhost:3000
Production: https://your-backend-domain.com
Authentication
Include JWT token in Authorization header:

Authorization: Bearer <your-jwt-token>
Core Endpoints
Authentication
POST /api/auth/register - Register new user
POST /api/auth/login - User login
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password - Reset password with token
POST /api/auth/verify-token - Verify JWT token
Videos
GET /api/videos - Get user's videos
GET /api/videos/:id - Get single video
POST /api/videos/generate - Generate new video
PUT /api/videos/:id - Update video details
DELETE /api/videos/:id - Delete video
GET /api/videos/public/trending - Get trending public videos
Scripts
GET /api/scripts - Get user's scripts
POST /api/scripts/generate - Generate new script
GET /api/scripts/templates - Get script templates
PUT /api/scripts/:id - Update script
Payments
POST /api/payments/create-checkout-session - Create Stripe checkout
POST /api/payments/create-portal-session - Create billing portal
GET /api/payments/subscription - Get subscription details
GET /api/payments/usage - Get usage statistics
Demo (Public)
POST /api/demo/generate-video - Generate demo video
POST /api/demo/generate-script - Generate demo script
GET /api/demo/showcase - Get showcase videos
GET /api/demo/features - Get feature information
Example Requests
Register User
bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
Generate Video
bash
curl -X POST http://localhost:3000/api/videos/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "title": "My AI Video",
    "prompt": "Create a professional product demo video showcasing innovative features",
    "style": "professional",
    "mood": "energetic",
    "duration": 30
  }'
Demo Video Generation
bash
curl -X POST http://localhost:3000/api/demo/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create an engaging marketing video for a new tech product",
    "email": "demo@example.com"
  }'
🧪 Testing
Test API Endpoints
Health Check
bash
curl http://localhost:3000/health
Demo Features (no auth required)
bash
# Get showcase videos
curl http://localhost:3000/api/demo/showcase

# Generate demo script
curl -X POST http://localhost:3000/api/demo/generate-script \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a script for a tech product launch"}'
User Registration & Login
bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login (save the token from response)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
Protected Endpoints (use token from login)
bash
# Get user videos
curl http://localhost:3000/api/videos \
  -H "Authorization: Bearer <your-token>"

# Generate video
curl -X POST http://localhost:3000/api/videos/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "title": "Test Video",
    "prompt": "Create a simple test video",
    "style": "professional"
  }'
🚀 Deployment
Deploy to Render
Create a new Web Service on Render
Connect your repository
Configure environment variables in Render dashboard
Set build command: npm install
Set start command: npm start
Deploy
Environment Variables for Production
Ensure all required environment variables are set in your Render dashboard, especially:

DATABASE_URL (use Render PostgreSQL add-on)
NODE_ENV=production
JWT_SECRET
SUPABASE_URL and SUPABASE_ANON_KEY
FRONTEND_URL (your Vercel frontend URL)
Database Migration
The app automatically creates/updates database tables using Sequelize in development. For production, consider running migrations separately.

🔒 Security Features
JWT Authentication with secure token management
Rate Limiting on all endpoints
Input Validation with Joi and express-validator
CORS Protection with configurable origins
Helmet security headers
Environment-based error handling
SQL Injection Protection via Sequelize ORM
Request Size Limits to prevent DoS attacks
📊 Monitoring & Logging
Winston logging with rotation
Request/Response logging in development
Error tracking with detailed stack traces
Performance monitoring ready for integration
Health check endpoint for uptime monitoring
🔧 Customization
Adding New Video Styles
Edit services/videoService.js to add new styles:

javascript
const styles = {
  cinematic: { /* style config */ },
  cartoon: { /* style config */ },
  yourNewStyle: { /* your config */ }
};
Adding New Script Templates
Edit services/scriptService.js to add templates:

javascript
this.templates = {
  marketing: { /* existing */ },
  yourTemplate: {
    structure: ['intro', 'body', 'conclusion'],
    maxWords: 200
  }
};
Customizing Email Templates
Edit utils/email.js to modify email templates or add new ones.

🤝 Integration with Frontend
This backend is designed to work with a Next.js/React frontend. Key integration points:

CORS Configuration: Set FRONTEND_URL to your Vercel domain
WebSocket Connection: Frontend connects to Socket.io for real-time updates
Authentication Flow: JWT tokens for session management
File Upload: Direct browser-to-S3 upload capability
Stripe Integration: Checkout sessions and webhooks
📈 Scaling Considerations
Database: Use connection pooling and read replicas for high traffic
Storage: Consider CDN for video delivery
Processing: Implement queue system (Redis/Bull) for video generation
Caching: Add Redis for session and data caching
Load Balancing: Use multiple backend instances behind load balancer
❓ Troubleshooting
Common Issues
Database Connection Failed
Check DATABASE_URL format
Ensure PostgreSQL is running
Verify network connectivity
JWT Token Issues
Ensure JWT_SECRET is at least 32 characters
Check token expiration settings
Verify frontend is sending correct headers
Video Generation Not Working
Check OPENAI_API_KEY configuration
Verify API usage limits
Check logs for specific error messages
Email Not Sending
Verify EMAIL_USER and EMAIL_PASSWORD
For Gmail, use App Passwords
Check firewall/network restrictions
File Upload Issues
Verify AWS credentials and bucket permissions
Check file size limits
Ensure bucket CORS configuration
Getting Help
Check logs in logs/ directory
Enable debug logging with NODE_ENV=development
Review error messages in API responses
Test individual components in isolation
📝 License
MIT License - see LICENSE file for details.

🎯 Next Steps
Once the backend is running:

Test all endpoints using the provided curl examples
Set up your frontend to connect to these APIs
Configure production services (Stripe, OpenAI, etc.)
Deploy to Render using the deployment guide
Monitor logs and performance in production
The backend is designed to be robust, scalable, and production-ready. All major SaaS features are implemented and ready for your frontend integration.

