// Stripe Conversion API Routes
// Phase 4: Backend Integration

import { Router, Request, Response } from 'express';
import { conversionService } from '@/services/wallet/stripe/ConversionService';
import { stablecoinAccountService } from '@/services/wallet/stripe/StablecoinAccountService';
import type { 
  FiatToStablecoinParams, 
  StablecoinToFiatParams 
} from '@/services/wallet/stripe/types';

const stripeConversionRouter = Router();

/**
 * Create FIAT to stablecoin conversion session
 */
stripeConversionRouter.post('/fiat-to-stablecoin', async (req: Request, res: Response) => {
  try {
    const params: FiatToStablecoinParams = req.body;

    // Basic validation
    if (!params.userId || !params.fiatAmount || !params.fiatCurrency || 
        !params.targetStablecoin || !params.targetNetwork || !params.walletAddress) {
      return res.status(400).json({
        error: 'Missing required parameters',
        status: 400
      });
    }

    const result = await conversionService.createFiatToStablecoinSession(params);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        error: result.error || 'Failed to create conversion session',
        code: result.code,
        status: 400
      });
    }
  } catch (error) {
    console.error('FIAT to stablecoin conversion error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      status: 500
    });
  }
});

/**
 * Create stablecoin to FIAT conversion
 */
stripeConversionRouter.post('/stablecoin-to-fiat', async (req: Request, res: Response) => {
  try {
    const params: StablecoinToFiatParams = req.body;

    // Basic validation
    if (!params.userId || !params.stablecoinAmount || !params.stablecoin || 
        !params.sourceNetwork || !params.targetFiatCurrency || !params.targetBankAccount) {
      return res.status(400).json({
        error: 'Missing required parameters',
        status: 400
      });
    }

    const result = await conversionService.createStablecoinToFiatConversion(params);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        error: result.error || 'Failed to create transfer',
        code: result.code,
        status: 400
      });
    }
  } catch (error) {
    console.error('Stablecoin to FIAT conversion error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      status: 500
    });
  }
});

/**
 * Get conversion transaction status
 */
stripeConversionRouter.get('/transaction/:id', async (req: Request, res: Response) => {
  try {
    const transactionId = req.params.id;

    if (!transactionId) {
      return res.status(400).json({
        error: 'Transaction ID is required',
        status: 400
      });
    }

    const result = await conversionService.getTransactionById(transactionId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(404).json({
        error: result.error || 'Transaction not found',
        code: result.code,
        status: 404
      });
    }
  } catch (error) {
    console.error('Get transaction status error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      status: 500
    });
  }
});

/**
 * Get user's stablecoin account
 */
stripeConversionRouter.get('/account/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        status: 400
      });
    }

    const result = await stablecoinAccountService.getAccountByUserId(userId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(404).json({
        error: result.error || 'Account not found',
        code: result.code,
        status: 404
      });
    }
  } catch (error) {
    console.error('Get stablecoin account error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      status: 500
    });
  }
});

/**
 * Create stablecoin account for user
 */
stripeConversionRouter.post('/account', async (req: Request, res: Response) => {
  try {
    const { userId, customerId } = req.body;

    if (!userId || !customerId) {
      return res.status(400).json({
        error: 'User ID and Customer ID are required',
        status: 400
      });
    }

    const result = await stablecoinAccountService.createAccountWithStripe(userId, customerId);

    if (result.success) {
      return res.status(201).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        error: result.error || 'Failed to create account',
        code: result.code,
        status: 400
      });
    }
  } catch (error) {
    console.error('Create stablecoin account error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      status: 500
    });
  }
});

/**
 * Get conversion history for user
 */
stripeConversionRouter.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        status: 400
      });
    }

    const result = await conversionService.listUserTransactions(userId, {}, { page, limit });

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        error: result.error || 'Failed to get conversion history',
        code: result.code,
        status: 400
      });
    }
  } catch (error) {
    console.error('Get conversion history error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      status: 500
    });
  }
});

export default stripeConversionRouter;
