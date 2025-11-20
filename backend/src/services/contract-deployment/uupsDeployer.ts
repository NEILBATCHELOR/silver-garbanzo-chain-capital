/**
 * UUPS Proxy Deployment Handler
 * Handles deployment of UUPS upgradeable contracts through proxies
 */

import { ethers, Contract } from 'ethers';
import { ContractType } from './types';

/**
 * Contracts that require UUPS proxy deployment
 */
export const UUPS_CONTRACTS: Set<ContractType> = new Set([
  'extension_registry',
  'token_registry',
  'factory_registry',
  'policy_registry',
]);

/**
 * Initialization parameters for UUPS contracts
 */
interface UUPSInitParams {
  functionName: string;
  args: any[];
}

/**
 * Get initialization parameters for a UUPS contract
 */
export function getUUPSInitParams(
  contractType: ContractType,
  deployerAddress: string
): UUPSInitParams {
  switch (contractType) {
    case 'extension_registry':
    case 'token_registry':
    case 'factory_registry':
    case 'policy_registry':
      return {
        functionName: 'initialize',
        args: [deployerAddress], // Admin address
      };
    default:
      throw new Error(`No initialization params defined for ${contractType}`);
  }
}

/**
 * Deploy a UUPS upgradeable contract with proxy
 */
export async function deployUUPSContract(
  implementationContract: Contract,
  initParams: UUPSInitParams,
  signer: ethers.Signer
): Promise<{ proxy: Contract; implementation: Contract; proxyAddress: string }> {
  // Step 1: Deploy the implementation
  const implementationTx = await implementationContract.waitForDeployment();
  const implementationAddress = await implementationContract.getAddress();

  console.log(`📦 Implementation deployed at: ${implementationAddress}`);

  // Step 2: Encode initialization data
  const initData = implementationContract.interface.encodeFunctionData(
    initParams.functionName,
    initParams.args
  );

  // Step 3: Deploy ERC1967 proxy with initialization
  const ERC1967ProxyABI = [
    'constructor(address implementation, bytes memory _data)',
    'function implementation() external view returns (address)',
    'function admin() external view returns (address)',
  ];

  const ERC1967ProxyBytecode =
    '0x60806040526040516103e83803806103e883398101604081905261002291610268565b61002c8282610033565b5050610352565b61003c82610092565b6040516001600160a01b038316907fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b90600090a280511561008657610081828261010e565b505050565b61008e610185565b5050565b806001600160a01b03163b6000036100d757604051634c9c8ce360e01b81526001600160a01b03821660048201526024015b60405180910390fd5b7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc80546001600160a01b0319166001600160a01b0392909216919091179055565b6060600080846001600160a01b03168460405161012b9190610336565b600060405180830381855af49150503d8060008114610166576040519150601f19603f3d011682016040523d82523d6000602084013e61016b565b606091505b50909250905061017c8583836101a6565b95945050505050565b34156101a45760405163b398979f60e01b815260040160405180910390fd5b565b6060826101bb576101b682610205565b6101fe565b81511580156101d257506001600160a01b0384163b155b156101fb57604051639996b31560e01b81526001600160a01b03851660048201526024016100ce565b50805b9392505050565b8051156102155780518082602001fd5b604051630a12f52160e11b815260040160405180910390fd5b634e487b7160e01b600052604160045260246000fd5b60005b8381101561025f578181015183820152602001610247565b50506000910152565b6000806040838503121561027b57600080fd5b82516001600160a01b038116811461029257600080fd5b60208401519092506001600160401b03808211156102af57600080fd5b818501915085601f8301126102c357600080fd5b8151818111156102d5576102d561022e565b604051601f8201601f19908116603f011681019083821181831017156102fd576102fd61022e565b8160405282815288602084870101111561031657600080fd5b610327836020830160208801610244565b80955050505050509250929050565b60008251610348818460208701610244565b9190910192915050565b6088806103606000396000f3fe6080604052600a600c565b005b60186014601a565b6051565b565b6000604c7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc546001600160a01b031690565b905090565b3660008037600080366000845af43d6000803e808015606f573d6000f35b3d6000fdfea264697066735822122002dd006cbb8e11c5e0a57d9c74f8e89b07c2f9e62c00b7f0e9f45e876a5bac7964736f6c63430008170033';

  const proxyFactory = new ethers.ContractFactory(
    ERC1967ProxyABI,
    ERC1967ProxyBytecode,
    signer
  );

  const proxy = await proxyFactory.deploy(implementationAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  console.log(`✅ Proxy deployed at: ${proxyAddress}`);
  console.log(`🔗 Proxy points to implementation: ${implementationAddress}`);

  // Create a contract instance at the proxy address using the implementation ABI
  const proxyWithImplementationABI = new ethers.Contract(
    proxyAddress,
    implementationContract.interface,
    signer
  );

  return {
    proxy: proxyWithImplementationABI,
    implementation: implementationContract,
    proxyAddress,
  };
}

/**
 * Check if a contract type requires UUPS proxy deployment
 */
export function isUUPSContract(contractType: ContractType): boolean {
  return UUPS_CONTRACTS.has(contractType);
}
