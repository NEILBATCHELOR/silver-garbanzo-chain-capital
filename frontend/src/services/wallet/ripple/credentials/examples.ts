/**
 * XRPL Credentials Service - Usage Examples
 * Demonstrates common use cases for blockchain-based verifiable credentials
 */

import { Wallet } from 'xrpl'
import { XRPLCredentialService } from './XRPLCredentialService'
import { xrplClientManager } from '../core'

/**
 * Example 1: Issue a KYC Verification Credential
 */
export async function exampleIssueKYCCredential() {
  // Get XRPL client (use TESTNET for testing)
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  // Issuer wallet (KYC provider)
  const issuerWallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXXXXX')
  
  // Subject address (user being verified)
  const subjectAddress = 'rN7n7otQDd6FczFgLdllqpBayJvTpJNTjQz'

  // Issue KYC credential
  const result = await credentialService.issueCredential(issuerWallet, {
    subject: subjectAddress,
    credentialType: 'KYC_VERIFIED',
    data: {
      level: 'enhanced',
      verifiedAt: new Date().toISOString(),
      jurisdiction: 'US',
      verificationMethod: 'document_check',
      attributes: {
        identity: true,
        address: true,
        phoneNumber: true
      }
    },
    expiration: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
  })

  console.log('✅ KYC Credential Issued')
  console.log('Credential ID:', result.credentialId)
  console.log('Transaction Hash:', result.transactionHash)
  
  return result
}

/**
 * Example 2: Subject Accepts a Credential
 */
export async function exampleAcceptCredential(credentialId: string) {
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  // Subject wallet
  const subjectWallet = Wallet.fromSeed('sYYYYYYYYYYYYYYYYYYYYY')

  // Accept the credential
  const result = await credentialService.acceptCredential(subjectWallet, {
    credentialId
  })

  console.log('✅ Credential Accepted')
  console.log('Transaction Hash:', result.transactionHash)
  
  return result
}

/**
 * Example 3: Verify a Credential
 */
export async function exampleVerifyCredential(credentialId: string) {
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  // Verify the credential
  const verification = await credentialService.verifyCredential(credentialId)

  console.log('✅ Credential Verification')
  console.log('Is Valid:', verification.isValid)
  console.log('Is Expired:', verification.isExpired)
  console.log('Issuer:', verification.issuer)
  console.log('Subject:', verification.subject)
  console.log('Type:', verification.credentialType)
  console.log('Data:', JSON.stringify(verification.data, null, 2))
  
  if (verification.expiration) {
    console.log('Expires:', new Date(verification.expiration * 1000).toISOString())
  }

  return verification
}

/**
 * Example 4: Issue Accredited Investor Credential
 */
export async function exampleIssueAccreditedInvestorCredential() {
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  const issuerWallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXXXXX')
  const subjectAddress = 'rN7n7otQDd6FczFgLdllqpBayJvTpJNTjQz'

  const result = await credentialService.issueCredential(issuerWallet, {
    subject: subjectAddress,
    credentialType: 'ACCREDITED_INVESTOR',
    data: {
      accreditationType: 'income_based',
      annualIncome: '> $200,000',
      verifiedAt: new Date().toISOString(),
      verifier: 'SEC Registered Broker',
      netWorth: '> $1,000,000',
      jurisdiction: 'US'
    },
    expiration: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
  })

  console.log('✅ Accredited Investor Credential Issued')
  console.log('Credential ID:', result.credentialId)
  
  return result
}

/**
 * Example 5: Get All Credentials for an Account
 */
export async function exampleGetAccountCredentials(address: string) {
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  const credentials = await credentialService.getAccountCredentials(address)

  console.log(`✅ Found ${credentials.length} credentials for ${address}`)
  
  credentials.forEach((cred, index) => {
    console.log(`\n--- Credential ${index + 1} ---`)
    console.log('ID:', cred.credentialId)
    console.log('Type:', cred.credentialType)
    console.log('Issuer:', cred.issuer)
    console.log('Subject:', cred.subject)
    if (cred.expiration) {
      console.log('Expires:', new Date(cred.expiration * 1000).toISOString())
    }
  })

  return credentials
}

