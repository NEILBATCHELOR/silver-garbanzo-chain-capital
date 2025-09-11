/**
 * DFNS Key Signature Services - Usage Examples
 * 
 * Comprehensive examples showing how to use the new Key Signature Generation Services
 * for different blockchain networks with your Service Account/PAT token authentication
 */

import { initializeDfnsService } from '../frontend/src/services/dfns';
import { 
  getDfnsEvmKeySignatureService,
  getDfnsBitcoinKeySignatureService 
} from '../frontend/src/services/dfns/keySignatureServices';

// ==============================================
// BASIC SETUP
// ==============================================

async function setupDfnsServices() {
  // Initialize main DFNS service (uses your Service Account/PAT tokens)
  const dfnsService = await initializeDfnsService();
  
  // Verify authentication
  const authStatus = await dfnsService.getAuthenticationStatus();
  if (!authStatus.isAuthenticated) {
    throw new Error('DFNS authentication failed - check your tokens');
  }
  
  console.log(`✅ DFNS authenticated via ${authStatus.methodDisplayName}`);
  
  return dfnsService;
}

// ==============================================
// KEY MANAGEMENT EXAMPLES
// ==============================================

async function createKeysForMultichain() {
  const dfnsService = await setupDfnsServices();
  const keyService = dfnsService.getKeyService();
  
  // Create ECDSA key for Bitcoin/Ethereum (most versatile)
  const ecdsaKey = await keyService.createKey({
    scheme: 'ECDSA',
    curve: 'secp256k1',
    name: 'Multi-chain ECDSA Key'
  }, userActionToken);
  
  console.log('🔑 Created ECDSA key:', ecdsaKey.id);
  
  // Create EdDSA key for Solana/Cosmos
  const eddsaKey = await keyService.createKey({
    scheme: 'EdDSA', 
    curve: 'ed25519',
    name: 'EdDSA Key for Solana'
  }, userActionToken);
  
  console.log('🔑 Created EdDSA key:', eddsaKey.id);
  
  return { ecdsaKey, eddsaKey };
}

// ==============================================
// UNIVERSAL HASH SIGNING EXAMPLES
// ==============================================

async function universalHashSigningExample() {
  const dfnsService = await setupDfnsServices();
  const keySignatureService = dfnsService.getKeySignatureGenerationService();
  
  const keyId = 'key-1f04s-lqc9q-xxxxxxxxxxxxxxxx'; // Your key ID
  const hash = '0x031edd7d41651593c5fe5c006fa5752b37fddff7bc4e843aa6af0c950f4b9406';
  
  // Universal hash signing (works with any key scheme)
  const signature = await keySignatureService.signHash(
    keyId,
    hash,
    undefined, // taprootMerkleRoot (only for Schnorr keys)
    userActionToken
  );
  
  console.log('✅ Hash signature:', {
    id: signature.id,
    status: signature.status,
    r: signature.signature?.r,
    s: signature.signature?.s
  });
  
  return signature;
}

// ==============================================
// EVM BLOCKCHAIN EXAMPLES
// ==============================================

