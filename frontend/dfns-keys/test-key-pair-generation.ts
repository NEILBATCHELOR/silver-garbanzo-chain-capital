/**
 * DFNS Key Pair Generator Test Script
 * 
 * Tests the key pair generation functionality for DFNS API authentication
 * Run this to generate new keys for PAT regeneration or service account creation
 */

import { DfnsKeyPairGenerator, DfnsAuthUtils } from '../src/infrastructure/dfns/key-pair-generator';

async function testKeyPairGeneration() {
  console.log('🔑 DFNS Key Pair Generation Test\n');

  try {
    // Check crypto support
    console.log('📋 Checking Web Crypto API support...');
    const cryptoSupport = DfnsKeyPairGenerator.checkCryptoSupport();
    
    if (!cryptoSupport.supported) {
      console.error('❌ Web Crypto API issues:', cryptoSupport.issues);
      return;
    }
    
    console.log('✅ Web Crypto API supported');
    console.log('   - ECDSA:', cryptoSupport.algorithms.ECDSA ? '✅' : '❌');
    console.log('   - EDDSA:', cryptoSupport.algorithms.EDDSA ? '✅' : '❌');
    console.log('   - RSA:', cryptoSupport.algorithms.RSA ? '✅' : '❌');
    console.log('');

    // Test EDDSA key generation (DFNS recommended)
    console.log('🔐 Generating EDDSA (Ed25519) key pair...');
    try {
      const eddsaKeys = await DfnsKeyPairGenerator.generateEDDSAKeyPair();
      console.log('✅ EDDSA key pair generated successfully');
      console.log('   Algorithm:', eddsaKeys.algorithm);
      console.log('   Curve:', eddsaKeys.curve);
      console.log('   Public Key (first 100 chars):', eddsaKeys.publicKey.substring(0, 100) + '...');
      console.log('   Private Key (first 100 chars):', eddsaKeys.privateKey.substring(0, 100) + '...');
      
      // Test signing with EDDSA
      console.log('\n🖊️  Testing EDDSA signing...');
      const testData = 'test-signing-data-' + Date.now();
      const eddsaSignature = await DfnsKeyPairGenerator.signData(testData, eddsaKeys.privateKey, 'EDDSA');
      console.log('✅ EDDSA signature created');
      console.log('   Signature:', eddsaSignature.signature.substring(0, 50) + '...');
      console.log('   Format:', eddsaSignature.format);
      console.log('   Encoding:', eddsaSignature.encoding);

      // Test DFNS auth headers
      console.log('\n📡 Testing DFNS authentication headers...');
      const authHeaders = await DfnsAuthUtils.createAuthHeaders(
        eddsaKeys.privateKey,
        'EDDSA',
        'test-credential-id',
        'GET',
        '/auth/credentials'
      );
      console.log('✅ DFNS auth headers created');
      console.log('   X-DFNS-TIMESTAMP:', authHeaders['X-DFNS-TIMESTAMP']);
      console.log('   X-DFNS-SIGNATURE:', authHeaders['X-DFNS-SIGNATURE'].substring(0, 50) + '...');
      
    } catch (error) {
      console.error('❌ EDDSA test failed:', error);
    }

    console.log('\n' + '='.repeat(60));

    // Test ECDSA key generation
    console.log('\n🔐 Generating ECDSA (secp256r1) key pair...');
    try {
      const ecdsaKeys = await DfnsKeyPairGenerator.generateECDSAKeyPair();
      console.log('✅ ECDSA key pair generated successfully');
      console.log('   Algorithm:', ecdsaKeys.algorithm);
      console.log('   Curve:', ecdsaKeys.curve);
      console.log('   Public Key (first 100 chars):', ecdsaKeys.publicKey.substring(0, 100) + '...');
      console.log('   Private Key (first 100 chars):', ecdsaKeys.privateKey.substring(0, 100) + '...');
      
      // Test signing with ECDSA
      console.log('\n🖊️  Testing ECDSA signing...');
      const testData = 'test-signing-data-' + Date.now();
      const ecdsaSignature = await DfnsKeyPairGenerator.signData(testData, ecdsaKeys.privateKey, 'ECDSA');
      console.log('✅ ECDSA signature created');
      console.log('   Signature:', ecdsaSignature.signature.substring(0, 50) + '...');
      console.log('   Format:', ecdsaSignature.format);
      console.log('   Encoding:', ecdsaSignature.encoding);
      
    } catch (error) {
      console.error('❌ ECDSA test failed:', error);
    }

    console.log('\n' + '='.repeat(60));

    // Test RSA key generation
    console.log('\n🔐 Generating RSA (3072 bits) key pair...');
    try {
      const rsaKeys = await DfnsKeyPairGenerator.generateRSAKeyPair();
      console.log('✅ RSA key pair generated successfully');
      console.log('   Algorithm:', rsaKeys.algorithm);
      console.log('   Public Key (first 100 chars):', rsaKeys.publicKey.substring(0, 100) + '...');
      console.log('   Private Key (first 100 chars):', rsaKeys.privateKey.substring(0, 100) + '...');
      
      // Test signing with RSA
      console.log('\n🖊️  Testing RSA signing...');
      const testData = 'test-signing-data-' + Date.now();
      const rsaSignature = await DfnsKeyPairGenerator.signData(testData, rsaKeys.privateKey, 'RSA');
      console.log('✅ RSA signature created');
      console.log('   Signature:', rsaSignature.signature.substring(0, 50) + '...');
      console.log('   Format:', rsaSignature.format);
      console.log('   Encoding:', rsaSignature.encoding);
      
    } catch (error) {
      console.error('❌ RSA test failed:', error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 Key pair generation testing complete!');
    console.log('\n📋 Next Steps for DFNS Authentication:');
    console.log('1. Copy the public key from your preferred algorithm (EDDSA recommended)');
    console.log('2. Use it to create a new credential in DFNS dashboard');
    console.log('3. Generate new PAT using the credential');
    console.log('4. Update environment variables with new credentials');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

/**
 * Generate keys specifically for DFNS credential creation
 */
async function generateDfnsCredentialKeys() {
  console.log('🎯 Generating DFNS Credential Keys\n');

  try {
    console.log('🔑 Generating Ed25519 key pair (DFNS recommended)...');
    const keys = await DfnsKeyPairGenerator.generateRecommendedKeyPair('EDDSA');
    
    console.log('\n✅ Key pair generated successfully!');
    console.log('\n📋 DFNS Credential Information:');
    console.log('');
    console.log('Algorithm:', keys.algorithm);
    console.log('Curve:', keys.curve);
    console.log('');
    console.log('🔑 PUBLIC KEY (copy this to DFNS):');
    console.log('----------------------------------------');
    console.log(keys.publicKey);
    console.log('----------------------------------------');
    console.log('');
    console.log('🔒 PRIVATE KEY (save securely - DO NOT SHARE):');
    console.log('----------------------------------------');
    console.log(keys.privateKey);
    console.log('----------------------------------------');
    console.log('');
    console.log('📝 Instructions:');
    console.log('1. Copy the PUBLIC KEY above');
    console.log('2. Go to DFNS dashboard → Credentials');
    console.log('3. Create new credential with the public key');
    console.log('4. Use the credential to generate new PAT');
    console.log('5. Save the PRIVATE KEY securely for signing operations');
    
    return keys;
  } catch (error) {
    console.error('❌ Failed to generate credential keys:', error);
    throw error;
  }
}

// Export for use in browser console or other scripts
(window as any).testKeyPairGeneration = testKeyPairGeneration;
(window as any).generateDfnsCredentialKeys = generateDfnsCredentialKeys;
(window as any).DfnsKeyPairGenerator = DfnsKeyPairGenerator;
(window as any).DfnsAuthUtils = DfnsAuthUtils;

console.log('🚀 DFNS Key Pair Generator loaded!');
console.log('');
console.log('Available functions:');
console.log('- testKeyPairGeneration(): Test all key generation methods');
console.log('- generateDfnsCredentialKeys(): Generate keys for DFNS credential creation');
console.log('');
console.log('Run testKeyPairGeneration() to start testing!');

export { testKeyPairGeneration, generateDfnsCredentialKeys };