/**
 * Example 6: Get Issued vs Received Credentials
 */
export async function exampleFilterCredentials(address: string) {
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  // Get credentials issued by this address
  const issued = await credentialService.getIssuedCredentials(address)
  console.log(`✅ ${issued.length} credentials issued by ${address}`)

  // Get credentials received by this address
  const received = await credentialService.getReceivedCredentials(address)
  console.log(`✅ ${received.length} credentials received by ${address}`)

  return { issued, received }
}

/**
 * Example 7: Delete/Revoke a Credential
 */
export async function exampleDeleteCredential(credentialId: string) {
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  // Issuer or subject can delete
  const wallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXXXXX')

  const result = await credentialService.deleteCredential(wallet, {
    credentialId
  })

  console.log('✅ Credential Deleted')
  console.log('Transaction Hash:', result.transactionHash)
  
  return result
}

/**
 * Example 8: Issue Professional License Credential
 */
export async function exampleIssueProfessionalLicense() {
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  const issuerWallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXXXXX')
  const subjectAddress = 'rN7n7otQDd6FczFgLdllqpBayJvTpJNTjQz'

  const result = await credentialService.issueCredential(issuerWallet, {
    subject: subjectAddress,
    credentialType: 'PROFESSIONAL_LICENSE',
    data: {
      licenseType: 'CPA',
      licenseNumber: 'CPA-12345',
      jurisdiction: 'California',
      issuedDate: '2020-01-01',
      status: 'active',
      specializations: ['tax', 'audit', 'advisory']
    },
    expiration: Math.floor(Date.now() / 1000) + (730 * 24 * 60 * 60) // 2 years
  })

  console.log('✅ Professional License Credential Issued')
  console.log('Credential ID:', result.credentialId)
  
  return result
}

/**
 * Example 9: Comprehensive Credential Verification with Timestamp
 */
export async function exampleComprehensiveVerification(credentialId: string) {
  const client = await xrplClientManager.getClient('TESTNET')
  const credentialService = new XRPLCredentialService(client)

  const verification = await credentialService.performCredentialVerification(
    credentialId
  )

  console.log('✅ Comprehensive Verification Complete')
  console.log('Verified At:', verification.verifiedAt)
  console.log('Status:', verification.isValid ? 'VALID' : 'INVALID')
  console.log('Expired:', verification.isExpired ? 'YES' : 'NO')
  console.log('Credential Type:', verification.credentialType)
  
  return verification
}

/**
 * Example 10: Full Workflow - Issue, Accept, Verify
 */
export async function exampleFullWorkflow() {
  console.log('🚀 Starting Full Credential Workflow\n')

  // Step 1: Issue credential
  console.log('📝 Step 1: Issuing credential...')
  const issueResult = await exampleIssueKYCCredential()
  
  // Wait a moment for blockchain confirmation
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Step 2: Accept credential
  console.log('\n✋ Step 2: Accepting credential...')
  await exampleAcceptCredential(issueResult.credentialId)
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Step 3: Verify credential
  console.log('\n🔍 Step 3: Verifying credential...')
  const verification = await exampleVerifyCredential(issueResult.credentialId)

  console.log('\n✅ Full Workflow Complete!')
  console.log('Final Status:', verification.isValid ? 'VALID' : 'INVALID')

  return {
    credentialId: issueResult.credentialId,
    verification
  }
}

/**
 * Run all examples (for testing)
 */
export async function runAllExamples() {
  try {
    // Example 1: Issue KYC credential
    const kycCred = await exampleIssueKYCCredential()
    
    // Example 2: Accept credential
    await exampleAcceptCredential(kycCred.credentialId)
    
    // Example 3: Verify credential
    await exampleVerifyCredential(kycCred.credentialId)
    
    // Example 4: Issue accredited investor credential
    await exampleIssueAccreditedInvestorCredential()
    
    // Example 5: Get account credentials
    await exampleGetAccountCredentials('rN7n7otQDd6FczFgLdllqpBayJvTpJNTjQz')
    
    console.log('\n✅ All examples completed successfully!')
  } catch (error) {
    console.error('❌ Error running examples:', error)
  }
}
