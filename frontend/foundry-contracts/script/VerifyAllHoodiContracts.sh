#!/bin/bash

# Comprehensive Hoodi Contract Verification Script
# Verifies all 60 contracts deployed to Hoodi testnet
# Deployer: 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b

set -e

HOODI_RPC="https://ethereum-hoodi-rpc.publicnode.com/"
CHAIN_ID="560048"
DEPLOYER="0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "HOODI TESTNET - COMPLETE VERIFICATION"
echo "=========================================="
echo "Chain ID: $CHAIN_ID"
echo "Deployer: $DEPLOYER"
echo "Total Contracts: 60"
echo "=========================================="
echo ""

# Counter
VERIFIED=0
FAILED=0

# Function to verify a contract
verify_contract() {
    local address=$1
    local contract_path=$2
    local contract_name=$3
    local description=$4
    local constructor_args=$5
    
    echo -e "${BLUE}Verifying $description...${NC}"
    echo "Address: $address"
    
    if [ -z "$constructor_args" ]; then
        # Simple verification without constructor args
        if ~/.foundry/bin/forge verify-contract \
            "$address" \
            "$contract_path:$contract_name" \
            --chain-id "$CHAIN_ID" \
            --rpc-url "$HOODI_RPC" \
            --watch 2>/dev/null; then
            echo -e "${GREEN}✅ $description verified${NC}"
            ((VERIFIED++))
        else
            echo -e "${RED}❌ $description failed${NC}"
            ((FAILED++))
        fi
    else
        # Verification with constructor args
        if ~/.foundry/bin/forge verify-contract \
            "$address" \
            "$contract_path:$contract_name" \
            --chain-id "$CHAIN_ID" \
            --rpc-url "$HOODI_RPC" \
            --constructor-args "$constructor_args" \
            --watch 2>/dev/null; then
            echo -e "${GREEN}✅ $description verified${NC}"
            ((VERIFIED++))
        else
            echo -e "${RED}❌ $description failed${NC}"
            ((FAILED++))
        fi
    fi
    echo ""
}

# PHASE 1: MASTER CONTRACTS (7)
echo "=========================================="
echo "PHASE 1: Master Contracts (7)"
echo "=========================================="

verify_contract \
    "0x1Fa1bB0B23FDd7abd9286dbC2Fa806cAc2789ce4" \
    "src/masters/ERC20Master.sol" \
    "ERC20Master" \
    "ERC20Master"

verify_contract \
    "0xAE21da994Eb972C27C96e2E81A54FBa4Df65D3dD" \
    "src/masters/ERC721Master.sol" \
    "ERC721Master" \
    "ERC721Master"

verify_contract \
    "0x761E975bFC7388Dcceee2d34C8952E31950c86b4" \
    "src/masters/ERC1155Master.sol" \
    "ERC1155Master" \
    "ERC1155Master"

verify_contract \
    "0x1A6aFee9d603E0C95697cDF60bCFB0a7eddE9fDe" \
    "src/masters/ERC3525Master.sol" \
    "ERC3525Master" \
    "ERC3525Master"

verify_contract \
    "0x09705De0d01064C189B9905f9C39a01B3227dea1" \
    "src/masters/ERC4626Master.sol" \
    "ERC4626Master" \
    "ERC4626Master"

verify_contract \
    "0xeeDE4C788166F90764dBf0D7DB57e34D2cb17A72" \
    "src/masters/ERC1400Master.sol" \
    "ERC1400Master" \
    "ERC1400Master"

verify_contract \
    "0xFb63ce50BC17B7A7e873AC013ac8aD40A4B95184" \
    "src/masters/ERC20RebasingMaster.sol" \
    "ERC20RebasingMaster" \
    "ERC20RebasingMaster"

# PHASE 2: ADDITIONAL MASTERS (2)
echo "=========================================="
echo "PHASE 2: Additional Masters (2)"
echo "=========================================="

verify_contract \
    "0x68FC3c85C96265AB685d94eC42FC8079bDF4b441" \
    "src/masters/ERC20WrapperMaster.sol" \
    "ERC20WrapperMaster" \
    "ERC20WrapperMaster"

verify_contract \
    "0x8d0d1616dF493ee5cA9DDAB6F32Ae76D7b43dD5C" \
    "src/masters/ERC721WrapperMaster.sol" \
    "ERC721WrapperMaster" \
    "ERC721WrapperMaster"

# PHASE 3: BEACONS (9) - Need constructor args
echo "=========================================="
echo "PHASE 3: Beacon Contracts (9)"
echo "=========================================="

