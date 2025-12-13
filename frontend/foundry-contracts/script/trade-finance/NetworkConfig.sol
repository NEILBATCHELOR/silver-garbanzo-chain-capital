// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title NetworkConfig
 * @notice Universal network configuration for Trade Finance deployments
 * @dev Supports Ethereum, L2s (Base, Arbitrum, Optimism, Polygon), and custom networks
 */
contract NetworkConfig is Script {
    
    // ============================================
    // NETWORK IDENTIFIERS
    // ============================================
    
    uint256 constant MAINNET_CHAIN_ID = 1;
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 constant HOLESKY_CHAIN_ID = 17000;
    uint256 constant HOODI_CHAIN_ID = 1760793828;
    
    // L2 Mainnet
    uint256 constant BASE_CHAIN_ID = 8453;
    uint256 constant ARBITRUM_CHAIN_ID = 42161;
    uint256 constant OPTIMISM_CHAIN_ID = 10;
    uint256 constant POLYGON_CHAIN_ID = 137;
    uint256 constant ZKSYNC_CHAIN_ID = 324;
    
    // L2 Testnet
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;
    uint256 constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
    uint256 constant OPTIMISM_SEPOLIA_CHAIN_ID = 11155420;
    uint256 constant AMOY_CHAIN_ID = 80002; // Polygon testnet
    uint256 constant ZKSYNC_SEPOLIA_CHAIN_ID = 300;
    
    // Injective
    uint256 constant INJECTIVE_TESTNET_CHAIN_ID = 31337; // Custom
    uint256 constant INJECTIVE_MAINNET_CHAIN_ID = 31338; // Custom
    
    // ============================================
    // NETWORK CONFIGURATION STRUCT
    // ============================================
    
    struct NetworkConfiguration {
        uint256 chainId;
        string name;
        string rpcUrl;
        string explorerUrl;
        string explorerApiUrl;
        address deployer;
        
        // Chainlink price feeds (if available)
        address goldPriceFeed;      // XAU/USD
        address silverPriceFeed;    // XAG/USD  
        address oilPriceFeed;       // WTI or Brent
        address ethPriceFeed;       // ETH/USD (for gas calculations)
        
        // Network-specific settings
        bool isTestnet;
        bool hasSequencer;          // For L2s with sequencer
        address sequencerFeed;      // L2 sequencer uptime feed
        
        // Governance
        address governanceMultiSig;
        address emergencyAdmin;
        
        // Gas settings
        uint256 baseFeeMultiplier;  // Multiplier for base fee (e.g., 120 = 1.2x)
        uint256 priorityFeeGwei;    // Priority fee in gwei
    }
    
    // ============================================
    // STORAGE
    // ============================================
    
    mapping(uint256 => NetworkConfiguration) private configs;
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        _initializeNetworkConfigs();
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function _initializeNetworkConfigs() internal {
        // Ethereum Mainnet
        configs[MAINNET_CHAIN_ID] = NetworkConfiguration({
            chainId: MAINNET_CHAIN_ID,
            name: "Ethereum Mainnet",
            rpcUrl: vm.envString("VITE_MAINNET_RPC_URL"),
            explorerUrl: "https://etherscan.io",
            explorerApiUrl: "https://api.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6, // XAU/USD
            silverPriceFeed: 0x379589227b15F1a12195D3f2d90bBc9F31f95235, // XAG/USD
            oilPriceFeed: 0xf3584F4dd3b467e73C2339EfD008665a70A4185c, // WTI/USD
            ethPriceFeed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419, // ETH/USD
            isTestnet: false,
            hasSequencer: false,
            sequencerFeed: address(0),
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 120,
            priorityFeeGwei: 2
        });
        
        // Sepolia Testnet
        configs[SEPOLIA_CHAIN_ID] = NetworkConfiguration({
            chainId: SEPOLIA_CHAIN_ID,
            name: "Sepolia Testnet",
            rpcUrl: vm.envString("VITE_SEPOLIA_RPC_URL"),
            explorerUrl: "https://sepolia.etherscan.io",
            explorerApiUrl: "https://api-sepolia.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Ea, // XAU/USD
            silverPriceFeed: address(0), // Not available
            oilPriceFeed: address(0), // Not available
            ethPriceFeed: 0x694AA1769357215DE4FAC081bf1f309aDC325306, // ETH/USD
            isTestnet: true,
            hasSequencer: false,
            sequencerFeed: address(0),
            governanceMultiSig: vm.envAddress("DEPLOYER_ADDRESS"),
            emergencyAdmin: vm.envAddress("DEPLOYER_ADDRESS"),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 1
        });
        
        // Base Mainnet
        configs[BASE_CHAIN_ID] = NetworkConfiguration({
            chainId: BASE_CHAIN_ID,
            name: "Base",
            rpcUrl: vm.envString("VITE_BASE_RPC_URL"),
            explorerUrl: "https://basescan.org",
            explorerApiUrl: "https://api.basescan.org/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0x8946A183BFaFA95BEcf57c5e08fE5B7654d2807B, // XAU/USD
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70, // ETH/USD
            isTestnet: false,
            hasSequencer: true,
            sequencerFeed: 0xBCF85224fc0756B9Fa45aA7892530B47e10b6433, // Base sequencer
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 0 // Base doesn't use priority fees
        });
        
        // Base Sepolia
        configs[BASE_SEPOLIA_CHAIN_ID] = NetworkConfiguration({
            chainId: BASE_SEPOLIA_CHAIN_ID,
            name: "Base Sepolia",
            rpcUrl: vm.envString("VITE_BASE_SEPOLIA_RPC_URL"),
            explorerUrl: "https://sepolia.basescan.org",
            explorerApiUrl: "https://api-sepolia.basescan.org/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1, // ETH/USD
            isTestnet: true,
            hasSequencer: true,
            sequencerFeed: 0x4C4814aa04433e0FB31310379a4D6946D5e1D353, // Base Sepolia sequencer
            governanceMultiSig: vm.envAddress("DEPLOYER_ADDRESS"),
            emergencyAdmin: vm.envAddress("DEPLOYER_ADDRESS"),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 0
        });
        
        // Arbitrum One
        configs[ARBITRUM_CHAIN_ID] = NetworkConfiguration({
            chainId: ARBITRUM_CHAIN_ID,
            name: "Arbitrum One",
            rpcUrl: vm.envString("VITE_ARBITRUM_RPC_URL"),
            explorerUrl: "https://arbiscan.io",
            explorerApiUrl: "https://api.arbiscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0x0be7C1338e1B1e7BF58DD8F1447C4f73d9DFCa2D, // XAU/USD
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612, // ETH/USD
            isTestnet: false,
            hasSequencer: true,
            sequencerFeed: 0xFdB631F5EE196F0ed6FAa767959853A9F217697D, // Arbitrum sequencer
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 105,
            priorityFeeGwei: 0
        });
        
        // Arbitrum Sepolia
        configs[ARBITRUM_SEPOLIA_CHAIN_ID] = NetworkConfiguration({
            chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
            name: "Arbitrum Sepolia",
            rpcUrl: vm.envString("VITE_ARBITRUM_SEPOLIA_RPC_URL"),
            explorerUrl: "https://sepolia.arbiscan.io",
            explorerApiUrl: "https://api-sepolia.arbiscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165, // ETH/USD
            isTestnet: true,
            hasSequencer: true,
            sequencerFeed: 0x00D4A2dF2Ab9e57e065f18CF70f5F94B20c19A1a, // Arbitrum Sepolia sequencer
            governanceMultiSig: vm.envAddress("DEPLOYER_ADDRESS"),
            emergencyAdmin: vm.envAddress("DEPLOYER_ADDRESS"),
            baseFeeMultiplier: 105,
            priorityFeeGwei: 0
        });
        
        // Optimism
        configs[OPTIMISM_CHAIN_ID] = NetworkConfiguration({
            chainId: OPTIMISM_CHAIN_ID,
            name: "Optimism",
            rpcUrl: vm.envString("VITE_OPTIMISM_RPC_URL"),
            explorerUrl: "https://optimistic.etherscan.io",
            explorerApiUrl: "https://api-optimistic.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0x9A7b213e13Ff6653a7C024f90A1371E0097C0D66, // XAU/USD
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x13e3Ee699D1909E989722E753853AE30b17e08c5, // ETH/USD
            isTestnet: false,
            hasSequencer: true,
            sequencerFeed: 0x371EAD81c9102C9BF4874A9075FFFf170F2Ee389, // Optimism sequencer
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 0
        });
        
        // Optimism Sepolia
        configs[OPTIMISM_SEPOLIA_CHAIN_ID] = NetworkConfiguration({
            chainId: OPTIMISM_SEPOLIA_CHAIN_ID,
            name: "Optimism Sepolia",
            rpcUrl: vm.envString("VITE_OPTIMISM_SEPOLIA_RPC_URL"),
            explorerUrl: "https://sepolia-optimism.etherscan.io",
            explorerApiUrl: "https://api-sepolia-optimistic.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x61Ec26aA57019C486B10502285c5A3D4A4750AD7, // ETH/USD
            isTestnet: true,
            hasSequencer: true,
            sequencerFeed: 0x29E65d5A1c5065ca4Ca4d17E0f84030Ab35f0E98, // Optimism Sepolia sequencer
            governanceMultiSig: vm.envAddress("DEPLOYER_ADDRESS"),
            emergencyAdmin: vm.envAddress("DEPLOYER_ADDRESS"),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 0
        });
        
        // Polygon
        configs[POLYGON_CHAIN_ID] = NetworkConfiguration({
            chainId: POLYGON_CHAIN_ID,
            name: "Polygon",
            rpcUrl: vm.envString("VITE_POLYGON_RPC_URL"),
            explorerUrl: "https://polygonscan.com",
            explorerApiUrl: "https://api.polygonscan.com/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0), // Not available on Polygon
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0xF9680D99D6C9589e2a93a78A04A279e509205945, // ETH/USD
            isTestnet: false,
            hasSequencer: false, // Polygon is a sidechain, not L2
            sequencerFeed: address(0),
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 120,
            priorityFeeGwei: 30 // Polygon uses higher priority fees
        });
        
        // Amoy (Polygon Testnet)
        configs[AMOY_CHAIN_ID] = NetworkConfiguration({
            chainId: AMOY_CHAIN_ID,
            name: "Amoy",
            rpcUrl: vm.envString("VITE_AMOY_RPC_URL"),
            explorerUrl: "https://amoy.polygonscan.com",
            explorerApiUrl: "https://api-amoy.polygonscan.com/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: address(0),
            isTestnet: true,
            hasSequencer: false,
            sequencerFeed: address(0),
            governanceMultiSig: vm.envAddress("DEPLOYER_ADDRESS"),
            emergencyAdmin: vm.envAddress("DEPLOYER_ADDRESS"),
            baseFeeMultiplier: 120,
            priorityFeeGwei: 30
        });
    }
    
    // ============================================
    // PUBLIC GETTERS
    // ============================================
    
    function getConfig() public view returns (NetworkConfiguration memory) {
        return getConfig(block.chainid);
    }
    
    function getConfig(uint256 chainId) public view returns (NetworkConfiguration memory) {
        NetworkConfiguration memory config = configs[chainId];
        require(config.chainId != 0, "NetworkConfig: unsupported chain");
        return config;
    }
    
    function isTestnet() public view returns (bool) {
        return getConfig().isTestnet;
    }
    
    function hasChainlinkFeeds() public view returns (bool) {
        NetworkConfiguration memory config = getConfig();
        return config.goldPriceFeed != address(0) || 
               config.oilPriceFeed != address(0);
    }
    
    function getGoldPriceFeed() public view returns (address) {
        return getConfig().goldPriceFeed;
    }
    
    function getOilPriceFeed() public view returns (address) {
        return getConfig().oilPriceFeed;
    }
    
    function getEthPriceFeed() public view returns (address) {
        return getConfig().ethPriceFeed;
    }
    
    function getSequencerFeed() public view returns (address) {
        NetworkConfiguration memory config = getConfig();
        require(config.hasSequencer, "NetworkConfig: no sequencer on this chain");
        return config.sequencerFeed;
    }
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function logNetworkInfo() public view {
        NetworkConfiguration memory config = getConfig();
        
        console.log("==================================");
        console.log("Network Configuration");
        console.log("==================================");
        console.log("Chain ID:", config.chainId);
        console.log("Network:", config.name);
        console.log("Testnet:", config.isTestnet);
        console.log("Has Sequencer:", config.hasSequencer);
        console.log("Deployer:", config.deployer);
        console.log("==================================");
        
        if (config.goldPriceFeed != address(0)) {
            console.log("Gold Price Feed:", config.goldPriceFeed);
        }
        if (config.oilPriceFeed != address(0)) {
            console.log("Oil Price Feed:", config.oilPriceFeed);
        }
        if (config.ethPriceFeed != address(0)) {
            console.log("ETH Price Feed:", config.ethPriceFeed);
        }
        if (config.sequencerFeed != address(0)) {
            console.log("Sequencer Feed:", config.sequencerFeed);
        }
        console.log("==================================");
    }
}
