#!/bin/bash

# Hoodi Contract Verification Script
# Verifies all deployed contracts on Hoodi Etherscan

CHAIN_ID=560048
RPC_URL=https://ethereum-hoodi-rpc.publicnode.com/

echo "🔍 Starting Hoodi Contract Verification..."
echo "============================================"

# Master Contracts
echo ""
echo "📝 Verifying Master Contracts..."

echo "  → ERC20Master..."
~/.foundry/bin/forge verify-contract \
  0x1Fa1bB0B23FDd7abd9286dbC2Fa806cAc2789ce4 \
  src/masters/ERC20Master.sol:ERC20Master \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → ERC721Master..."
~/.foundry/bin/forge verify-contract \
  0xAE21da994Eb972C27C96e2E81A54FBa4Df65D3dD \
  src/masters/ERC721Master.sol:ERC721Master \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → ERC1155Master..."
~/.foundry/bin/forge verify-contract \
  0x761E975bFC7388Dcceee2d34C8952E31950c86b4 \
  src/masters/ERC1155Master.sol:ERC1155Master \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → ERC3525Master..."
~/.foundry/bin/forge verify-contract \
  0x1A6aFee9d603E0C95697cDF60bCFB0a7eddE9fDe \
  src/masters/ERC3525Master.sol:ERC3525Master \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → ERC4626Master..."
~/.foundry/bin/forge verify-contract \
  0x09705De0d01064C189B9905f9C39a01B3227dea1 \
  src/masters/ERC4626Master.sol:ERC4626Master \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → ERC1400Master..."
~/.foundry/bin/forge verify-contract \
  0xeeDE4C788166F90764dBf0D7DB57e34D2cb17A72 \
  src/masters/ERC1400Master.sol:ERC1400Master \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → ERC20RebasingMaster..."
~/.foundry/bin/forge verify-contract \
  0xFb63ce50BC17B7A7e873AC013ac8aD40A4B95184 \
  src/masters/ERC20RebasingMaster.sol:ERC20RebasingMaster \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

# Beacon Contracts
echo ""
echo "📡 Verifying Beacon Contracts..."

echo "  → ERC20 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x9E9b43BB6396DE240b66FC83B3f1517dDEB5379B \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0x1Fa1bB0B23FDd7abd9286dbC2Fa806cAc2789ce4 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b) || echo "    ⚠️ Already verified or failed"

echo "  → ERC721 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x99c012A0723D9F8b7B759082a3393dfF87e19c86 \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0xAE21da994Eb972C27C96e2E81A54FBa4Df65D3dD 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b) || echo "    ⚠️ Already verified or failed"

echo "  → ERC1155 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x9397cb807BF97F653eE8f4e31fC101a7BD97aa71 \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0x761E975bFC7388Dcceee2d34C8952E31950c86b4 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b) || echo "    ⚠️ Already verified or failed"

echo "  → ERC3525 Beacon..."
~/.foundry/bin/forge verify-contract \
  0xCc4E531C0bF28C0e071f728755D1fb5927f66b8c \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0x1A6aFee9d603E0C95697cDF60bCFB0a7eddE9fDe 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b) || echo "    ⚠️ Already verified or failed"

echo "  → ERC4626 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x307b33B9693fFDA68e6Bd87Bd475a71c303c7ceA \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0x09705De0d01064C189B9905f9C39a01B3227dea1 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b) || echo "    ⚠️ Already verified or failed"

echo "  → ERC1400 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x052dfC495221eA8325F830c2Ed9e7a124D5312a1 \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0xeeDE4C788166F90764dBf0D7DB57e34D2cb17A72 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b) || echo "    ⚠️ Already verified or failed"

echo "  → ERC20Rebasing Beacon..."
~/.foundry/bin/forge verify-contract \
  0x1D4B05025453189f8313dA9A7c059E742379AaA5 \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0xFb63ce50BC17B7A7e873AC013ac8aD40A4B95184 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b) || echo "    ⚠️ Already verified or failed"

# Infrastructure Contracts
echo ""
echo "🏗️ Verifying Infrastructure Contracts..."

echo "  → PolicyEngine..."
~/.foundry/bin/forge verify-contract \
  0x781d9B85c989d9CA691955E4352a666D7D4aC85c \
  src/policy/PolicyEngine.sol:PolicyEngine \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → PolicyRegistry..."
~/.foundry/bin/forge verify-contract \
  0xC77b041FCBCefd8267e6739A0c0c565f958aA358 \
  src/policy/PolicyRegistry.sol:PolicyRegistry \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → TokenRegistry..."
~/.foundry/bin/forge verify-contract \
  0x1D049d5450348D1194cF0bf53C6fF1C6E5ADe31B \
  src/TokenRegistry.sol:TokenRegistry \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo "  → UpgradeGovernor..."
~/.foundry/bin/forge verify-contract \
  0xbbd3e140A6031c59FC45d27270D82a7aB7256779 \
  src/governance/UpgradeGovernor.sol:UpgradeGovernor \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL || echo "    ⚠️ Already verified or failed"

echo ""
echo "✅ Verification Complete!"
echo "============================================"
echo ""
echo "📝 View verified contracts at:"
echo "   https://hoodi.etherscan.io/address/<contract_address>#code"
