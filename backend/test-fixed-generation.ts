/**
 * Test the FIXED Injective wallet generation
 */

import { ethers } from 'ethers';
import { PrivateKey } from '@injectivelabs/sdk-ts';

const testMnemonic = "unveil swim doll mother flag kitchen palm wink kiss digital dress legal";

console.log('🧪 Testing FIXED Injective Wallet Generation');
console.log('Mnemonic:', testMnemonic);
console.log();

// Method 1: Using ethers (what the fix uses)
console.log('📝 Method 1: Using ethers (FIXED approach)');
const hdWallet = ethers.HDNodeWallet.fromPhrase(testMnemonic, undefined, "m/44'/60'/0'/0/0");
const evmPrivateKey = hdWallet.privateKey;
const evmAddress = hdWallet.address;

console.log('  - EVM Address:', evmAddress);
console.log('  - EVM Private Key:', evmPrivateKey);

// Now convert to Injective native address
const privateKey = PrivateKey.fromHex(evmPrivateKey.slice(2));
const publicKey = privateKey.toPublicKey();
const nativeAddress = publicKey.toAddress().toBech32();

console.log('  - Native Address:', nativeAddress);
console.log('  - Public Key:', publicKey.toBase64());
console.log();

// Method 2: Direct Injective SDK (OLD buggy approach)
console.log('📝 Method 2: Direct Injective SDK (OLD approach)');
const oldPrivateKey = PrivateKey.fromMnemonic(testMnemonic);
const oldPublicKey = oldPrivateKey.toPublicKey();
const oldAddress = oldPublicKey.toAddress().toBech32();

console.log('  - Native Address:', oldAddress);
console.log('  - Matches Method 1?', oldAddress === nativeAddress ? '✅ YES' : '❌ NO');
console.log();

console.log('🎯 Expected (from your generation):');
console.log('  - Native: inj18xdue39yrnnq2n8nzvz79lnrdxfaywrcf3hk75');
console.log('  - EVM: 0x399bccc4a41ce6054cf31a9b1df5805b1f4fc6e7e');
console.log();

console.log('🏁 Results:');
console.log('  - Method 1 Native matches expected?', nativeAddress === 'inj18xdue39yrnnq2n8nzvz79lnrdxfaywrcf3hk75' ? '✅ YES' : '❌ NO');
console.log('  - Method 1 EVM matches expected?', evmAddress.toLowerCase() === '0x399bccc4a41ce6054cf31a9b1df5805b1f4fc6e7e'.toLowerCase() ? '✅ YES' : '❌ NO');
console.log('  - Method 2 Native matches expected?', oldAddress === 'inj18xdue39yrnnq2n8nzvz79lnrdxfaywrcf3hk75' ? '✅ YES' : '❌ NO');
