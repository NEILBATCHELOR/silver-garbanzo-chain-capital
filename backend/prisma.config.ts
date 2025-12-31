/**
 * Prisma v7 Configuration
 * Database connection configuration moved from schema.prisma per Prisma v7 requirements
 * @see https://pris.ly/d/config-datasource
 * @see https://pris.ly/d/prisma7-client-config
 */

import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: env('DATABASE_URL')
  }
})
