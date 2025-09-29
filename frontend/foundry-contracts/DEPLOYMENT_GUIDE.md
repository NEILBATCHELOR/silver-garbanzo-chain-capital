# Policy Engine Smart Contract Deployment Guide

## 📋 Prerequisites Checklist

### 1. Install Foundry
```bash
# Install Foundryup (the Foundry installer)
curl -L https://foundry.paradigm.xyz | bash

# Follow the instructions to add foundry to your PATH
# Then run:
foundryup

# Verify installation
forge --version
cast --version
anvil --version
```

### 2. Get RPC URLs
- **Sepolia Testnet**: https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
- **Mainnet**: https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY

Get your Alchemy API key from: https://www.alchemy.com/

### 3. Prepare Deployment Wallet
- Create a new wallet or use existing (MetaMask, etc.)
- Export the private key (NEVER share or commit this!)
- Fund with ETH:
  - Sepolia: Get test ETH from https://sepoliafaucet.com/
  - Mainnet: Real ETH needed (~0.5 ETH for deployment)

## 🚀 Deployment Steps

### Step 1: Configure Environment
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

# Copy the template
cp .env.deployment .env

# Edit .env with your values
# IMPORTANT: Never commit .env file!
```

Required `.env` values:
```env
# Network RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# Deployment wallet private key (with 0x prefix)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Role addresses (can be same as deployer initially)
ADMIN_ADDRESS=0xYOUR_ADMIN_ADDRESS
MINTER_ADDRESS=0xYOUR_MINTER_ADDRESS
BURNER_ADDRESS=0xYOUR_BURNER_ADDRESS
BLOCKER_ADDRESS=0xYOUR_BLOCKER_ADDRESS

# Etherscan API (for verification)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

### Step 2: Compile Contracts
```bash
# Compile all contracts
forge build

# Expected output:
# [⠢] Compiling...
# [⠆] Compiling 30 files with 0.8.20
# Compiler run successful
```

### Step 3: Run Tests
```bash
# Run all tests with verbose output
forge test -vvv

# Run specific test
forge test --match-test testMintWithValidPolicy -vvv

# Run with gas reporting
forge test --gas-report
```

### Step 4: Deploy to Local Test Network (Optional)
```bash
# Terminal 1: Start local blockchain
anvil

# Terminal 2: Deploy to local
forge script script/DeployPolicyEngine.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### Step 5: Deploy to Sepolia Testnet
```bash
# Dry run first (no actual deployment)
forge script script/DeployPolicyEngine.s.sol \
  --rpc-url $SEPOLIA_RPC_URL

# Deploy for real
forge script script/DeployPolicyEngine.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Note the deployed addresses from output!
```

### Step 6: Deploy to Mainnet (Production)
```bash
# CAUTION: This uses real ETH!
# Dry run first
forge script script/DeployPolicyEngine.s.sol \
  --rpc-url $MAINNET_RPC_URL

# Deploy with verification
forge script script/DeployPolicyEngine.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --slow # Use slow mode for mainnet
```

## 🔧 Post-Deployment Configuration

### 1. Save Contract Addresses
After deployment, save the addresses from the output:
```
PolicyEngine Address: 0x...
Token Address: 0x...
```

### 2. Update Frontend Configuration
Edit `/frontend/src/config/contracts.ts`:
```typescript
export const CONTRACT_ADDRESSES = {
  sepolia: {
    policyEngine: "0x...", // Your deployed PolicyEngine address
    token: "0x...",        // Your deployed Token address
  },
  mainnet: {
    policyEngine: "0x...",
    token: "0x...",
  }
};
```

### 3. Verify Contracts on Etherscan
If verification didn't work during deployment:
```bash
forge verify-contract \
  --chain-id 11155111 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.20 \
  YOUR_CONTRACT_ADDRESS \
  src/PolicyEngine.sol:PolicyEngine
```

### 4. Configure Policies
Use cast to configure policies after deployment:
```bash
# Example: Update mint policy
cast send $POLICY_ENGINE_ADDRESS \
  "registerTokenPolicy(address,string,uint256,uint256,uint256,uint256)" \
  $TOKEN_ADDRESS \
  "mint" \
  10000000000000000000000 \
  100000000000000000000000 \
  1000000000000000000000000 \
  60 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## 📊 Testing Each Operation

### Mint Tokens
```bash
cast send $TOKEN_ADDRESS "mint(address,uint256)" \
  0xRECIPIENT_ADDRESS \
  1000000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $MINTER_PRIVATE_KEY
```

### Check Balance
```bash
cast call $TOKEN_ADDRESS "balanceOf(address)" \
  0xADDRESS \
  --rpc-url $SEPOLIA_RPC_URL
```

### Validate Policy
```bash
cast call $POLICY_ENGINE_ADDRESS \
  "validateOperation(address,address,string,uint256)" \
  $TOKEN_ADDRESS \
  $OPERATOR_ADDRESS \
  "mint" \
  1000000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL
```

## 🔍 Monitoring & Troubleshooting

### View Contract on Etherscan
- Sepolia: https://sepolia.etherscan.io/address/YOUR_CONTRACT
- Mainnet: https://etherscan.io/address/YOUR_CONTRACT

### Check Transaction Status
```bash
cast receipt 0xTRANSACTION_HASH --rpc-url $SEPOLIA_RPC_URL
```

### Debug Failed Transactions
```bash
cast run 0xTRANSACTION_HASH --rpc-url $SEPOLIA_RPC_URL
```

## ⚠️ Security Checklist

- [ ] Never commit private keys or .env files
- [ ] Use hardware wallet for mainnet deployment
- [ ] Test thoroughly on testnet first
- [ ] Get contracts audited before mainnet
- [ ] Set up multi-sig for admin roles
- [ ] Monitor contract events
- [ ] Have emergency pause mechanism tested

## 📚 Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/4.x/)
- [Ethereum Gas Tracker](https://etherscan.io/gastracker)
- [Sepolia Faucet](https://sepoliafaucet.com/)

## Next Steps After Deployment

1. ✅ Update frontend with contract addresses
2. ✅ Configure initial policies
3. ✅ Test all operations on testnet
4. ✅ Set up event monitoring
5. ✅ Create admin dashboard for policy management
6. ✅ Document API endpoints for contract interaction