# Original 7 beacons
verify_contract \
    "0x9E9b43BB6396DE240b66FC83B3f1517dDEB5379B" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC20 Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0x1Fa1bB0B23FDd7abd9286dbC2Fa806cAc2789ce4" "$DEPLOYER")"

verify_contract \
    "0x99c012A0723D9F8b7B759082a3393dfF87e19c86" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC721 Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0xAE21da994Eb972C27C96e2E81A54FBa4Df65D3dD" "$DEPLOYER")"

verify_contract \
    "0x9397cb807BF97F653eE8f4e31fC101a7BD97aa71" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC1155 Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0x761E975bFC7388Dcceee2d34C8952E31950c86b4" "$DEPLOYER")"

verify_contract \
    "0xCc4E531C0bF28C0e071f728755D1fb5927f66b8c" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC3525 Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0x1A6aFee9d603E0C95697cDF60bCFB0a7eddE9fDe" "$DEPLOYER")"

verify_contract \
    "0x307b33B9693fFDA68e6Bd87Bd475a71c303c7ceA" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC4626 Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0x09705De0d01064C189B9905f9C39a01B3227dea1" "$DEPLOYER")"

verify_contract \
    "0x052dfC495221eA8325F830c2Ed9e7a124D5312a1" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC1400 Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0xeeDE4C788166F90764dBf0D7DB57e34D2cb17A72" "$DEPLOYER")"

verify_contract \
    "0x1D4B05025453189f8313dA9A7c059E742379AaA5" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC20Rebasing Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0xFb63ce50BC17B7A7e873AC013ac8aD40A4B95184" "$DEPLOYER")"

# Additional 2 beacons
verify_contract \
    "0xb0d562B709436B2F28B31B3803804967d33E74eF" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC20Wrapper Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0x68FC3c85C96265AB685d94eC42FC8079bDF4b441" "$DEPLOYER")"

verify_contract \
    "0x63095eA66d005169d45e488beCADB9270E9d06b7" \
    "src/deployers/beacon/TokenBeacon.sol" \
    "TokenBeacon" \
    "ERC721Wrapper Beacon" \
    "$(cast abi-encode "constructor(address,address)" "0x8d0d1616dF493ee5cA9DDAB6F32Ae76D7b43dD5C" "$DEPLOYER")"

# PHASE 4: INFRASTRUCTURE (4)
echo "=========================================="
echo "PHASE 4: Infrastructure Contracts (4)"
echo "=========================================="

verify_contract \
    "0x781d9B85c989d9CA691955E4352a666D7D4aC85c" \
    "src/policy/PolicyEngine.sol" \
    "PolicyEngine" \
    "PolicyEngine"

verify_contract \
    "0xC77b041FCBCefd8267e6739A0c0c565f958aA358" \
    "src/policy/PolicyRegistry.sol" \
    "PolicyRegistry" \
    "PolicyRegistry"

verify_contract \
    "0x1D049d5450348D1194cF0bf53C6fF1C6E5ADe31B" \
    "src/registry/TokenRegistry.sol" \
    "TokenRegistry" \
    "TokenRegistry"

verify_contract \
    "0xbbd3e140A6031c59FC45d27270D82a7aB7256779" \
    "src/governance/UpgradeGovernor.sol" \
    "UpgradeGovernor" \
    "UpgradeGovernor"

# PHASE 5: EXTENSION MODULES (31)
echo "=========================================="
echo "PHASE 5: Extension Modules (31)"
echo "=========================================="

verify_contract \
    "0x883F3867b8Bf918bEEB5CAbDCa28709bb749bbD7" \
    "src/extensions/compliance/ERC20ComplianceModule.sol" \
    "ERC20ComplianceModule" \
    "Compliance Module"

verify_contract \
    "0xCA0b9A42cb4be6e7d15391a10430B328C6668C41" \
    "src/extensions/consecutive/ERC721ConsecutiveModule.sol" \
    "ERC721ConsecutiveModule" \
    "Consecutive Module"

verify_contract \
    "0x2aAdA0BA697ae157Cd6c0029BD67504839D46030" \
    "src/extensions/document/UniversalDocumentModule.sol" \
    "UniversalDocumentModule" \
    "Document Module"

verify_contract \
    "0x01E42DAeB687867AdFc24E85222528bcC3fe1277" \
    "src/extensions/erc1400/ERC1400ControllerModule.sol" \
    "ERC1400ControllerModule" \
    "ERC1400 Controller Module"

verify_contract \
    "0x2Fc35B0810A9fD11eEB57396018489D5b66FA935" \
    "src/extensions/erc1400/ERC1400DocumentModule.sol" \
    "ERC1400DocumentModule" \
    "ERC1400 Document Module"

