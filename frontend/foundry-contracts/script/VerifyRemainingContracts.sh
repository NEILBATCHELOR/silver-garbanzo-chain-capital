#!/bin/bash

# Verify remaining Hoodi contracts (beacons and TokenRegistry)

CHAIN_ID=560048
RPC_URL=https://ethereum-hoodi-rpc.publicnode.com/
DEPLOYER=0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b

echo "🔍 Verifying Remaining Hoodi Contracts..."
echo "==========================================="

# Pre-compute constructor args
ERC20_ARGS=$(~/.foundry/bin/cast abi-encode "constructor(address,address)" 0x1Fa1bB0B23FDd7abd9286dbC2Fa806cAc2789ce4 $DEPLOYER)
ERC721_ARGS=$(~/.foundry/bin/cast abi-encode "constructor(address,address)" 0xAE21da994Eb972C27C96e2E81A54FBa4Df65D3dD $DEPLOYER)
ERC1155_ARGS=$(~/.foundry/bin/cast abi-encode "constructor(address,address)" 0x761E975bFC7388Dcceee2d34C8952E31950c86b4 $DEPLOYER)
ERC3525_ARGS=$(~/.foundry/bin/cast abi-encode "constructor(address,address)" 0x1A6aFee9d603E0C95697cDF60bCFB0a7eddE9fDe $DEPLOYER)
ERC4626_ARGS=$(~/.foundry/bin/cast abi-encode "constructor(address,address)" 0x09705De0d01064C189B9905f9C39a01B3227dea1 $DEPLOYER)
ERC1400_ARGS=$(~/.foundry/bin/cast abi-encode "constructor(address,address)" 0xeeDE4C788166F90764dBf0D7DB57e34D2cb17A72 $DEPLOYER)
REBASING_ARGS=$(~/.foundry/bin/cast abi-encode "constructor(address,address)" 0xFb63ce50BC17B7A7e873AC013ac8aD40A4B95184 $DEPLOYER)

# Beacon Contracts
echo ""
echo "📡 Verifying Beacon Contracts..."

echo "  → ERC20 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x9E9b43BB6396DE240b66FC83B3f1517dDEB5379B \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $ERC20_ARGS

echo "  → ERC721 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x99c012A0723D9F8b7B759082a3393dfF87e19c86 \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $ERC721_ARGS

echo "  → ERC1155 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x9397cb807BF97F653eE8f4e31fC101a7BD97aa71 \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $ERC1155_ARGS

echo "  → ERC3525 Beacon..."
~/.foundry/bin/forge verify-contract \
  0xCc4E531C0bF28C0e071f728755D1fb5927f66b8c \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $ERC3525_ARGS

echo "  → ERC4626 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x307b33B9693fFDA68e6Bd87Bd475a71c303c7ceA \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $ERC4626_ARGS

echo "  → ERC1400 Beacon..."
~/.foundry/bin/forge verify-contract \
  0x052dfC495221eA8325F830c2Ed9e7a124D5312a1 \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $ERC1400_ARGS

echo "  → ERC20Rebasing Beacon..."
~/.foundry/bin/forge verify-contract \
  0x1D4B05025453189f8313dA9A7c059E742379AaA5 \
  src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL \
  --constructor-args $REBASING_ARGS

# TokenRegistry
echo ""
echo "📝 Verifying TokenRegistry..."
~/.foundry/bin/forge verify-contract \
  0x1D049d5450348D1194cF0bf53C6fF1C6E5ADe31B \
  src/registry/TokenRegistry.sol:TokenRegistry \
  --chain-id $CHAIN_ID \
  --rpc-url $RPC_URL

echo ""
echo "✅ All Remaining Contracts Verified!"
echo "==========================================="
