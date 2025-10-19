#!/bin/bash

# Verify All Hoodi Remaining Contracts
# This script verifies all 42 newly deployed contracts on Hoodi Etherscan

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_FILE="$SCRIPT_DIR/../deployments/hoodi-remaining.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "HOODI REMAINING CONTRACTS VERIFICATION"
echo "========================================="
echo ""

# Check if deployment file exists
if [ ! -f "$DEPLOYMENT_FILE" ]; then
    echo -e "${RED}Error: Deployment file not found at $DEPLOYMENT_FILE${NC}"
    echo "Please run deployment first: forge script script/DeployHoodiRemaining.s.sol ..."
    exit 1
fi

# Read addresses from JSON
echo "📖 Reading deployment addresses..."
ERC20_WRAPPER_MASTER=$(jq -r '.erc20WrapperMaster' "$DEPLOYMENT_FILE")
ERC721_WRAPPER_MASTER=$(jq -r '.erc721WrapperMaster' "$DEPLOYMENT_FILE")

echo ""
echo "========================================="
echo "Phase 1: Additional Masters (2)"
echo "========================================="

# Verify ERC20WrapperMaster
echo "Verifying ERC20WrapperMaster..."
forge verify-contract \
    $ERC20_WRAPPER_MASTER \
    src/masters/ERC20WrapperMaster.sol:ERC20WrapperMaster \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC || echo -e "${YELLOW}Already verified or failed${NC}"

# Verify ERC721WrapperMaster  
echo "Verifying ERC721WrapperMaster..."
forge verify-contract \
    $ERC721_WRAPPER_MASTER \
    src/masters/ERC721WrapperMaster.sol:ERC721WrapperMaster \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC || echo -e "${YELLOW}Already verified or failed${NC}"

echo ""
echo "========================================="
echo "Phase 2: Additional Beacons (2)"
echo "========================================="

ERC20_WRAPPER_BEACON=$(jq -r '.erc20WrapperBeacon' "$DEPLOYMENT_FILE")
ERC721_WRAPPER_BEACON=$(jq -r '.erc721WrapperBeacon' "$DEPLOYMENT_FILE")

# Verify beacons with constructor args
echo "Verifying ERC20WrapperBeacon..."
forge verify-contract \
    $ERC20_WRAPPER_BEACON \
    src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC \
    --constructor-args $(cast abi-encode "constructor(address,address)" $ERC20_WRAPPER_MASTER $DEPLOYER_ADDRESS) || echo -e "${YELLOW}Already verified or failed${NC}"

echo "Verifying ERC721WrapperBeacon..."
forge verify-contract \
    $ERC721_WRAPPER_BEACON \
    src/deployers/beacon/TokenBeacon.sol:TokenBeacon \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC \
    --constructor-args $(cast abi-encode "constructor(address,address)" $ERC721_WRAPPER_MASTER $DEPLOYER_ADDRESS) || echo -e "${YELLOW}Already verified or failed${NC}"

echo ""
echo "========================================="
echo "Phase 3: Extension Modules (31)"
echo "========================================="