verify_contract \
    "0x70609638B051bAD76e21A71080B84ECD5be2004f" \
    "src/extensions/erc1400/ERC1400TransferRestrictionsModule.sol" \
    "ERC1400TransferRestrictionsModule" \
    "ERC1400 Transfer Restrictions Module"

verify_contract \
    "0xb5D5cf7e76A6C2fe4d93f32F1268F1563a56A5Fd" \
    "src/extensions/erc3525/ERC3525SlotApprovableModule.sol" \
    "ERC3525SlotApprovableModule" \
    "ERC3525 Slot Approvable Module"

verify_contract \
    "0x97397Ad7a994DC5d6625483924a92a013405D9a0" \
    "src/extensions/erc3525/ERC3525SlotManagerModule.sol" \
    "ERC3525SlotManagerModule" \
    "ERC3525 Slot Manager Module"

verify_contract \
    "0x3740631dadB2524409eFf6f5A1Dc1910364Cc9D8" \
    "src/extensions/erc3525/ERC3525ValueExchangeModule.sol" \
    "ERC3525ValueExchangeModule" \
    "ERC3525 Value Exchange Module"

verify_contract \
    "0xdEEb7EeD5087A1312B2EB634bc45926049Fd34BC" \
    "src/extensions/erc4626/ERC4626FeeStrategyModule.sol" \
    "ERC4626FeeStrategyModule" \
    "ERC4626 Fee Strategy Module"

verify_contract \
    "0xAdf2845d5497765883aD3eFea6d1F33B712DF064" \
    "src/extensions/erc4626/ERC4626WithdrawalQueueModule.sol" \
    "ERC4626WithdrawalQueueModule" \
    "ERC4626 Withdrawal Queue Module"

verify_contract \
    "0x84e3060578FAC7A840d61eD2D1956EFD894E6632" \
    "src/extensions/erc4626/ERC4626YieldStrategyModule.sol" \
    "ERC4626YieldStrategyModule" \
    "ERC4626 Yield Strategy Module"

verify_contract \
    "0x24e2B4C9F6968DeeC94C89E2B85DD2831207fD30" \
    "src/extensions/fees/ERC20FeeModule.sol" \
    "ERC20FeeModule" \
    "Fee Module"

verify_contract \
    "0x745e71221852f81AFF2454A55278F6CB0d10026b" \
    "src/extensions/flashMint/ERC20FlashMintModule.sol" \
    "ERC20FlashMintModule" \
    "Flash Mint Module"

verify_contract \
    "0xAc5DbaEE2a69B661f0e0a43c8cc0EE1060720d69" \
    "src/extensions/fractionalization/ERC721FractionModule.sol" \
    "ERC721FractionModule" \
    "Fraction Module"

verify_contract \
    "0x37baEb42E882F5928E1CaABBB756389A0FBf4C8d" \
    "src/extensions/granularApproval/ERC5216GranularApprovalModule.sol" \
    "ERC5216GranularApprovalModule" \
    "Granular Approval Module"

verify_contract \
    "0x6EA6bb7118286e95FaFeA5624Be4303c859D560f" \
    "src/extensions/metadataEvents/ERC4906MetadataModule.sol" \
    "ERC4906MetadataModule" \
    "Metadata Events Module"

verify_contract \
    "0xf0181194A2eE28a40Ed165b11C4B02c19097F680" \
    "src/extensions/multiAssetVault/ERC7575MultiAssetVaultModule.sol" \
    "ERC7575MultiAssetVaultModule" \
    "Multi Asset Vault Module"

verify_contract \
    "0x5BF2404e69239f82580D42f2b5F10654C8C2d434" \
    "src/extensions/payable/ERC1363PayableToken.sol" \
    "ERC1363PayableToken" \
    "Payable Module"

verify_contract \
    "0xA452BC0C287F13370E82D4388bAdb66370ba9B94" \
    "src/extensions/permit/ERC20PermitModule.sol" \
    "ERC20PermitModule" \
    "Permit Module"

verify_contract \
    "0x6db98Cad31410a4374D39B2c351b5b6e0257b952" \
    "src/extensions/rental/ERC721RentalModule.sol" \
    "ERC721RentalModule" \
    "Rental Module"

verify_contract \
    "0xfE5B62B216469c6e3059588656Ec402610E95f43" \
    "src/extensions/royalty/ERC721RoyaltyModule.sol" \
    "ERC721RoyaltyModule" \
    "ERC721 Royalty Module"

