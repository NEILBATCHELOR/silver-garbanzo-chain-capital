import { PrivateKey } from '@injectivelabs/sdk-ts';
import { ethers } from 'ethers';

// Test mnemonic from Injective docs
const testMnemonic = "indoor dish desk flag debris potato excuse depart ticket judge file exit";

console.log('🧪 Testing ACTUAL private key generation...\n');

// Method 1: Injective SDK
console.log('Method 1: PrivateKey.fromMnemonic()');
const pk1 = PrivateKey.fromMnemonic(testMnemonic);
console.log('PrivateKey object type:', typeof pk1);
console.log('PrivateKey object keys:', Object.keys(pk1));
console.log('Address (native):', pk1.toAddress().toBech32());
console.log('Address (EVM):', pk1.toAddress().toHex());

// Try to reconstruct from the PrivateKey - according to docs you can pass it to MsgBroadcasterWithPk
// Let's see if we can extract the actual hex
const address1 = pk1.toAddress();
console.log('');

// Method 2: ethers.js
console.log('Method 2: ethers.HDNodeWallet');
const hdWallet = ethers.HDNodeWallet.fromPhrase(testMnemonic, undefined, "m/44'/60'/0'/0/0");
console.log('Private Key:', hdWallet.privateKey);
console.log('Address (EVM):', hdWallet.address);

// Convert ethers private key to Injective PrivateKey
const pk2 = PrivateKey.fromHex(hdWallet.privateKey.slice(2));
const address2 = pk2.toAddress();
console.log('Address (native):', address2.toBech32());
console.log('Address (EVM):', address2.toHex());
console.log('');

// Test if we can reconstruct the same PrivateKey from the expected docs value
console.log('Method 3: Known private key from docs');
const expectedPrivateKey = "afdfd9c3d2095ef696594f6cedcae59e72dcd697e2a7521b1578140422a4f890";
const pk3 = PrivateKey.fromHex(expectedPrivateKey);
const address3 = pk3.toAddress();
console.log('Address (native):', address3.toBech32());
console.log('Address (EVM):', address3.toHex());
console.log('');

console.log('🔍 ADDRESS COMPARISON:');
console.log('Method 1 vs Method 2 (native):', address1.toBech32() === address2.toBech32());
console.log('Method 1 vs Method 2 (EVM):', address1.toHex() === address2.toHex());
console.log('Method 1 vs Expected (native):', address1.toBech32() === address3.toBech32());
console.log('Method 2 vs Expected (EVM):', address2.toHex() === address3.toHex());
console.log('');

console.log('📝 CONCLUSION:');
if (address1.toBech32() === address2.toBech32()) {
  console.log('✅ BOTH METHODS GENERATE THE SAME ADDRESSES');
  console.log('✅ The difference is just format: 0x prefix or not');
  console.log('✅ Your current implementation IS CORRECT!');
} else {
  console.log('❌ DIFFERENT ADDRESSES - METHODS USE DIFFERENT PATHS!');
}
