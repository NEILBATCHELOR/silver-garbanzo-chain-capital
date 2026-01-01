/**
 * Environment Configuration
 * 
 * CRITICAL: This file MUST be imported first in any file that needs environment variables
 * It ensures dotenv is loaded before any code tries to read from process.env
 */

import { config } from 'dotenv';

// Load environment variables IMMEDIATELY
config();

// Export environment variables with type safety
export const env = {
  // Server Configuration
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || 'localhost',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL || '',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',

  // Supabase Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Wallet Configuration
  WALLET_MASTER_PASSWORD: process.env.WALLET_MASTER_PASSWORD || '',

  // Blockchain Configuration
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY || '',
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || '',

  // CORS Configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000',

  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || '.pdf,.doc,.docx,.jpg,.png,.jpeg',

  // Swagger Documentation
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER === 'true',
  SWAGGER_HOST: process.env.SWAGGER_HOST || 'localhost:3001',
  SWAGGER_SCHEMES: process.env.SWAGGER_SCHEMES || 'http',

  // API Keys
  FRED_API_KEY: process.env.FRED_API_KEY || '',
  ONEINCH_API_KEY: process.env.ONEINCH_API_KEY || '',
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || '',

  // Supabase Edge Functions
  SUPABASE_EDGE_FUNCTION_MARKETDATA: process.env.SUPABASE_EDGE_FUNCTION_MARKETDATA || '',
  SUPABASE_EDGE_FUNCTION_FREE_MARKETDATA: process.env.SUPABASE_EDGE_FUNCTION_FREE_MARKETDATA || '',
} as const;

// Validation function to check critical environment variables
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const critical = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
  ];

  const missing = critical.filter(key => !env[key as keyof typeof env]);

  return {
    valid: missing.length === 0,
    missing
  };
}

// Export individual values for convenience
export const {
  PORT,
  HOST,
  NODE_ENV,
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  SUPABASE_JWT_SECRET,
} = env;
