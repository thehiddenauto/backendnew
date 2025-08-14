const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create email transporter
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    logger.warn('Email credentials not configured. Email functionality will be disabled.');
    return null;
  }

  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

const transporter = createTransporter();

// Email templates
const emailTemplates = {
  welcome: (firstName) => ({
    subject: 'Welcome to Influencore! 🎬',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">Welcome to Influencore!</h1>
          <p style="color: #6B7280; font-size: 18px;">Create viral AI videos in minutes</p>
        </div>
        
        <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #111827; margin-top: 0;">Hi ${firstName}! 👋</h2>
          <p style="color: #374151; line-height: 1.6;">
            Thank you for joining Influencore! You're now part of a community of creators using AI to make stunning videos.
          </p>
          <p style="color: #374151; line-height: 1.6;">
            With your free account, you can:
          </p>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Generate 3 AI videos per month</li>
            <li>Create AI-powered scripts</li>
            <li>Access our video templates</li>
            <li>Join our creator community</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Start Creating Videos
          </a>
        </div>
        
        <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
          <p style="color: #6B7280; font-size: 14px;">
            Need help? Reply to this email or visit our 
            <a href="${process.env.FRONTEND_URL}/help" style="color: #4F46E5;">Help Center</a>
          </p>
          <p style="color: #6B7280; font-size: 12px; margin-top: 20px;">
            Influencore - Making video creation accessible to everyone
          </p>
        </div>
      </div>
    `
  }),

  passwordReset: (firstName, resetToken) => ({
    subject: 'Reset Your Influencore Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">Password Reset</h1>
        </div>
        
        <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #111827; margin-top: 0;">Hi ${firstName}!</h2>
          <p style="color: #374151; line-height: 1.6;">
            We received a request to reset your password for your Influencore account.
          </p>
          <p style="color: #374151; line-height: 1.6;">
            Click the button below to reset your password. This link will expire in 1 hour.
          </p>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
             style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin-bottom: 20px;">
          <p style="color: #991B1B; margin: 0; font-size: 14px;">
            <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
          <p style="color: #6B7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">
            ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}
          </p>
        </div>
      </div>
    `
  }),

  videoCompleted: (firstName, videoTitle, videoUrl) => ({
    subject: `Your video "${videoTitle}" is ready! 🎬`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">Your Video is Ready!</h1>
        </div>
        
        <div style="background: #F0FDF4; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10B981;">
          <h2 style="color: #111827; margin-top: 0;">Hi ${firstName}! 🎉</h2>
          <p style="color: #374151; line-height: 1.6;">
            Great news! Your AI-generated video "<strong>${videoTitle}</strong>" has been processed and is ready to view.
          </p>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${videoUrl}" 
             style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Your Video
          </a>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #111827; margin-top: 0;">What's Next?</h3>
          <ul style="color: #374151; line-height: 1.8; margin: 0;">
            <li>Download your video in multiple formats</li>
            <li>Share directly to social media</li>
            <li>Edit and enhance with our tools</li>
            <li>Create more videos with AI</li>
          </ul>
        </div>
        
        <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
          <p style="color: #6B7280; font-size: 14px;">
            Love your video? Share it with us on social media and tag @Influencore!
          </p>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, template, ...args) => {
  if (!transporter) {
    logger.warn('Email transporter not configured. Skipping email send.');
    return false;
  }

  try {
    const emailContent = emailTemplates[template](...args);
    
    const mailOptions = {
      from: `"Influencore" <${process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}: ${emailContent.subject}`);
    return result;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return false;
  }
};

// Specific email functions
const sendWelcomeEmail = async (email, firstName) => {
  return await sendEmail(email, 'welcome', firstName);
};

const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  return await sendEmail(email, 'passwordReset', firstName, resetToken);
};

const sendVideoCompletedEmail = async (email, firstName, videoTitle, videoUrl) => {
  return await sendEmail(email, 'videoCompleted', firstName, videoTitle, videoUrl);
};

// Send bulk emails (for marketing, etc.)
const sendBulkEmail = async (recipients, template, ...args) => {
  if (!transporter) {
    logger.warn('Email transporter not configured. Skipping bulk email send.');
    return false;
  }

  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await sendEmail(recipient.email, template, recipient.firstName || 'Friend', ...args);
      results.push({ email: recipient.email, success: !!result });
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      logger.error(`Bulk email failed for ${recipient.email}:`, error);
      results.push({ email: recipient.email, success: false, error: error.message });
    }
  }
  
  logger.info(`Bulk email completed. Success: ${results.filter(r => r.success).length}/${results.length}`);
  return results;
};

// Test email configuration
const testEmailConfig = async () => {
  if (!transporter) {
    return { success: false, message: 'Email not configured' };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    logger.error('Email configuration test failed:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVideoCompletedEmail,
  sendBulkEmail,
  testEmailConfig
};