async function evmSigningExamples() {
  const dfnsService = await setupDfnsServices();
  const evmService = getDfnsEvmKeySignatureService(dfnsService.getWorkingClient());
  
  const keyId = 'key-1f04s-lqc9q-xxxxxxxxxxxxxxxx'; // Your ECDSA key ID
  
  // 1. EVM Transaction Signing
  const unsignedTx = '0x02e783aa36a71503850d40e49def82520894e5a2ebc128e262ab1e3bd02bffbe16911adfbffb0180c0';
  
  const txSignature = await evmService.signTransaction(
    keyId,
    unsignedTx,
    { userActionToken }
  );
  
  console.log('✅ EVM transaction signed:', txSignature.id);
  
  // 2. EVM Message Signing (personal_sign)
  const messageSignature = await evmService.signMessage(
    keyId,
    'Hello, DFNS!', // Automatically converts to hex
    { userActionToken }
  );
  
  console.log('✅ EVM message signed:', messageSignature.id);
  
  // 3. EIP-712 Typed Data Signing
  const typedDataSignature = await evmService.signTypedData(
    keyId,
    {
      types: {
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' }
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' }
        ]
      },
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: '0x1b352de7a926ebd1bf52194dab487c2cb0793a9b'
      },
      message: {
        from: {
          name: 'Alice',
          wallet: '0x00e3495cf6af59008f22ffaf32d4c92ac33dac47'
        },
        to: {
          name: 'Bob', 
          wallet: '0xcc0ee1a1c5e788b61916c8f1c96c960f9a9d3db7'
        },
        contents: 'Hello, Bob!'
      }
    },
    { userActionToken }
  );
  
  console.log('✅ EIP-712 typed data signed:', typedDataSignature.id);
  
  // Network utilities
  const networks = evmService.getSupportedNetworks();
  console.log('🌐 Supported EVM networks:', networks.length);
  
  const isEthereumSupported = evmService.isChainSupported(1);
  console.log('🔍 Ethereum supported:', isEthereumSupported);
  
  return { txSignature, messageSignature, typedDataSignature };
}

// ==============================================
// BITCOIN BLOCKCHAIN EXAMPLES  
// ==============================================

