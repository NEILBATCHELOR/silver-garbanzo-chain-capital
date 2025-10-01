// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./masters/ERC20Master.sol";
import "./masters/ERC721Master.sol";
import "./masters/ERC1155Master.sol";
import "./masters/ERC3525Master.sol";
import "./masters/ERC4626Master.sol";
import "./masters/ERC1400Master.sol";

// Extension Modules
import "./extensions/compliance/ERC20ComplianceModule.sol";
import "./extensions/vesting/ERC20VestingModule.sol";
import "./extensions/royalty/ERC721RoyaltyModule.sol";
import "./extensions/fees/ERC20FeeModule.sol";

/**
 * @title TokenFactory
 * @notice Universal factory for deploying all token standards with 95% gas savings
 * @dev Uses ERC-1167 minimal proxy pattern (55 bytes vs 12KB+ full deployment)
 * 
 * Supported Standards:
 * - ERC-20: Fungible tokens
 * - ERC-721: Non-fungible tokens (NFTs)
 * - ERC-1155: Multi-token standard
 * - ERC-3525: Semi-fungible tokens
 * - ERC-4626: Tokenized vaults
 * - ERC-1400: Security tokens (regulated assets)
 * 
 * Gas Savings:
 * - Traditional deployment: ~1,300,000+ gas
 * - Minimal proxy deployment: ~100,000-400,000 gas
 * - Savings: 70-95% reduction per token
 */
