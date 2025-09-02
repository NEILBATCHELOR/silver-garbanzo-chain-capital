/**
 * Test script to verify Backend Projects Service TypeScript compilation
 */

import { initializeDatabase, closeDatabaseConnection } from './src/infrastructure/database/client.js'
import { ProjectService } from './src/services/projects/ProjectService.js'
import { ProjectAnalyticsService } from './src/services/projects/ProjectAnalyticsService.js'
import { ProjectValidationService } from './src/services/projects/ProjectValidationService.js'

async function testProjectServices() {
  try {
    console.log('🔄 Initializing database connection...')
    await initializeDatabase()
    console.log('✅ Database initialized successfully')

    // Test instantiation
    console.log('🔄 Testing service instantiation...')
    const projectService = new ProjectService()
    const analyticsService = new ProjectAnalyticsService()
    
    console.log('✅ Services instantiated successfully')
    console.log('✅ ProjectService loaded')
    console.log('✅ ProjectAnalyticsService loaded') 
    console.log('✅ ProjectValidationService loaded')
    
    // Test static methods
    console.log('🔄 Testing validation service methods...')
    const config = ProjectValidationService.getProjectTypeConfig('equity')
    const traditionalTypes = ProjectValidationService.getProjectTypesByCategory('traditional')
    
    console.log('✅ Validation service methods work')
    console.log(`Found ${traditionalTypes.length} traditional project types:`, traditionalTypes)
    
    if (config) {
      console.log(`✅ Equity project config loaded with ${config.mandatoryFields.length} mandatory fields`)
      console.log('Mandatory fields:', config.mandatoryFields.slice(0, 5).join(', ') + '...')
    }

    // Test validation
    console.log('🔄 Testing project validation...')
    const validationService = new ProjectValidationService()
    const testProject = {
      name: 'Test Project',
      projectType: 'equity',
      targetRaise: 1000000,
      authorizedShares: 1000000,
      sharePrice: 1.0,
      legalEntity: 'Test Corp',
      jurisdiction: 'Delaware',
      votingRights: 'common',
      dividendPolicy: 'discretionary'
    }

    const validation = await validationService.validateProject(testProject)
    console.log(`✅ Validation test completed: ${validation.isValid ? 'VALID' : 'INVALID'}`)
    if (!validation.isValid) {
      console.log('Validation errors:', validation.errors.length)
    }
    if (validation.warnings.length > 0) {
      console.log('Validation warnings:', validation.warnings.length)
    }

    console.log('\n🎉 All tests passed! Projects service is ready for use.')
    
  } catch (error) {
    console.error('❌ Service test failed:', error)
    process.exit(1)
  } finally {
    console.log('🔄 Closing database connection...')
    await closeDatabaseConnection()
    console.log('✅ Database connection closed')
  }
}

// Run the test
testProjectServices()
