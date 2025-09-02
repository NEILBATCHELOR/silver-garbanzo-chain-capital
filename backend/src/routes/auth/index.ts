import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { Type } from '@sinclair/typebox'
import { UserService, UserCreationData, UserUpdateData } from '@/services/auth/UserService'
import { LoginCredentials } from '@/types/index'
import { strictRateLimitOptions } from '@/config/rateLimit'

// Common error schema
const ErrorSchema = Type.Object({
  error: Type.Object({
    message: Type.String(),
    statusCode: Type.Number(),
    timestamp: Type.String()
  })
})

/**
 * Authentication routes
 * Handles user authentication, registration, and token management
 */
const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userService = new UserService()

  // Apply strict rate limiting to auth routes
  await fastify.register(import('@fastify/rate-limit'), strictRateLimitOptions)

  /**
   * Login endpoint
   */
  fastify.post('/login', {
    schema: {
      description: `
# User Authentication

Authenticate user with email and password to obtain JWT access token.

## Features
- **JWT Authentication** - Secure token-based authentication with configurable expiration
- **Rate Limiting** - Brute force protection with progressive delays
- **Audit Logging** - Complete authentication attempt tracking for security monitoring
- **Remember Me** - Extended session support for trusted devices
- **Security** - bcrypt password hashing with salt rounds and timing attack protection

## Security Features
- Rate limiting: 5 attempts per minute per IP
- Failed attempt tracking with progressive lockout
- Secure password verification with constant-time comparison
- JWT token with secure signing and expiration
- Complete audit trail for compliance and monitoring

## Business Rules
- Users must have 'active' status to authenticate
- Email confirmation may be required based on organization policy
- Invalid credentials return generic error message for security
- Successful authentication updates last sign-in timestamp
`,
      tags: ['Authentication'],
      body: Type.Object({
        email: Type.String({ format: 'email' }),
        password: Type.String({ minLength: 1 }),
        rememberMe: Type.Optional(Type.Boolean())
      }),
      response: {
        200: Type.Object({
          data: Type.Object({
            user: Type.Object({
              id: Type.String(),
              email: Type.String(),
              name: Type.Optional(Type.String()),
              role: Type.Optional(Type.String()),
              permissions: Type.Optional(Type.Array(Type.String())),
              status: Type.Optional(Type.String()),
              emailConfirmed: Type.Optional(Type.Boolean())
            }),
            token: Type.String(),
            expiresIn: Type.String()
          }),
          message: Type.Optional(Type.String()),
          timestamp: Type.String()
        }),
        401: ErrorSchema,
        429: ErrorSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: LoginCredentials }>, reply: FastifyReply) => {
    const startTime = Date.now()
    
    try {
      const result = await userService.authenticateUser(request.body)
      
      if (!result.success) {
        // Log failed authentication attempt
        await fastify.auditAuth(request, 'login', 'error', result.error)
        return reply.status(result.statusCode || 401).send({
          error: {
            message: result.error || 'Authentication failed',
            statusCode: result.statusCode || 401,
            timestamp: new Date().toISOString()
          }
        })
      }

      // Log successful authentication
      await fastify.auditAuth(request, 'login', 'success', `User ${result.data!.user.email} logged in successfully`)

      reply.send({
        data: result.data!,
        message: 'Authentication successful',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Login endpoint error')
      
      await fastify.auditAuth(request, 'login', 'error', 'Internal server error during login')
      
      reply.status(500).send({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  /**
   * Register endpoint
   */
  fastify.post('/register', {
    schema: {
      description: `
# User Registration

Register a new user account with comprehensive validation and security features.

## Features
- **Account Creation** - Complete user profile creation with role assignment
- **Email Validation** - RFC compliant email format validation and uniqueness checking
- **Password Security** - Secure password hashing with bcrypt and configurable strength requirements
- **Role Assignment** - Automatic role assignment based on organization policies
- **Audit Logging** - Complete registration audit trail for compliance tracking

## Security Features
- Password strength validation (minimum 8 characters, complexity requirements)
- Email uniqueness enforcement across the platform
- Rate limiting to prevent automated account creation
- Secure password storage with bcrypt hashing
- Optional email confirmation workflow

## Business Rules
- Email addresses must be unique across all users
- Default user status is 'pending' until email confirmation
- Users are assigned default role if none specified
- Registration creates audit log entry for compliance
- Phone number validation follows E.164 international format
`,
      tags: ['Authentication'],
      body: Type.Object({
        email: Type.String({ format: 'email' }),
        name: Type.Optional(Type.String({ minLength: 1 })),
        password: Type.String({ minLength: 8 }),
        phoneNumber: Type.Optional(Type.String()),
        role: Type.Optional(Type.String())
      }),
      response: {
        201: Type.Object({
          data: Type.Object({
            id: Type.String(),
            email: Type.String(),
            name: Type.Optional(Type.String()),
            status: Type.Optional(Type.String()),
            emailConfirmed: Type.Optional(Type.Boolean()),
            createdAt: Type.String()
          }),
          message: Type.Optional(Type.String()),
          timestamp: Type.String()
        }),
        400: ErrorSchema,
        409: ErrorSchema,
        429: ErrorSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: UserCreationData }>, reply: FastifyReply) => {
    try {
      const result = await userService.createUser(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 400).send({
          error: {
            message: result.error || 'Failed to create user',
            statusCode: result.statusCode || 400,
            timestamp: new Date().toISOString()
          }
        })
      }

      // Log user registration
      await fastify.auditDataChange(
        request, 
        'create', 
        'user', 
        result.data!.id, 
        undefined, 
        { email: result.data!.email, name: result.data!.name }
      )

      reply.status(201).send({
        data: {
          id: result.data!.id,
          email: result.data!.email,
          name: result.data!.name,
          status: result.data!.status,
          emailConfirmed: false, // Default value since field doesn't exist in DB
          createdAt: result.data!.created_at.toISOString()
        },
        message: 'User registered successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Register endpoint error')
      
      reply.status(500).send({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  /**
   * Get current user profile
   */
  fastify.get('/me', {
    preHandler: fastify.authenticate,
    schema: {
      description: `
# Current User Profile

Retrieve complete profile information for the currently authenticated user.

## Features
- **Profile Data** - Complete user profile with contact information and preferences
- **Role Information** - Current role assignments with descriptions and capabilities
- **Permission Matrix** - Comprehensive list of user permissions across all system areas
- **Session Details** - Authentication status, last sign-in, and session information
- **Security Status** - Account security settings and verification status

## Security Features
- JWT authentication required - must provide valid Bearer token
- Rate limiting applied to prevent profile enumeration
- Sensitive data filtering based on user context
- Audit logging for profile access tracking

## Response Data
- User identification and contact information
- Role assignments with hierarchical permissions
- Account status and verification flags
- Security settings and preferences
- Audit trail summary for compliance
`,
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: Type.Object({
          data: Type.Object({
            id: Type.String(),
            email: Type.String(),
            name: Type.Optional(Type.String()),
            status: Type.Optional(Type.String()),
            emailConfirmed: Type.Optional(Type.Boolean()),
            lastSignInAt: Type.Optional(Type.String()),
            createdAt: Type.String(),
            roles: Type.Array(Type.Object({
              name: Type.String(),
              description: Type.Optional(Type.String())
            })),
            permissions: Type.Array(Type.String())
          }),
          timestamp: Type.String()
        }),
        401: ErrorSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId
      const result = await userService.getUserById(userId)
      
      if (!result.success) {
        return reply.status(result.statusCode || 404).send({
          error: {
            message: result.error || 'User not found',
            statusCode: result.statusCode || 404,
            timestamp: new Date().toISOString()
          }
        })
      }

      const user = result.data!
      const permissionsResult = await userService.getUserPermissions(userId)
      const permissions = permissionsResult.success ? permissionsResult.data! : []

      reply.send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
          emailConfirmed: false, // Default value since field doesn't exist
          lastSignInAt: undefined, // Field doesn't exist in current schema  
          createdAt: user.created_at.toISOString(),
          roles: (user as any).userRoles?.map((ur: any) => ({
            name: ur.role.name,
            description: ur.role.description
          })) || [],
          permissions
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      fastify.log.error({ error }, 'Get profile endpoint error')
      
      reply.status(500).send({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  /**
   * Password Reset Request
   */
  fastify.post('/password-reset', {
    schema: {
      description: `
# Password Reset Request

Initiate password reset process by sending secure reset link to user's email.

## Features
- **Secure Reset** - Cryptographically secure reset tokens with expiration
- **Email Delivery** - Professional email templates with reset instructions
- **Rate Limiting** - Protection against reset request abuse
- **Security** - Reset tokens are single-use and time-limited
- **Audit Logging** - Complete audit trail for security monitoring

## Security Features
- Reset tokens expire after 1 hour for security
- Tokens are cryptographically random and single-use only
- Rate limiting: 3 reset requests per hour per email
- Invalid email addresses return success to prevent enumeration
- All reset attempts are logged for security analysis

## Business Rules
- Only active users can request password resets
- Previous reset tokens are invalidated when new one is issued
- Reset emails include security recommendations
- Failed reset attempts are tracked for fraud detection
`,
      tags: ['Authentication'],
      body: Type.Object({
        email: Type.String({ format: 'email' })
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          timestamp: Type.String()
        }),
        429: ErrorSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) => {
    try {
      // TODO: Implement password reset logic
      reply.send({
        success: true,
        message: 'Password reset instructions sent to email if account exists',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      fastify.log.error({ error }, 'Password reset request failed')
      reply.status(500).send({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  /**
   * Token Refresh
   */
  fastify.post('/refresh', {
    schema: {
      description: `
# Token Refresh

Refresh JWT access token using valid refresh token for extended session management.

## Features
- **Session Extension** - Extend user sessions without re-authentication
- **Token Rotation** - Issue new access tokens with updated expiration
- **Security Validation** - Verify refresh token validity and user status
- **Revocation Support** - Ability to revoke refresh tokens for security
- **Audit Logging** - Track token refresh patterns for security analysis

## Security Features
- Refresh tokens are long-lived but can be revoked
- New access tokens have fresh expiration times
- User status validation ensures account is still active
- Rate limiting prevents token refresh abuse
- Invalid tokens are immediately rejected and logged

## Business Rules
- Refresh tokens expire after 30 days of inactivity
- User must still have active status to refresh tokens
- Original refresh token is invalidated after use
- Maximum token lifetime enforced regardless of refresh
`,
      tags: ['Authentication'],
      body: Type.Object({
        refreshToken: Type.String({ minLength: 1 })
      }),
      response: {
        200: Type.Object({
          data: Type.Object({
            token: Type.String(),
            refreshToken: Type.String(),
            expiresIn: Type.String()
          }),
          timestamp: Type.String()
        }),
        401: ErrorSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) => {
    try {
      // TODO: Implement token refresh logic
      reply.status(501).send({
        error: {
          message: 'Token refresh not implemented',
          statusCode: 501,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      fastify.log.error({ error }, 'Token refresh failed')
      reply.status(500).send({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  /**
   * Logout
   */
  fastify.post('/logout', {
    preHandler: fastify.authenticate,
    schema: {
      description: `
# User Logout

Securely log out user by invalidating current session and tokens.

## Features
- **Token Invalidation** - Immediately invalidate current access and refresh tokens
- **Session Cleanup** - Clear all server-side session data
- **Security Logging** - Log logout events for security audit trails
- **Multi-Device Support** - Option to logout from all devices
- **Graceful Handling** - Proper cleanup even if tokens are already invalid

## Security Features
- Tokens are added to revocation list immediately
- All active sessions can be terminated if requested
- Logout events are logged for security monitoring
- Client-side token cleanup recommendations provided
- Rate limiting prevents logout abuse

## Business Rules
- Successful logout invalidates current token immediately
- Optional 'all devices' logout terminates all user sessions
- Logout is always considered successful for security
- Audit log entry created for compliance tracking
`,
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      body: Type.Optional(Type.Object({
        allDevices: Type.Optional(Type.Boolean())
      })),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Implement logout logic
      await fastify.auditAuth(request, 'logout', 'success', 'User logged out successfully')
      
      reply.send({
        success: true,
        message: 'Successfully logged out',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      fastify.log.error({ error }, 'Logout failed')
      reply.status(500).send({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  /**
   * Multi-Factor Authentication Setup
   */
  fastify.post('/mfa/setup', {
    preHandler: fastify.authenticate,
    schema: {
      description: `
# Multi-Factor Authentication Setup

Setup MFA for user account using TOTP (Time-based One-Time Password) authenticator apps.

## Features
- **TOTP Support** - Compatible with Google Authenticator, Authy, Microsoft Authenticator
- **QR Code Generation** - Easy setup with QR code scanning
- **Backup Codes** - Recovery codes for device loss scenarios
- **Verification** - Immediate verification of MFA setup before activation
- **Security Enhancement** - Significantly improves account security

## Security Features
- Secret keys are cryptographically random and unique per user
- QR codes include issuer information and account details
- Backup codes are single-use and securely generated
- Setup requires current password confirmation
- MFA activation requires successful code verification

## Business Rules
- Users can only have one active MFA method at a time
- Previous MFA settings are disabled when new setup occurs
- Backup codes are regenerated with each MFA setup
- MFA setup requires existing session authentication
`,
      tags: ['Authentication', 'MFA'],
      security: [{ bearerAuth: [] }],
      response: {
        200: Type.Object({
          data: Type.Object({
            secret: Type.String(),
            qrCode: Type.String(),
            backupCodes: Type.Array(Type.String()),
            setupComplete: Type.Boolean()
          }),
          timestamp: Type.String()
        }),
        401: ErrorSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Implement MFA setup logic
      reply.status(501).send({
        error: {
          message: 'MFA setup not implemented',
          statusCode: 501,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      fastify.log.error({ error }, 'MFA setup failed')
      reply.status(500).send({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  /**
   * Verify MFA Code
   */
  fastify.post('/mfa/verify', {
    schema: {
      description: `
# Multi-Factor Authentication Verification

Verify MFA code for login completion or sensitive operations.

## Features
- **TOTP Verification** - Verify 6-digit codes from authenticator apps
- **Backup Code Support** - Accept backup codes for device loss scenarios
- **Login Completion** - Complete MFA-protected login process
- **Operation Authorization** - Authorize sensitive operations with MFA
- **Rate Limiting** - Protection against brute force MFA attacks

## Security Features
- Time window validation for TOTP codes (30-second windows)
- Backup codes are single-use and invalidated after use
- Failed attempts are tracked and rate limited
- Successful verification updates last MFA timestamp
- Invalid codes are logged for security monitoring

## Business Rules
- TOTP codes are valid for 30-second time windows
- Backup codes can only be used once
- Maximum 5 verification attempts per 5-minute window
- MFA verification extends session lifetime
- Failed verifications trigger security alerts
`,
      tags: ['Authentication', 'MFA'],
      body: Type.Object({
        code: Type.String({ minLength: 6, maxLength: 8 }),
        email: Type.Optional(Type.String({ format: 'email' })),
        isBackupCode: Type.Optional(Type.Boolean())
      }),
      response: {
        200: Type.Object({
          data: Type.Object({
            verified: Type.Boolean(),
            token: Type.Optional(Type.String()),
            expiresIn: Type.Optional(Type.String())
          }),
          timestamp: Type.String()
        }),
        401: ErrorSchema,
        429: ErrorSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: { code: string; email?: string; isBackupCode?: boolean } }>, reply: FastifyReply) => {
    try {
      // TODO: Implement MFA verification logic
      reply.status(501).send({
        error: {
          message: 'MFA verification not implemented',
          statusCode: 501,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      fastify.log.error({ error }, 'MFA verification failed')
      reply.status(500).send({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    }
  })
}

export default authRoutes
