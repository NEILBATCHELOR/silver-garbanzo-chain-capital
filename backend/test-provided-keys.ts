/**
 * Test the user-provided mnemonic and private key
 */

import { ethers } from 'ethers';
import { bech32 } from 'bech32';

const providedMnemonic = "unveil swim doll mother flag kitchen palm wink kiss digital dress legal";
const providedPrivateKey = "0xf7344e0f4e5e7f259e5fb42dd8e29ec5311a89783d31a9b1df5805b1f4fc6e7e";

// Expected addresses (from explorer with 10 INJ)
const expectedNativeAddress = "inj1mraqjk5e83dyrma4zpd0j4hhjghxtrr9sun2df";
const expectedEVMAddress = "0xd8fa095a993c5a41efb5105af956f7922e658c65";

console.log('🔍 Testing User-Provided Keys');
console.log('Expected Native Address:', expectedNativeAddress);
console.log('Expected EVM Address:', expectedEVMAddress);
console.log();

// Test 1: Private key derivation
console.log('📝 Test 1: Deriving from provided private key...');
try {
  const walletFromKey = new ethers.Wallet(providedPrivateKey);
  const derivedEVMAddress = walletFromKey.address;
  
  console.log('  - Derived EVM Address:', derivedEVMAddress);
  console.log('  - Expected EVM Address:', expectedEVMAddress);
  console.log('  - Match:', derivedEVMAddress.toLowerCase() === expectedEVMAddress.toLowerCase() ? '✅ YES' : '❌ NO');
  
  // Derive native Injective address from EVM address
  const addressBytes = Buffer.from(derivedEVMAddress.slice(2), 'hex');
  const words = bech32.toWords(addressBytes);
  const nativeAddress = bech32.encode('inj', words);
  
  console.log('  - Derived Native Address:', nativeAddress);
  console.log('  - Expected Native Address:', expectedNativeAddress);
  console.log('  - Match:', nativeAddress === expectedNativeAddress ? '✅ YES' : '❌ NO');
  console.log();
} catch (err) {
  console.error('  ❌ Failed:', err);
  console.log();
}

// Test 2: Mnemonic derivation
console.log('📝 Test 2: Deriving from provided mnemonic...');
try {
  const derivationPath = "m/44'/60'/0'/0/0";
  const hdWallet = ethers.HDNodeWallet.fromPhrase(providedMnemonic, undefined, derivationPath);
  
  const derivedEVMAddress = hdWallet.address;
  const derivedPrivateKey = hdWallet.privateKey;
  
  console.log('  - Derivation Path:', derivationPath);
  console.log('  - Derived EVM Address:', derivedEVMAddress);
  console.log('  - Expected EVM Address:', expectedEVMAddress);
  console.log('  - Match:', derivedEVMAddress.toLowerCase() === expectedEVMAddress.toLowerCase() ? '✅ YES' : '❌ NO');
  console.log('  - Derived Private Key:', derivedPrivateKey);
  console.log('  - Provided Private Key:', providedPrivateKey);
  console.log('  - Keys Match:', derivedPrivateKey.toLowerCase() === providedPrivateKey.toLowerCase() ? '✅ YES' : '❌ NO');
  
  // Derive native Injective address
  const addressBytes = Buffer.from(derivedEVMAddress.slice(2), 'hex');
  const words = bech32.toWords(addressBytes);
  const nativeAddress = bech32.encode('inj', words);
  
  console.log('  - Derived Native Address:', nativeAddress);
  console.log('  - Expected Native Address:', expectedNativeAddress);
  console.log('  - Match:', nativeAddress === expectedNativeAddress ? '✅ YES' : '❌ NO');
  console.log();
} catch (err) {
  console.error('  ❌ Failed:', err);
  console.log();
}

console.log('🏁 Test Complete');
