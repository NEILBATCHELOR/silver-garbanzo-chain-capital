# 🚀 QUICK START: Deploy Policy Engine in 5 Minutes

## Prerequisites (One-Time Setup)

### 1. Install Foundry (2 minutes)
```bash
# Run this command and follow the prompts:
curl -L https://foundry.paradigm.xyz | bash

# Then run:
foundryup
```

### 2. Get Sepolia Test ETH (1 minute)
Visit: https://sepoliafaucet.com/
- Connect your wallet
- Request test ETH (0.5 ETH is enough)

### 3. Get Alchemy API Key (2 minutes)
Visit: https://www.alchemy.com/
- Sign up for free account
- Create a new app for Sepolia
- Copy your API key

## Deployment Steps

### Step 1: Configure Environment
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

# Copy the environment template
cp .env.deployment .env

# Edit .env with your values
nano .env  # or use any text editor
```

**Minimal .env configuration:**
```env
# Only these are required for testnet:
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY

# Use same address for all roles initially:
ADMIN_ADDRESS=0xYOUR_WALLET_ADDRESS
MINTER_ADDRESS=0xYOUR_WALLET_ADDRESS
BURNER_ADDRESS=0xYOUR_WALLET_ADDRESS
BLOCKER_ADDRESS=0xYOUR_WALLET_ADDRESS
```

### Step 2: Run Automated Deployment
```bash
# Make script executable (if not already)
chmod +x deploy.sh

# Run the deployment script
./deploy.sh

# When prompted:
# - Choose option 2 for Sepolia
# - Choose 'n' for running tests (unless you want to test)
# - Wait for deployment (takes ~1 minute)
```

### Step 3: Save Contract Addresses
The script will output something like:
```
PolicyEngine Address: 0x123...abc
Token Address: 0x456...def
```

**IMPORTANT:** Save these addresses!

### Step 4: Update Frontend Config
Edit `/frontend/src/config/contracts.ts`:
```typescript
sepolia: {
  policyEngine: '0x123...abc',  // Your PolicyEngine address
  token: '0x456...def'           // Your Token address
}
```

## Verify Deployment Success

### Test the Contracts
```bash
# Check token name
cast call 0xYOUR_TOKEN_ADDRESS "name()" --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Should return: "Chain Capital Token"
```

### View on Etherscan
Visit: `https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS`

## Start Using the Contracts

### From the UI
1. Navigate to your frontend app
2. Go to Token Operations
3. Try a mint operation (will check policies automatically)

### From Command Line
```bash
# Mint tokens (replace addresses and keys)
cast send 0xTOKEN_ADDRESS "mint(address,uint256)" \
  0xRECIPIENT_ADDRESS \
  1000000000000000000000 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  --private-key 0xYOUR_PRIVATE_KEY
```

## Troubleshooting

### "Foundry not found"
```bash
# Add foundry to PATH
source ~/.bashrc  # or ~/.zshrc
```

### "Insufficient funds"
- Get more test ETH from https://sepoliafaucet.com/

### "Gas estimation failed"
- Check your wallet has ETH
- Verify contract addresses are correct
- Ensure you have the required role (MINTER_ROLE for minting)

## What's Next?

1. ✅ Test all 7 operations (mint, burn, transfer, lock, unlock, block, unblock)
2. ✅ Configure custom policies via UI
3. ✅ Set up monitoring dashboard
4. ✅ Deploy to mainnet when ready

## Need Help?

- Check detailed guide: `DEPLOYMENT_GUIDE.md`
- Review contract tests: `test/PolicyEngine.t.sol`
- Verify roles: Ensure your address has the required roles

---

**Time to Complete: ~5 minutes** ⏱️

**Congratulations! Your Policy Engine is now live on Sepolia!** 🎉