# Array of extension modules
declare -a MODULES=(
    "complianceModule:extensions/compliance/ERC20ComplianceModule.sol:ERC20ComplianceModule"
    "consecutiveModule:extensions/consecutive/ERC721ConsecutiveModule.sol:ERC721ConsecutiveModule"
    "documentModule:extensions/document/UniversalDocumentModule.sol:UniversalDocumentModule"
    "erc1400ControllerModule:extensions/erc1400/ERC1400ControllerModule.sol:ERC1400ControllerModule"
    "erc1400DocumentModule:extensions/erc1400/ERC1400DocumentModule.sol:ERC1400DocumentModule"
    "erc1400TransferRestrictionsModule:extensions/erc1400/ERC1400TransferRestrictionsModule.sol:ERC1400TransferRestrictionsModule"
    "erc3525SlotApprovableModule:extensions/erc3525/ERC3525SlotApprovableModule.sol:ERC3525SlotApprovableModule"
    "erc3525SlotManagerModule:extensions/erc3525/ERC3525SlotManagerModule.sol:ERC3525SlotManagerModule"
    "erc3525ValueExchangeModule:extensions/erc3525/ERC3525ValueExchangeModule.sol:ERC3525ValueExchangeModule"
    "erc4626FeeStrategyModule:extensions/erc4626/ERC4626FeeStrategyModule.sol:ERC4626FeeStrategyModule"
    "erc4626WithdrawalQueueModule:extensions/erc4626/ERC4626WithdrawalQueueModule.sol:ERC4626WithdrawalQueueModule"
    "erc4626YieldStrategyModule:extensions/erc4626/ERC4626YieldStrategyModule.sol:ERC4626YieldStrategyModule"
    "feeModule:extensions/fees/ERC20FeeModule.sol:ERC20FeeModule"
    "flashMintModule:extensions/flash-mint/ERC20FlashMintModule.sol:ERC20FlashMintModule"
    "fractionModule:extensions/fractionalization/ERC721FractionModule.sol:ERC721FractionModule"
    "granularApprovalModule:extensions/granular-approval/ERC5216GranularApprovalModule.sol:ERC5216GranularApprovalModule"
    "metadataEventsModule:extensions/metadata-events/ERC4906MetadataModule.sol:ERC4906MetadataModule"
    "multiAssetVaultModule:extensions/multi-asset-vault/ERC7575MultiAssetVaultModule.sol:ERC7575MultiAssetVaultModule"
    "payableModule:extensions/payable/ERC1363PayableToken.sol:ERC1363PayableToken"
    "permitModule:extensions/permit/ERC20PermitModule.sol:ERC20PermitModule"
    "rentalModule:extensions/rental/ERC721RentalModule.sol:ERC721RentalModule"
    "erc1155RoyaltyModule:extensions/royalty/ERC1155RoyaltyModule.sol:ERC1155RoyaltyModule"
    "erc721RoyaltyModule:extensions/royalty/ERC721RoyaltyModule.sol:ERC721RoyaltyModule"
    "snapshotModule:extensions/snapshot/ERC20SnapshotModule.sol:ERC20SnapshotModule"
    "soulboundModule:extensions/soulbound/ERC721SoulboundModule.sol:ERC721SoulboundModule"
    "supplyCapModule:extensions/supply-cap/ERC1155SupplyCapModule.sol:ERC1155SupplyCapModule"
    "temporaryApprovalModule:extensions/temporary-approval/ERC20TemporaryApprovalModule.sol:ERC20TemporaryApprovalModule"
    "timelockModule:extensions/timelock/ERC20TimelockModule.sol:ERC20TimelockModule"
    "uriManagementModule:extensions/uri-management/ERC1155URIModule.sol:ERC1155URIModule"
    "vestingModule:extensions/vesting/ERC20VestingModule.sol:ERC20VestingModule"
    "votesModule:extensions/votes/ERC20VotesModule.sol:ERC20VotesModule"
)

for module in "${MODULES[@]}"; do
    IFS=':' read -r json_key contract_path contract_name <<< "$module"
    address=$(jq -r ".$json_key" "$DEPLOYMENT_FILE")
    
    echo "Verifying $contract_name..."
    forge verify-contract \
        $address \
        src/$contract_path \
        --chain-id 560048 \
        --rpc-url $HOODI_RPC || echo -e "${YELLOW}Already verified or failed${NC}"
done

echo ""
echo "========================================="
echo "Phase 4: Deployers (4)"
echo "========================================="

# CREATE2Deployer
CREATE2_DEPLOYER=$(jq -r '.create2Deployer' "$DEPLOYMENT_FILE")
echo "Verifying CREATE2Deployer..."
forge verify-contract \
    $CREATE2_DEPLOYER \
    src/deployers/CREATE2Deployer.sol:CREATE2Deployer \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC || echo -e "${YELLOW}Already verified or failed${NC}"