async function bitcoinSigningExamples() {
  const dfnsService = await setupDfnsServices();
  const bitcoinService = getDfnsBitcoinKeySignatureService(dfnsService.getWorkingClient());
  
  const keyId = 'key-1f04s-lqc9q-xxxxxxxxxxxxxxxx'; // Your ECDSA secp256k1 key ID
  
  // 1. PSBT Signing
  const psbt = '0x70736274ff0100710200000001ca17431a33a13d3ef8bfb041c8546071f9d3a609abe3c91efbed83265e1426730100000000ffffffff02e803000000000000160014a40a65b46ff36c53f1afb8e35e25a4c0bcfc9979d6d1150000000000160014237ad8ba2ffd992f6ebc7ab388e77f00fc87d1c9000000000001011f54d6150000000000160014237ad8ba2ffd992f6ebc7ab388e77f00fc87d1c9000000';
  
  const psbtSignature = await bitcoinService.signPsbt(
    keyId,
    { psbt, network: 'Bitcoin' },
    { userActionToken }
  );
  
  console.log('✅ Bitcoin PSBT signed:', psbtSignature.id);
  
  // 2. BIP-322 Message Signing
  const bip322Signature = await bitcoinService.signBip322Message(
    keyId,
    {
      message: 'I love DFNS',
      network: 'Bitcoin',
      format: 'Simple'
    },
    { userActionToken }
  );
  
  console.log('✅ Bitcoin BIP-322 message signed:', bip322Signature.id);
  
  // Network utilities
  const networks = bitcoinService.getSupportedNetworks();
  console.log('🌐 Supported Bitcoin networks:', networks.map(n => n.name));
  
  // Address validation
  const validAddress = bitcoinService.validateAddressForNetwork(
    'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'Bitcoin'
  );
  console.log('🔍 Address validation:', validAddress);
  
  // Address type detection
  const addressType = bitcoinService.getAddressType('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
  console.log('🏷️ Address type:', addressType); // 'p2wpkh'
  
  // Fee estimation
  const estimatedFee = bitcoinService.estimateTransactionFee(2, 1, 10); // 2 inputs, 1 output, 10 sat/byte
  console.log('💰 Estimated fee:', estimatedFee, 'satoshis');
  
  // Unit conversion
  const satoshis = bitcoinService.btcToSatoshis(0.001);
  const btc = bitcoinService.satoshisToBtc(100000);
  console.log('🔄 Conversions:', { satoshis, btc });
  
  return { psbtSignature, bip322Signature };
}

// ==============================================
// OTHER BLOCKCHAIN EXAMPLES
// ==============================================

async function otherBlockchainSigningExamples() {
  const dfnsService = await setupDfnsServices();
  const keySignatureService = dfnsService.getKeySignatureGenerationService();
  
  const eddsaKeyId = 'key-2g05t-mrd0r-xxxxxxxxxxxxxxxx'; // Your EdDSA key ID
  
  // 1. Solana Transaction Signing
  const solanaSignature = await keySignatureService.signSolanaTransaction(
    eddsaKeyId,
    '0x01000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008001000103b25c8c464080ab2835a166d2b3f13195c2ff3c8f281c7ebe492f0d45d830ff4824a8b38a94b73d2756f2be68655a49706be9b1dc900978984d6eeaf65ab62e900000000000000000000000000000000000000000000000000000000000000000ed589eed2559d935c834cd6d6cbee12970423ad37853618d39e632032aa4c51201020200010c02000000010000000000000000',
    userActionToken
  );
  
  console.log('✅ Solana transaction signed:', solanaSignature.id);
  
  // 2. Cosmos SignDoc Signing
  const cosmosSignature = await keySignatureService.signCosmosSignDocDirect(
    eddsaKeyId,
    '0x0a89010a86010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412660a2b6f736d6f313366796d6d61797430727a72366d6130716439686a6d71747433706b37787737736871666b70122b6f736d6f313378396b70343573366e6539686a6738356b333867346d7a687067337435766a666c30356b6c1a0a0a05756f736d6f12013112640a4e0a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a210286a1b7ce6ae2b5b33c47d0b6c91bb28e4cdb786d15f4497adcdaa69640ca0db512040a02080112120a0c0a05756f736d6f120337353010e0a7121a0b6f736d6f2d746573742d3520e39f06',
    userActionToken
  );
  
  console.log('✅ Cosmos SignDoc signed:', cosmosSignature.id);
  
  // 3. Algorand Transaction Signing
  const algorandSignature = await keySignatureService.signAlgorandTransaction(
    eddsaKeyId,
    'msgpack-encoded-transaction-here',
    userActionToken
  );
  
  console.log('✅ Algorand transaction signed:', algorandSignature.id);
  
  return { solanaSignature, cosmosSignature, algorandSignature };
}

// ==============================================
// SIGNATURE STATISTICS AND MONITORING
// ==============================================

async function signatureAnalyticsExamples() {
  const dfnsService = await setupDfnsServices();
  const keySignatureService = dfnsService.getKeySignatureGenerationService();
  const evmService = getDfnsEvmKeySignatureService(dfnsService.getWorkingClient());
  
  const keyId = 'key-1f04s-lqc9q-xxxxxxxxxxxxxxxx';
  
  // Overall key signature statistics
  const overallStats = await keySignatureService.getKeySignatureStatistics(keyId);
  console.log('📊 Overall signature stats:', {
    total: overallStats.total,
    pending: overallStats.pending,
    signed: overallStats.signed,
    failed: overallStats.failed,
    byBlockchain: overallStats.byBlockchain,
    byKind: overallStats.byKind
  });
  
  // EVM-specific statistics
  const evmStats = await evmService.getEvmSignatureStatistics(keyId);
  console.log('📊 EVM signature stats:', {
    total: evmStats.total,
    transactions: evmStats.transactions,
    messages: evmStats.messages,
    eip712: evmStats.eip712,
    byNetwork: evmStats.byNetwork
  });
  
  // Pending signatures
  const pendingSignatures = await keySignatureService.getPendingKeySignatures(keyId);
  console.log('⏳ Pending signatures:', pendingSignatures.length);
  
  // Recent signatures
  const recentSignatures = await keySignatureService.getRecentKeySignatures(keyId, 5);
  console.log('🕒 Recent signatures:', recentSignatures.map(s => ({
    id: s.id,
    status: s.status,
    kind: s.requestBody.kind,
    date: s.dateRequested
  })));
  
  return { overallStats, evmStats, pendingSignatures, recentSignatures };
}

// ==============================================
// USER ACTION SIGNING WORKFLOW
// ==============================================

async function userActionSigningWorkflow() {
  const dfnsService = await setupDfnsServices();
  const userActionService = dfnsService.getUserActionSigningService();
  const credentialService = dfnsService.getCredentialService();
  
  // 1. Check available credentials for User Action Signing
  const credentials = await credentialService.listCredentials();
  const signingCredentials = credentials.filter(c => 
    c.kind === 'Key' && c.status === 'Active'
  );
  
  console.log('🔐 Available signing credentials:', signingCredentials.length);
  
  if (signingCredentials.length === 0) {
    console.log('⚠️ No signing credentials found. Creating WebAuthn credential...');
    
    // Create WebAuthn credential for signing
    const webauthnCredential = await credentialService.createWebAuthnCredential('My Device');
    console.log('✅ WebAuthn credential created:', webauthnCredential.id);
    
    // Note: For key credentials, you'd need to register a key with DFNS
    // This requires private key material which should be handled securely
  }
  
  // 2. Example User Action Signing process (with Key credential)
  if (signingCredentials.length > 0) {
    const keyCredential = signingCredentials[0];
    
    // You would use your private key here (this is pseudocode)
    const privateKey = 'your-private-key-material'; // Handle securely!
    
    const userActionToken = await userActionService.signUserAction({
      userActionPayload: JSON.stringify({ 
        kind: 'Transaction',
        transaction: '0x...' 
      }),
      userActionHttpMethod: 'POST',
      userActionHttpPath: '/keys/key-123/signatures'
    }, privateKey, keyCredential.id, 'EDDSA');
    
    console.log('✅ User Action signed successfully');
    return userActionToken;
  }
  
  return null;
}

// ==============================================
// COMPLETE WORKFLOW EXAMPLE
// ==============================================

async function completeWorkflowExample() {
  console.log('🚀 Starting complete DFNS Key Signature workflow...\n');
  
  try {
    // 1. Setup and authentication
    console.log('1️⃣ Setting up DFNS services...');
    const dfnsService = await setupDfnsServices();
    
    // 2. Key management
    console.log('2️⃣ Managing cryptographic keys...');
    // const keys = await createKeysForMultichain(); // Uncomment to create new keys
    
    // 3. Universal signing
    console.log('3️⃣ Testing universal hash signing...');
    // const hashSig = await universalHashSigningExample(); // Requires User Action token
    
    // 4. EVM blockchain signing
    console.log('4️⃣ Testing EVM blockchain signatures...');
    // const evmSigs = await evmSigningExamples(); // Requires User Action token
    
    // 5. Bitcoin blockchain signing
    console.log('5️⃣ Testing Bitcoin blockchain signatures...');
    // const bitcoinSigs = await bitcoinSigningExamples(); // Requires User Action token
    
    // 6. Other blockchain signing
    console.log('6️⃣ Testing other blockchain signatures...');
    // const otherSigs = await otherBlockchainSigningExamples(); // Requires User Action token
    
    // 7. Analytics and monitoring
    console.log('7️⃣ Analyzing signature statistics...');
    // const analytics = await signatureAnalyticsExamples(); // Requires existing signatures
    
    // 8. User Action Signing workflow
    console.log('8️⃣ Setting up User Action Signing...');
    const userActionToken = await userActionSigningWorkflow();
    
    console.log('\n✅ Complete workflow demonstration finished successfully!');
    console.log('💡 Uncomment individual examples to test with your keys and tokens.');
    
  } catch (error) {
    console.error('❌ Workflow failed:', error);
    throw error;
  }
}

// ==============================================
// EXPORTS FOR MODULE USAGE
// ==============================================

export {
  setupDfnsServices,
  createKeysForMultichain,
  universalHashSigningExample,
  evmSigningExamples,
  bitcoinSigningExamples,
  otherBlockchainSigningExamples,
  signatureAnalyticsExamples,
  userActionSigningWorkflow,
  completeWorkflowExample
};

// Run complete workflow if this file is executed directly
if (require.main === module) {
  completeWorkflowExample().catch(console.error);
}