contract TokenFactory is Ownable {
    using Clones for address;
    
    // ============ Master Implementation Addresses ============
    address public immutable erc20Master;
    address public immutable erc721Master;
    address public immutable erc1155Master;
    address public immutable erc3525Master;
    address public immutable erc4626Master;
    address public immutable erc1400Master;
    
    // ============ Extension Module Master Addresses ============
    address public immutable complianceModuleMaster;
    address public immutable vestingModuleMaster;
    address public immutable royaltyModuleMaster;
    address public immutable feeModuleMaster;
    
    // ============ Deployment Tracking ============
    mapping(address => address[]) public deployedTokensByOwner;
    address[] public allDeployedTokens;
    
    // ============ Events ============
    event ERC20TokenDeployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol
    );
    
    event ERC721TokenDeployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol
    );
    
    event ERC1155TokenDeployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol
    );
    
    event ERC3525TokenDeployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol
    );
    
    event ERC4626TokenDeployed(
        address indexed token,
        address indexed owner,
        address asset,
        string name
    );
    
    event ERC1400TokenDeployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol
    );
    
    // ============ Extension Module Events ============
    event ComplianceModuleDeployed(
        address indexed token,
        address indexed module,
        address indexed owner,
        bool kycRequired,
        bool whitelistRequired
    );
    
    event VestingModuleDeployed(
        address indexed token,
        address indexed module,
        address indexed owner
    );
    
    event RoyaltyModuleDeployed(
        address indexed collection,
        address indexed module,
        address indexed owner,
        address defaultReceiver,
        uint96 defaultFeeNumerator
    );
    
    event FeeModuleDeployed(
        address indexed token,
        address indexed module,
        address indexed owner,
        uint256 transferFeeBps
    );
    
    event TokenWithModulesDeployed(
        address indexed token,
        address indexed complianceModule,
        address indexed vestingModule,
        address owner
    );
    
    // ============ Errors ============
    error InvalidOwner();
    error InvalidAsset();
    
    /**
     * @notice Constructor - deploys all master implementations
     */
    constructor() Ownable(msg.sender) {
        // Deploy token master implementations (one-time cost per standard)
        erc20Master = address(new ERC20Master());
        erc721Master = address(new ERC721Master());
        erc1155Master = address(new ERC1155Master());
        erc3525Master = address(new ERC3525Master());
        erc4626Master = address(new ERC4626Master());
        erc1400Master = address(new ERC1400Master());
        
        // Deploy extension module masters (one-time cost per module type)
        complianceModuleMaster = address(new ERC20ComplianceModule());
        vestingModuleMaster = address(new ERC20VestingModule());
        royaltyModuleMaster = address(new ERC721RoyaltyModule());
        feeModuleMaster = address(new ERC20FeeModule());
    }
    
    // ============ ERC-20 Functions ============
    
    function deployERC20(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 initialSupply,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc20Master.clone();
        ERC20Master(token).initialize(name, symbol, maxSupply, initialSupply, owner);
        
        _trackDeployment(token, owner);
        emit ERC20TokenDeployed(token, owner, name, symbol);
    }
    
    function deployERC20Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 initialSupply,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc20Master.cloneDeterministic(salt);
        ERC20Master(token).initialize(name, symbol, maxSupply, initialSupply, owner);
        
        _trackDeployment(token, owner);
        emit ERC20TokenDeployed(token, owner, name, symbol);
    }
    
    // ============ ERC-721 Functions ============
    
    function deployERC721(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 maxSupply,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc721Master.clone();
        ERC721Master(token).initialize(
            name,
            symbol,
            baseURI,
            maxSupply,
            owner,
            true, // minting enabled
            true  // burning enabled
        );
        
        _trackDeployment(token, owner);
        emit ERC721TokenDeployed(token, owner, name, symbol);
    }
    
    function deployERC721Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 maxSupply,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc721Master.cloneDeterministic(salt);
        ERC721Master(token).initialize(
            name,
            symbol,
            baseURI,
            maxSupply,
            owner,
            true, // minting enabled
            true  // burning enabled
        );
        
        _trackDeployment(token, owner);
        emit ERC721TokenDeployed(token, owner, name, symbol);
    }
    
    // ============ ERC-1155 Functions ============
    
    function deployERC1155(
        string memory name,
        string memory symbol,
        string memory uri,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc1155Master.clone();
        ERC1155Master(token).initialize(name, symbol, uri, owner);
        
        _trackDeployment(token, owner);
        emit ERC1155TokenDeployed(token, owner, name, symbol);
    }
    
    function deployERC1155Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        string memory uri,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc1155Master.cloneDeterministic(salt);
        ERC1155Master(token).initialize(name, symbol, uri, owner);
        
        _trackDeployment(token, owner);
        emit ERC1155TokenDeployed(token, owner, name, symbol);
    }
    
    // ============ ERC-3525 Functions ============
    
    function deployERC3525(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc3525Master.clone();
        ERC3525Master(token).initialize(name, symbol, decimals, owner);
        
        _trackDeployment(token, owner);
        emit ERC3525TokenDeployed(token, owner, name, symbol);
    }
    
    function deployERC3525Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        uint8 decimals,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc3525Master.cloneDeterministic(salt);
        ERC3525Master(token).initialize(name, symbol, decimals, owner);
        
        _trackDeployment(token, owner);
        emit ERC3525TokenDeployed(token, owner, name, symbol);
    }
    
    // ============ ERC-4626 Functions ============
    
    function deployERC4626(
        address asset,
        string memory name,
        string memory symbol,
        uint256 depositCap,
        uint256 minimumDeposit,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        if (asset == address(0)) revert InvalidAsset();
        
        token = erc4626Master.clone();
        ERC4626Master(token).initialize(
            asset,
            name,
            symbol,
            depositCap,
            minimumDeposit,
            owner
        );
        
        _trackDeployment(token, owner);
        emit ERC4626TokenDeployed(token, owner, asset, name);
    }
    
    function deployERC4626Deterministic(
        bytes32 salt,
        address asset,
        string memory name,
        string memory symbol,
        uint256 depositCap,
        uint256 minimumDeposit,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        if (asset == address(0)) revert InvalidAsset();
        
        token = erc4626Master.cloneDeterministic(salt);
        ERC4626Master(token).initialize(
            asset,
            name,
            symbol,
            depositCap,
            minimumDeposit,
            owner
        );
        
        _trackDeployment(token, owner);
        emit ERC4626TokenDeployed(token, owner, asset, name);
    }
    
    // ============ ERC-1400 Functions ============
    
    function deployERC1400(
        string memory name,
        string memory symbol,
        uint8 decimals,
        bytes32[] memory defaultPartitions,
        bool isControllable,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc1400Master.clone();
        ERC1400Master(token).initialize(
            name,
            symbol,
            decimals,
            defaultPartitions,
            owner,
            isControllable
        );
        
        _trackDeployment(token, owner);
        emit ERC1400TokenDeployed(token, owner, name, symbol);
    }
    
    function deployERC1400Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        uint8 decimals,
        bytes32[] memory defaultPartitions,
        bool isControllable,
        address owner
    ) external returns (address token) {
        if (owner == address(0)) revert InvalidOwner();
        
        token = erc1400Master.cloneDeterministic(salt);
        ERC1400Master(token).initialize(
            name,
            symbol,
            decimals,
            defaultPartitions,
            owner,
            isControllable
        );
        
        _trackDeployment(token, owner);
        emit ERC1400TokenDeployed(token, owner, name, symbol);
    }
    
    // ============ Prediction Functions ============
    
    function predictERC20Address(bytes32 salt) external view returns (address) {
        return erc20Master.predictDeterministicAddress(salt, address(this));
    }
    
    function predictERC721Address(bytes32 salt) external view returns (address) {
        return erc721Master.predictDeterministicAddress(salt, address(this));
    }
    
    function predictERC1155Address(bytes32 salt) external view returns (address) {
        return erc1155Master.predictDeterministicAddress(salt, address(this));
    }
    
    function predictERC3525Address(bytes32 salt) external view returns (address) {
        return erc3525Master.predictDeterministicAddress(salt, address(this));
    }
    
    function predictERC4626Address(bytes32 salt) external view returns (address) {
        return erc4626Master.predictDeterministicAddress(salt, address(this));
    }
    
    function predictERC1400Address(bytes32 salt) external view returns (address) {
        return erc1400Master.predictDeterministicAddress(salt, address(this));
    }
    
    // ============ Extension Module Deployment Functions ============
    
    /**
     * @notice Deploy compliance module for a token
     * @param tokenAddress The token to attach compliance to
     * @param kycRequired Whether KYC is required for transfers
     * @param whitelistRequired Whether whitelist is required for transfers
     * @return moduleAddress The deployed compliance module address
     */
    function deployComplianceModule(
        address tokenAddress,
        bool kycRequired,
        bool whitelistRequired
    ) external returns (address moduleAddress) {
        if (tokenAddress == address(0)) revert InvalidOwner();
        
        // Deploy minimal proxy of compliance module
        moduleAddress = complianceModuleMaster.clone();
        
        // Initialize the module
        ERC20ComplianceModule(moduleAddress).initialize(
            msg.sender,
            kycRequired,
            whitelistRequired
        );
        
        // Attach module to token (requires sender to have admin role on token)
        ERC20Master(tokenAddress).setComplianceModule(moduleAddress);
        
        emit ComplianceModuleDeployed(
            tokenAddress,
            moduleAddress,
            msg.sender,
            kycRequired,
            whitelistRequired
        );
        
        return moduleAddress;
    }
    
    /**
     * @notice Deploy vesting module for a token
     * @param tokenAddress The token to attach vesting to
     * @return moduleAddress The deployed vesting module address
     */
    function deployVestingModule(
        address tokenAddress
    ) external returns (address moduleAddress) {
        if (tokenAddress == address(0)) revert InvalidOwner();
        
        // Deploy minimal proxy of vesting module
        moduleAddress = vestingModuleMaster.clone();
        
        // Initialize the module
        ERC20VestingModule(moduleAddress).initialize(
            msg.sender,
            tokenAddress
        );
        
        // Attach module to token
        ERC20Master(tokenAddress).setVestingModule(moduleAddress);
        
        emit VestingModuleDeployed(tokenAddress, moduleAddress, msg.sender);
        
        return moduleAddress;
    }
    
    /**
     * @notice Deploy royalty module for an NFT collection
     * @param collectionAddress The NFT collection address
     * @param defaultReceiver Default royalty receiver address
     * @param defaultFeeNumerator Default royalty fee (basis points out of 10000)
     * @return moduleAddress The deployed royalty module address
     */
    function deployRoyaltyModule(
        address collectionAddress,
        address defaultReceiver,
        uint96 defaultFeeNumerator
    ) external returns (address moduleAddress) {
        if (collectionAddress == address(0)) revert InvalidOwner();
        if (defaultReceiver == address(0)) revert InvalidOwner();
        
        // Deploy minimal proxy of royalty module
        moduleAddress = royaltyModuleMaster.clone();
        
        // Initialize the module
        ERC721RoyaltyModule(moduleAddress).initialize(
            msg.sender,
            defaultReceiver,
            defaultFeeNumerator
        );
        
        // Attach module to collection
        ERC721Master(collectionAddress).setRoyaltyModule(moduleAddress);
        
        emit RoyaltyModuleDeployed(
            collectionAddress,
            moduleAddress,
            msg.sender,
            defaultReceiver,
            defaultFeeNumerator
        );
        
        return moduleAddress;
    }
    
    /**
     * @notice Deploy fee module for a token
     * @param tokenAddress The token to attach fees to
     * @param transferFeeBps Transfer fee in basis points (100 = 1%)
     * @param feeRecipient Address to receive collected fees
     * @return moduleAddress The deployed fee module address
     */
    function deployFeeModule(
        address tokenAddress,
        uint256 transferFeeBps,
        address feeRecipient
    ) external returns (address moduleAddress) {
        if (tokenAddress == address(0)) revert InvalidOwner();
        if (feeRecipient == address(0)) revert InvalidOwner();
        
        // Deploy minimal proxy of fee module
        moduleAddress = feeModuleMaster.clone();
        
        // Initialize the module (admin, token, feeRecipient, initialFeeBasisPoints)
        ERC20FeeModule(moduleAddress).initialize(
            msg.sender,
            tokenAddress,
            feeRecipient,
            transferFeeBps
        );
        
        // Attach module to token
        ERC20Master(tokenAddress).setFeesModule(moduleAddress);
        
        emit FeeModuleDeployed(
            tokenAddress,
            moduleAddress,
            msg.sender,
            transferFeeBps
        );
        
        return moduleAddress;
    }
    
    /**
     * @notice Deploy ERC20 token with compliance and vesting modules in one transaction
     * @param name Token name
     * @param symbol Token symbol
     * @param maxSupply Maximum supply (0 for unlimited)
     * @param initialSupply Initial supply to mint to deployer
     * @param withCompliance Whether to deploy with compliance module
     * @param withVesting Whether to deploy with vesting module
     * @param kycRequired Whether KYC is required (only if withCompliance=true)
     * @param whitelistRequired Whether whitelist is required (only if withCompliance=true)
     * @return tokenAddress The deployed token address
     * @return complianceAddress The deployed compliance module (address(0) if not requested)
     * @return vestingAddress The deployed vesting module (address(0) if not requested)
     */
    function deployERC20WithModules(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 initialSupply,
        bool withCompliance,
        bool withVesting,
        bool kycRequired,
        bool whitelistRequired
    ) external returns (
        address tokenAddress,
        address complianceAddress,
        address vestingAddress
    ) {
        // Deploy token first (inline to avoid external call)
        tokenAddress = erc20Master.clone();
        ERC20Master(tokenAddress).initialize(name, symbol, maxSupply, initialSupply, msg.sender);
        _trackDeployment(tokenAddress, msg.sender);
        emit ERC20TokenDeployed(tokenAddress, msg.sender, name, symbol);
        
        // Deploy compliance module if requested
        if (withCompliance) {
            complianceAddress = complianceModuleMaster.clone();
            ERC20ComplianceModule(complianceAddress).initialize(
                msg.sender,
                kycRequired,
                whitelistRequired
            );
            ERC20Master(tokenAddress).setComplianceModule(complianceAddress);
            
            emit ComplianceModuleDeployed(
                tokenAddress,
                complianceAddress,
                msg.sender,
                kycRequired,
                whitelistRequired
            );
        }
        
        // Deploy vesting module if requested
        if (withVesting) {
            vestingAddress = vestingModuleMaster.clone();
            ERC20VestingModule(vestingAddress).initialize(msg.sender, tokenAddress);
            ERC20Master(tokenAddress).setVestingModule(vestingAddress);
            
            emit VestingModuleDeployed(tokenAddress, vestingAddress, msg.sender);
        }
        
        emit TokenWithModulesDeployed(tokenAddress, complianceAddress, vestingAddress, msg.sender);
        
        return (tokenAddress, complianceAddress, vestingAddress);
    }
    
    // ============ Query Functions ============
    
    function getDeployedTokens(address owner) 
        external 
        view 
        returns (address[] memory) 
    {
        return deployedTokensByOwner[owner];
    }
    
    function getTotalDeployments() external view returns (uint256) {
        return allDeployedTokens.length;
    }
    
    function getImplementation(string memory tokenType) 
        external 
        view 
        returns (address) 
    {
        bytes32 typeHash = keccak256(abi.encodePacked(tokenType));
        
        if (typeHash == keccak256("ERC20")) return erc20Master;
        if (typeHash == keccak256("ERC721")) return erc721Master;
        if (typeHash == keccak256("ERC1155")) return erc1155Master;
        if (typeHash == keccak256("ERC3525")) return erc3525Master;
        if (typeHash == keccak256("ERC4626")) return erc4626Master;
        if (typeHash == keccak256("ERC1400")) return erc1400Master;
        
        revert("Unknown token type");
    }
    
    /**
     * @notice Get extension module master implementation address
     * @param moduleType Module type ("Compliance", "Vesting", "Royalty", "Fee")
     * @return address Master implementation address
     */
    function getModuleMaster(string memory moduleType) 
        external 
        view 
        returns (address) 
    {
        bytes32 typeHash = keccak256(abi.encodePacked(moduleType));
        
        if (typeHash == keccak256("Compliance")) return complianceModuleMaster;
        if (typeHash == keccak256("Vesting")) return vestingModuleMaster;
        if (typeHash == keccak256("Royalty")) return royaltyModuleMaster;
        if (typeHash == keccak256("Fee")) return feeModuleMaster;
        
        revert("Unknown module type");
    }
    
    // ============ Internal Functions ============
    
    function _trackDeployment(address token, address owner) private {
        deployedTokensByOwner[owner].push(token);
        allDeployedTokens.push(token);
    }
}