verify_contract \
    "0xb05F32bb4b9bE33F762c65B5Cad7959b50f2639c" \
    "src/extensions/royalty/ERC1155RoyaltyModule.sol" \
    "ERC1155RoyaltyModule" \
    "ERC1155 Royalty Module"

verify_contract \
    "0xe11634f8FE59ac5C19ac844228Df2aA587b1490d" \
    "src/extensions/snapshot/ERC20SnapshotModule.sol" \
    "ERC20SnapshotModule" \
    "Snapshot Module"

verify_contract \
    "0x36B0Ff000f88AE4dBd93Ca446db9444D3926a721" \
    "src/extensions/soulbound/ERC721SoulboundModule.sol" \
    "ERC721SoulboundModule" \
    "Soulbound Module"

verify_contract \
    "0x1fE29e97F11c1CEE1c1d2124860ca40Bf12B1964" \
    "src/extensions/supplyCap/ERC1155SupplyCapModule.sol" \
    "ERC1155SupplyCapModule" \
    "Supply Cap Module"

verify_contract \
    "0x9A818dEFbe8ff8BCF5b4D3a2F8f5024C365fe87F" \
    "src/extensions/temporaryApproval/ERC20TemporaryApprovalModule.sol" \
    "ERC20TemporaryApprovalModule" \
    "Temporary Approval Module"

verify_contract \
    "0x56013bC002E614d051231071287A83f17955C287" \
    "src/extensions/timelock/ERC20TimelockModule.sol" \
    "ERC20TimelockModule" \
    "Timelock Module"

verify_contract \
    "0xcF6cB151Cc02ac102a791B93C7400398497355bC" \
    "src/extensions/uriManagement/ERC1155URIModule.sol" \
    "ERC1155URIModule" \
    "URI Management Module"

verify_contract \
    "0x441B3F4aD5aF736ed7E8A2B75973982Cc75ddD9b" \
    "src/extensions/vesting/ERC20VestingModule.sol" \
    "ERC20VestingModule" \
    "Vesting Module"

verify_contract \
    "0x1D83d341B58268C454123358fD9F6156C757Aaf4" \
    "src/extensions/votes/ERC20VotesModule.sol" \
    "ERC20VotesModule" \
    "Votes Module"

# PHASE 6: DEPLOYERS (4)
echo "=========================================="
echo "PHASE 6: Deployer Contracts (4)"
echo "=========================================="

verify_contract \
    "0xbdC0D826082bccE256a67f49C29AA3b79D58cCdb" \
    "src/deployers/CREATE2Deployer.sol" \
    "CREATE2Deployer" \
    "CREATE2 Deployer"

verify_contract \
    "0xA5B29d2D7D430c7c6629525ed2C9F3f4bC3bD199" \
    "src/deployers/ExtensionModuleFactory.sol" \
    "ExtensionModuleFactory" \
    "Extension Module Factory"

verify_contract \
    "0xd694b02128Bbd98cF2f52baE8cc8267f92110A02" \
    "src/deployers/UniversalDeployer.sol" \
    "UniversalDeployer" \
    "Universal Deployer"

verify_contract \
    "0x2740d4C2A3454E4fc45e9e4AD3D1A3c5a4450701" \
    "src/deployers/BeaconProxyFactory.sol" \
    "BeaconProxyFactory" \
    "Beacon Proxy Factory"

# PHASE 7: GOVERNANCE (1)
echo "=========================================="
echo "PHASE 7: Governance Contracts (1)"
echo "=========================================="

verify_contract \
    "0xc3a32e49f8D3E8B11f5281d58419B2dA1930de13" \
    "src/governance/UpgradeGovernance.sol" \
    "UpgradeGovernance" \
    "Upgrade Governance"

# PHASE 8: MULTI-SIG (2)
echo "=========================================="
echo "PHASE 8: Multi-Sig Wallets (2)"
echo "=========================================="

verify_contract \
    "0x8756905a0478a2997e16b7ec8a52E4fae034aeC6" \
    "src/wallets/MultiSigWallet.sol" \
    "MultiSigWallet" \
    "Multi-Sig Wallet"

verify_contract \
    "0x7ab47319EB530419F644B6E3Acec19a8Ae59Fb76" \
    "src/wallets/MultiSigWalletFactory.sol" \
    "MultiSigWalletFactory" \
    "Multi-Sig Wallet Factory"

# SUMMARY
echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo -e "${GREEN}✅ Verified: $VERIFIED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "Total: $((VERIFIED + FAILED))"
echo "=========================================="
echo ""
echo "Check verified contracts at:"
echo "https://hoodi.etherscan.io/address/$DEPLOYER"
echo "=========================================="
