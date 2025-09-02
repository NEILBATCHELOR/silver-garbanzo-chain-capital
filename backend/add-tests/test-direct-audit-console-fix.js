/**
 * Direct database test for audit_logs table
 */

import { PrismaClient } from './src/infrastructure/database/generated/index.js'

async function testDirectAuditInsert() {
  console.log('🧪 Testing direct audit_logs insert...')
  
  let prisma
  try {
    // Initialize Prisma client
    console.log('📡 Connecting to database...')
    prisma = new PrismaClient()
    
    // Test simple insert
    const testEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: new Date(),
      action: 'direct_test',
      category: 'user_action',
      severity: 'low',
      details: 'Direct database test'
    }
    
    console.log('📤 Inserting test event...')
    const result = await prisma.audit_logs.create({
      data: testEvent
    })
    
    console.log('✅ SUCCESS! Event inserted:', result.id)
    
    // Clean up - delete the test event
    await prisma.audit_logs.delete({
      where: { id: result.id }
    })
    
    console.log('🧹 Test event cleaned up')
    
  } catch (error) {
    console.log('❌ FAILED:', error.message)
    console.log('📋 Full error:', error)
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}

testDirectAuditInsert()
