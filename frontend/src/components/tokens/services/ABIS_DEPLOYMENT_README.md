# ABIs and Deployment Guide

## Overview
This guide explains how ABIs are generated, where they're located, and how to use them in the frontend services.

## ABI Generation

### Build Command
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts
~/.foundry/bin/forge build
```

### ABI Locations
After building, ABIs are generated in: `/frontend/foundry-contracts/out/`

Each contract gets its own directory with a JSON file containing:
- **ABI**: The interface definition (functions, events, parameters)
- **Bytecode**: The compiled contract code
- **Metadata**: Compiler version, optimization settings, etc.

### Key ABI Files

#### Token Master Contracts
- `out/ERC20Master.sol/ERC20Master.json` - Fungible token master
- `out/ERC721Master.sol/ERC721Master.json` - NFT master
- `out/ERC1155Master.sol/ERC1155Master.json` - Multi-token master
- `out/ERC3525Master.sol/ERC3525Master.json` - Semi-fungible token master
- `out/ERC4626Master.sol/ERC4626Master.json` - Tokenized vault master
- `out/ERC1400Master.sol/ERC1400Master.json` - Security token master

#### Factory Contract
- `out/TokenFactory.sol/TokenFactory.json` - Main deployment factory

#### Extension Modules
- `out/ERC20ComplianceModule.sol/ERC20ComplianceModule.json`
- `out/ERC20VestingModule.sol/ERC20VestingModule.json`
- `out/ERC721RoyaltyModule.sol/ERC721RoyaltyModule.json`
- `out/ERC20FeeModule.sol/ERC20FeeModule.json`

## Understanding ABIs and Bytecode

### What They Are

**Bytecode** = Compiled smart contract code that runs on the EVM
- Machine-readable version of Solidity code
- Example: `0x6080604052348015600f57600080fd5b50...`
- This is the **actual program** that executes on the blockchain

**ABI** = Application Binary Interface
- Human-readable description of functions, parameters, and events
- Tells the frontend **HOW** to interact with the bytecode
- Example:
```json
{
  "inputs": [
    {"name": "_name", "type": "string"},
    {"name": "_symbol", "type": "string"}
  ],
  "name": "initialize",
  "type": "function"
}
```

### Why We Need Both

**Analogy**: Think of a smartphone
- **Bytecode** = The phone's operating system (iOS/Android) - STATIC
- **ABI** = The API documentation for developers - STATIC  
- **User Configuration** = Your personal settings - DYNAMIC

Every iPhone runs the SAME iOS bytecode, but your configuration makes it YOUR phone.

### Static vs Dynamic

**STATIC (Same for All Tokens)**
- Master contract bytecode (deployed once)
- ABI (function signatures)
- Contract logic
- Extension module implementations

**DYNAMIC (Different Per Token)**
- Token name, symbol
- Max supply
- Base URI
- Owner address
- Configuration flags
- Initialization parameters

## How The System Works

### 1. Master Contract Deployment (ONE TIME)
```solidity
// Deploy master implementations once
TokenFactory factory = new TokenFactory();
// This creates 6 master contracts + 4 extension modules
```

### 2. User Configuration (PER TOKEN)
```typescript
// User fills form on website
const config = {
  name: "Cool NFTs",
  symbol: "CNFT",
  baseURI: "ipfs://...",
  maxSupply: 10000,
  mintingEnabled: true
}
```

### 3. Minimal Proxy Deployment (CHEAP)
```solidity
// Creates tiny 55-byte proxy pointing to master
address proxy = Clones.clone(masterContract);

