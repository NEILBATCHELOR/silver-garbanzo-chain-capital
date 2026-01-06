/**
 * Constructor Arguments Encoder
 * 
 * Replicates: cast abi-encode "constructor(address,address)" $IMPL $OWNER
 */

import { ethers } from 'ethers';

export class ConstructorArgsEncoder {
  /**
   * Encode constructor arguments for verification
   * Exact equivalent of: cast abi-encode "constructor(address,address)" $IMPL $OWNER
   * 
   * @param types - Array of parameter types (e.g., ['address', 'address'])
   * @param values - Array of parameter values
   * @returns ABI-encoded hex string WITHOUT '0x' prefix (Blockscout format)
   */
  static encode(types: string[], values: any[]): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    return abiCoder.encode(types, values).slice(2); // Remove '0x' prefix
  }

  /**
   * Encode beacon constructor args
   * TokenBeacon(address implementation, address owner)
   */
  static encodeBeaconArgs(
    implementationAddress: string,
    ownerAddress: string
  ): string {
    return this.encode(
      ['address', 'address'],
      [implementationAddress, ownerAddress]
    );
  }
}