# ExtensionModuleFactory (with constructor args)
EXTENSION_MODULE_FACTORY=$(jq -r '.extensionModuleFactory' "$DEPLOYMENT_FILE")
COMPLIANCE_MODULE=$(jq -r '.complianceModule' "$DEPLOYMENT_FILE")
VESTING_MODULE=$(jq -r '.vestingModule' "$DEPLOYMENT_FILE")
FEE_MODULE=$(jq -r '.feeModule' "$DEPLOYMENT_FILE")
ERC721_ROYALTY_MODULE=$(jq -r '.erc721RoyaltyModule' "$DEPLOYMENT_FILE")

echo "Verifying ExtensionModuleFactory..."
forge verify-contract \
    $EXTENSION_MODULE_FACTORY \
    src/deployers/ExtensionModuleFactory.sol:ExtensionModuleFactory \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC \
    --constructor-args $(cast abi-encode "constructor(address,address,address,address,address)" \
        $COMPLIANCE_MODULE $VESTING_MODULE $FEE_MODULE $ERC721_ROYALTY_MODULE $DEPLOYER_ADDRESS) || echo -e "${YELLOW}Already verified or failed${NC}"

# UniversalDeployer
UNIVERSAL_DEPLOYER=$(jq -r '.universalDeployer' "$DEPLOYMENT_FILE")
echo "Verifying UniversalDeployer..."
forge verify-contract \
    $UNIVERSAL_DEPLOYER \
    src/deployers/UniversalDeployer.sol:UniversalDeployer \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC || echo -e "${YELLOW}Already verified or failed${NC}"

# BeaconProxyFactory
BEACON_PROXY_FACTORY=$(jq -r '.beaconProxyFactory' "$DEPLOYMENT_FILE")
echo "Verifying BeaconProxyFactory..."
forge verify-contract \
    $BEACON_PROXY_FACTORY \
    src/deployers/beacon/BeaconProxyFactory.sol:BeaconProxyFactory \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC \
    --constructor-args $(cast abi-encode "constructor(address)" $DEPLOYER_ADDRESS) || echo -e "${YELLOW}Already verified or failed${NC}"

echo ""
echo "========================================="
echo "Phase 5: Governance (1)"
echo "========================================="

UPGRADE_GOVERNANCE=$(jq -r '.upgradeGovernance' "$DEPLOYMENT_FILE")
echo "Verifying UpgradeGovernance..."
forge verify-contract \
    $UPGRADE_GOVERNANCE \
    src/governance/UpgradeGovernance.sol:UpgradeGovernance \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC \
    --constructor-args $(cast abi-encode "constructor(address,uint256,uint256)" \
        $DEPLOYER_ADDRESS 86400 2) || echo -e "${YELLOW}Already verified or failed${NC}"

echo ""
echo "========================================="
echo "Phase 6: Multi-Sig (2)"
echo "========================================="

MULTISIG_WALLET=$(jq -r '.multiSigWallet' "$DEPLOYMENT_FILE")
MULTISIG_WALLET_FACTORY=$(jq -r '.multiSigWalletFactory' "$DEPLOYMENT_FILE")

# MultiSigWallet (with constructor args)
echo "Verifying MultiSigWallet..."
# Note: Constructor args need proper encoding for string and array
OWNERS_ARRAY="[$DEPLOYER_ADDRESS]"
forge verify-contract \
    $MULTISIG_WALLET \
    src/wallets/MultiSigWallet.sol:MultiSigWallet \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC \
    --constructor-args $(cast abi-encode "constructor(string,address[],uint256)" \
        "Chain Capital MultiSig" "$OWNERS_ARRAY" 1) || echo -e "${YELLOW}Already verified or failed - try manual verification${NC}"

# MultiSigWalletFactory
echo "Verifying MultiSigWalletFactory..."
forge verify-contract \
    $MULTISIG_WALLET_FACTORY \
    src/wallets/MultiSigWalletFactory.sol:MultiSigWalletFactory \
    --chain-id 560048 \
    --rpc-url $HOODI_RPC || echo -e "${YELLOW}Already verified or failed${NC}"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ VERIFICATION COMPLETE${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Check contracts on Hoodi Etherscan:"
echo "https://hoodi.etherscan.io/"
echo ""
echo "Note: Some verifications may require manual verification on Etherscan"
echo "if constructor arguments are complex (e.g., arrays, strings)."