// Initialize with DYNAMIC parameters
ERC721Master(proxy).initialize(
  config.name,      // ← Dynamic from user
  config.symbol,    // ← Dynamic from user  
  config.baseURI,   // ← Dynamic from user
  config.maxSupply, // ← Dynamic from user
  ...
);
```

### Gas Savings
- **Traditional deployment**: ~1,300,000+ gas
- **Minimal proxy deployment**: ~100,000-400,000 gas
- **Savings**: 70-95% reduction per token

## Deployment Script Updates

### Updated DeployTokenFactory.s.sol

The deployment script now logs all master implementations:

**Token Masters**:
1. ERC20Master
2. ERC721Master
3. ERC1155Master
4. ERC3525Master
5. ERC4626Master
6. ERC1400Master

**Extension Module Masters**:
1. ComplianceModule
2. VestingModule
3. RoyaltyModule
4. FeeModule

### Deployment Output

The script saves a comprehensive JSON file to `deployments/latest.json`:
```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "tokenFactory": "0x...",
  "masters": {
    "erc20": "0x...",
    "erc721": "0x...",
    "erc1155": "0x...",
    "erc3525": "0x...",
    "erc4626": "0x...",
    "erc1400": "0x..."
  },
  "extensionModules": {
    "compliance": "0x...",
    "vesting": "0x...",
    "royalty": "0x...",
    "fee": "0x..."
  },
  "deployer": "0x...",
  "timestamp": 1234567890
}
```

## Using ABIs in Frontend

### 1. Import ABI from JSON
```typescript
import TokenFactoryABI from '../../../foundry-contracts/out/TokenFactory.sol/TokenFactory.json';
import ERC20MasterABI from '../../../foundry-contracts/out/ERC20Master.sol/ERC20Master.json';
```

### 2. Extract ABI Array
```typescript
const factoryABI = TokenFactoryABI.abi;
const erc20ABI = ERC20MasterABI.abi;
```

### 3. Create Contract Instance
```typescript
import { ethers } from 'ethers';

const factory = new ethers.Contract(
  FACTORY_ADDRESS,
  factoryABI,
  signer
);
```

### 4. Call Contract Functions
```typescript
// Deploy new ERC20 token
const tx = await factory.deployERC20(
  "My Token",           // name - DYNAMIC
  "MTK",               // symbol - DYNAMIC
  1000000,             // maxSupply - DYNAMIC
  100000,              // initialSupply - DYNAMIC
  ownerAddress         // owner - DYNAMIC
);

await tx.wait();
```

## Frontend Service Integration

### TokenDeploymentService.ts

```typescript
export class TokenDeploymentService {
  private factory: ethers.Contract;
  
  constructor(provider: ethers.providers.Provider) {
    this.factory = new ethers.Contract(
      FACTORY_ADDRESS,
      TokenFactoryABI.abi,
      provider
    );
  }
  
  async deployERC20(config: TokenConfig): Promise<string> {
    const signer = await provider.getSigner();
    const factoryWithSigner = this.factory.connect(signer);
    
    const tx = await factoryWithSigner.deployERC20(
      config.name,
      config.symbol,
      config.maxSupply,
      config.initialSupply,
      config.owner
    );
    
    const receipt = await tx.wait();
    
    // Get deployed token address from event
    const event = receipt.events?.find(
      e => e.event === 'ERC20TokenDeployed'
    );
    
    return event?.args?.token;
  }
}
```

## Best Practices

### 1. ABI Updates
- Rebuild contracts after ANY Solidity changes
- Always use latest generated ABIs
- Never manually edit ABI files

### 2. Version Control
- Commit ABIs to git when contracts change
- Keep ABIs in sync with deployed contracts
- Document contract addresses per network

### 3. Type Safety
- Generate TypeScript types from ABIs
- Use `typechain` for type-safe contract interactions
- Validate ABI compatibility before deployment

### 4. Testing
- Test with actual ABIs, not mocks
- Verify ABI matches deployed contract
- Check function signatures match

## Common Issues

### Issue: "Function not found"
**Cause**: Using outdated ABI
**Solution**: Rebuild contracts with `forge build`

### Issue: "Invalid parameter type"  
**Cause**: ABI mismatch with contract
**Solution**: Ensure ABI version matches deployed contract

### Issue: "Transaction reverted"
**Cause**: Contract not initialized or wrong parameters
**Solution**: Check initialization parameters match ABI requirements

## Deployment Checklist

- [ ] Compile contracts: `forge build`
- [ ] Verify ABIs generated in `out/` directory
- [ ] Update frontend ABI imports
- [ ] Test deployment script locally
- [ ] Deploy to testnet (Sepolia)
- [ ] Verify deployment addresses
- [ ] Save `deployments/latest.json`
- [ ] Update frontend with factory address
- [ ] Test token deployment from frontend
- [ ] Document contract addresses

## Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [EIP-1167 Minimal Proxy](https://eips.ethereum.org/EIPS/eip-1167)
- [OpenZeppelin Clones](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Clones)
- [Ethers.js Documentation](https://docs.ethers.org/)
