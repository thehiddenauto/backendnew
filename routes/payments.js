const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const { models } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Stripe webhook endpoint (before body parser middleware)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// @route   POST /api/payments/create-checkout-session
// @desc    Create Stripe checkout session
// @access  Private
router.post('/create-checkout-session', [
  authenticateToken,
  body('priceId').notEmpty().withMessage('Price ID is required'),
  body('successUrl').isURL().withMessage('Valid success URL required'),
  body('cancelUrl').isURL().withMessage('Valid cancel URL required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { priceId, successUrl, cancelUrl } = req.body;
    const user = req.user;

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.getFullName(),
        metadata: {
          userId: user.id
        }
      });
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await user.update({ stripeCustomerId: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id
      },
      subscription_data: {
        metadata: {
          userId: user.id
        }
      }
    });

    logger.info(`Checkout session created for user ${user.id}: ${session.id}`);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });

  } catch (error) {
    logger.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Payment service error'
    });
  }
});

// @route   POST /api/payments/create-portal-session
// @desc    Create Stripe customer portal session
// @access  Private
router.post('/create-portal-session', [
  authenticateToken,
  body('returnUrl').isURL().withMessage('Valid return URL required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { returnUrl } = req.body;
    const user = req.user;

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No billing account found'
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });

  } catch (error) {
    logger.error('Create portal session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create billing portal session'
    });
  }
});

// @route   GET /api/payments/subscription
// @desc    Get user's subscription details
// @access  Private
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await models.Subscription.findOne({
      where: { userId: req.userId }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    // Get latest data from Stripe if we have a Stripe subscription
    if (subscription.stripeSubscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );
        await subscription.updateFromStripe(stripeSubscription);
      } catch (stripeError) {
        logger.warn('Failed to sync with Stripe:', stripeError);
      }
    }

    res.json({
      success: true,
      data: {
        subscription: subscription.toJSON(),
        features: subscription.getFeatures(),
        canUpgrade: subscription.canUpgrade()
      }
    });

  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details'
    });
  }
});

// @route   GET /api/payments/usage
// @desc    Get user's usage statistics
// @access  Private
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const currentUsage = await models.Usage.getMonthlyUsage(req.userId);
    const subscription = await models.Subscription.findOne({
      where: { userId: req.userId }
    });

    const features = subscription ? subscription.getFeatures() : { videosPerMonth: 3 };
    
    // Calculate usage limits
    const usageLimits = {
      video_generation: await models.Usage.checkLimit(
        req.userId, 
        'video_generation', 
        features.videosPerMonth
      ),
      script_generation: await models.Usage.checkLimit(
        req.userId, 
        'script_generation', 
        -1 // Usually unlimited
      )
    };

    res.json({
      success: true,
      data: {
        currentUsage,
        limits: usageLimits,
        subscription: subscription?.plan || 'free'
      }
    });

  } catch (error) {
    logger.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics'
    });
  }
});

// @route   GET /api/payments/plans
// @desc    Get available subscription plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'forever',
        stripePriceId: null,
        features: {
          videosPerMonth: 3,
          maxDuration: 30,
          aiScripts: false,
          customBranding: false,
          analytics: false,
          priority: false,
          storage: '100MB'
        },
        popular: false
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 29,
        interval: 'month',
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
        features: {
          videosPerMonth: 25,
          maxDuration: 180,
          aiScripts: true,
          customBranding: false,
          analytics: true,
          priority: false,
          storage: '1GB'
        },
        popular: true
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 99,
        interval: 'month',
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
        features: {
          videosPerMonth: 100,
          maxDuration: 600,
          aiScripts: true,
          customBranding: true,
          analytics: true,
          priority: true,
          storage: '10GB'
        },
        popular: false
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 299,
        interval: 'month',
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        features: {
          videosPerMonth: -1,
          maxDuration: -1,
          aiScripts: true,
          customBranding: true,
          analytics: true,
          priority: true,
          storage: 'unlimited'
        },
        popular: false
      }
    ];

    res.json({
      success: true,
      data: { plans }
    });

  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans'
    });
  }
});

// Webhook helper functions
async function handleSubscriptionUpdate(subscription) {
  try {
    const dbSubscription = await models.Subscription.findByStripeId(subscription.id);
    
    if (dbSubscription) {
      await dbSubscription.updateFromStripe(subscription);
      
      // Update user plan
      const user = await dbSubscription.getUser();
      if (user) {
        user.updatePlanLimits(dbSubscription.plan);
        await user.save();
      }
      
      logger.info(`Subscription updated: ${subscription.id}`);
    } else {
      logger.warn(`Subscription not found in database: ${subscription.id}`);
    }
  } catch (error) {
    logger.error('Handle subscription update error:', error);
  }
}

async function handleSubscriptionCancellation(subscription) {
  try {
    const dbSubscription = await models.Subscription.findByStripeId(subscription.id);
    
    if (dbSubscription) {
      await dbSubscription.update({
        status: 'canceled',
        cancelAtPeriodEnd: true
      });
      
      // Update user to free plan after period ends
      const user = await dbSubscription.getUser();
      if (user && new Date() > dbSubscription.currentPeriodEnd) {
        user.updatePlanLimits('free');
        await user.save();
      }
      
      logger.info(`Subscription canceled: ${subscription.id}`);
    }
  } catch (error) {
    logger.error('Handle subscription cancellation error:', error);
  }
}

async function handlePaymentSuccess(invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    await handleSubscriptionUpdate(subscription);
    
    logger.info(`Payment succeeded for subscription: ${invoice.subscription}`);
  } catch (error) {
    logger.error('Handle payment success error:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const dbSubscription = await models.Subscription.findByStripeId(invoice.subscription);
    
    if (dbSubscription) {
      await dbSubscription.update({ status: 'past_due' });
      
      // Send payment failed notification
      // In a real implementation, you'd send an email here
      
      logger.warn(`Payment failed for subscription: ${invoice.subscription}`);
    }
  } catch (error) {
    logger.error('Handle payment failed error:', error);
  }
}

module.exports = router;
