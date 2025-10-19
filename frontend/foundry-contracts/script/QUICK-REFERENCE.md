# Hoodi Deployment - Quick Reference Card

## 🎯 Essential Information

**Network:** Hoodi Testnet  
**Chain ID:** 560048  
**RPC:** https://ethereum-hoodi-rpc.publicnode.com/  
**Explorer:** https://hoodi.etherscan.io/  
**Faucet:** https://hoodi.ethpandaops.io  
**Your Wallet:** 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b

---

## 🚀 Quick Deploy (3 Commands)

```bash
# 1. Navigate to contracts directory
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

# 2. Run pre-flight check
./script/pre-flight-check.sh

# 3. Deploy everything
~/.foundry/bin/forge script script/DeployAllToHoodi.s.sol \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/ \
  --broadcast \
  --verify \
  -vvv
```

---

## 📋 Pre-Deployment Checklist

- [ ] ✅ Get 1 ETH from faucet (https://hoodi.ethpandaops.io)
- [ ] ✅ Decrypt private key from project_wallets table
- [ ] ✅ Create `.env` file with HOODI_PRIVATE_KEY
- [ ] ✅ Run `forge build` to compile contracts
- [ ] ✅ Run `./script/pre-flight-check.sh` to verify setup
- [ ] ✅ Review deployment simulation output
- [ ] ✅ Have Etherscan API key ready (optional, for verification)

---

## ⚡ Most Common Commands

### Check Balance
```bash
cast balance 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/
```

### Build Contracts
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts
~/.foundry/bin/forge build
```

### Simulation (Dry Run)
```bash
~/.foundry/bin/forge script script/DeployAllToHoodi.s.sol \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/ \
  -vvv
```

### Full Deployment
```bash
~/.foundry/bin/forge script script/DeployAllToHoodi.s.sol \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/ \
  --broadcast \
  --verify \
  -vvv
```

---

## 🔍 Post-Deployment

### View Deployment Addresses
```bash
cat deployments/hoodi-latest.json | jq
```

### Test Token Deployment
```bash
# Set variables
export FACTORY=$(cat deployments/hoodi-latest.json | jq -r .tokenFactory)
export DEPLOYER=0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b

# Deploy test ERC20
cast send $FACTORY \
  "deployERC20(string,string,uint256,uint256,address)(address)" \
  "Test Token" "TEST" \
  "1000000000000000000000000" \
  "1000000000000000000000" \
  $DEPLOYER \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/ \
  --private-key $HOODI_PRIVATE_KEY
```

### Check Token Details
```bash
# Get token address from transaction receipt
export TOKEN=<token_address_from_event>

# Check name
cast call $TOKEN "name()(string)" \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/

# Check symbol
cast call $TOKEN "symbol()(string)" \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/

# Check supply
cast call $TOKEN "totalSupply()(uint256)" \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/
```

---

## 🛠️ Environment Setup

### Create .env file
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

cat > .env << 'EOF'
HOODI_RPC=https://ethereum-hoodi-rpc.publicnode.com/
HOODI_PRIVATE_KEY=0x<your_decrypted_private_key>
ETHERSCAN_API_KEY=<optional_for_verification>
EOF

chmod 600 .env
```

### Load environment
```bash
export $(cat .env | grep -v '^#' | xargs)
```

---

## 📊 What Gets Deployed

| Component | Count | Description |
|-----------|-------|-------------|
| **Infrastructure** | 5 | PolicyEngine, PolicyRegistry, TokenRegistry, UpgradeGovernor, UpgradeGovernance |
| **TokenFactory** | 1 | Main factory (deploys 50+ masters internally) |
| **ExtensionModuleFactory** | 1 | Beacon-based extension deployment |
| **MultiSigFactory** | 1 | Multi-sig wallet deployment |
| **Deployers** | 3 | CREATE2, Universal, BeaconProxy |
| **Total** | 11 | Top-level contracts |
| **+ Internal** | ~60 | Masters and beacons deployed by factories |

---

## 🚨 Troubleshooting

### "Insufficient funds"
```bash
# Request more ETH from faucet
open https://hoodi.ethpandaops.io
```

### "Nonce too low"
```bash
# Get current nonce
cast wallet nonce 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/
```

### "Transaction timeout"
```bash
# Increase gas price in deployment command
--gas-price 50000000000  # 50 gwei
```

### "Compilation failed"
```bash
# Clean and rebuild
~/.foundry/bin/forge clean
~/.foundry/bin/forge build
```

---

## 📁 Important Files

**Deployment Script:**  
`/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts/script/DeployAllToHoodi.s.sol`

**Pre-Flight Check:**  
`/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts/script/pre-flight-check.sh`

**Full Guide:**  
`/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts/script/HOODI-DEPLOYMENT-GUIDE.md`

**Deployment Output:**  
`/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts/deployments/hoodi-latest.json`

---

## 💡 Pro Tips

1. **Always run pre-flight check first:** `./script/pre-flight-check.sh`
2. **Simulate before broadcasting:** Remove `--broadcast` flag for dry run
3. **Save deployment JSON:** Commit to git after successful deployment
4. **Update database:** Record addresses in contract_masters table
5. **Test immediately:** Deploy a test token to verify everything works

---

## 📞 Quick Links

- **Faucet:** https://hoodi.ethpandaops.io
- **Explorer:** https://hoodi.etherscan.io/address/0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b
- **Network Info:** https://hoodi.ethpandaops.io
- **Foundry Docs:** https://book.getfoundry.sh

---

**Last Updated:** October 2025  
**Your Wallet:** 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b  
**Network:** Hoodi (560048)
