/**
 * Supabase Fastify Plugin
 * 
 * Registers Supabase client as a Fastify decorator
 * Makes Supabase available via fastify.supabase throughout the app
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import fp from 'fastify-plugin'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../config/env'

// Extend Fastify instance type to include supabase
declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient
  }
}

/**
 * Supabase plugin options
 */
export interface SupabasePluginOptions {
  url?: string
  serviceRoleKey?: string
}

/**
 * Fastify plugin to register Supabase client
 */
const supabasePlugin: FastifyPluginAsync<SupabasePluginOptions> = async (
  fastify: FastifyInstance,
  options: SupabasePluginOptions
) => {
  // Get Supabase credentials from options or environment (via centralized config)
  const supabaseUrl = options.url || SUPABASE_URL
  const supabaseKey = options.serviceRoleKey || SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase configuration missing. Please provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file'
    )
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Register as Fastify decorator
  fastify.decorate('supabase', supabase)

  fastify.log.info('✅ Supabase plugin registered')

  // Add shutdown hook to clean up
  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Closing Supabase connections...')
    // Supabase client doesn't need explicit cleanup
  })
}

// Export as fastify plugin with encapsulation disabled
export default fp(supabasePlugin, {
  name: 'supabase-plugin',
  fastify: '4.x'
})
