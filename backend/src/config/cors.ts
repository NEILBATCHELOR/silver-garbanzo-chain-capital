import { FastifyCorsOptions } from '@fastify/cors'

/**
 * CORS configuration for Chain Capital Backend
 * Allows frontend and other authorized origins to access the API
 */
export const corsOptions: FastifyCorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Alternative dev server
      'https://localhost:5173', // HTTPS dev
      'https://localhost:3000', // HTTPS dev
    ]

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true)
      return
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page'
  ]
}
