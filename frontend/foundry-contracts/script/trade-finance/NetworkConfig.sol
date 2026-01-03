// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title NetworkConfig
 * @notice Universal network configuration for Trade Finance deployments
 * @dev FIXED: Uses vm.envOr with fallbacks instead of lazy initialization
 *      This prevents deployment failures while maintaining compatibility
 */
contract NetworkConfig is Script {
    
    // ============================================
    // NETWORK IDENTIFIERS
    // ============================================
    
    uint256 constant MAINNET_CHAIN_ID = 1;
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 constant HOLESKY_CHAIN_ID = 17000;
    uint256 constant HOODI_CHAIN_ID = 560048;
    
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
    uint256 constant AMOY_CHAIN_ID = 80002;
    uint256 constant ZKSYNC_SEPOLIA_CHAIN_ID = 300;
    
    // Injective
    uint256 constant INJECTIVE_MAINNET_CHAIN_ID = 1776; // EVM Chain ID for Injective Mainnet
    uint256 constant INJECTIVE_TESTNET_CHAIN_ID = 1439; // EVM Chain ID for Injective Testnet
    
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
        address goldPriceFeed;
        address silverPriceFeed;
        address oilPriceFeed;
        address ethPriceFeed;
        
        // Network-specific settings
        bool isTestnet;
        bool hasSequencer;
        address sequencerFeed;
        
        // Governance
        address governanceMultiSig;
        address emergencyAdmin;
        
        // Gas settings
        uint256 baseFeeMultiplier;
        uint256 priorityFeeGwei;
    }
    
    // ============================================
    // STORAGE
    // ============================================
    
    mapping(uint256 => NetworkConfiguration) private configs;
    
    // ============================================
    // CONSTRUCTOR - USES envOr WITH FALLBACKS
    // ============================================
    
    constructor() {
        _initializeNetworkConfigs();
    }
    
    // ============================================
    // INITIALIZATION WITH FALLBACKS
    // ============================================
    
    function _initializeNetworkConfigs() internal {
        // Hoodi Testnet - Hardcoded (no env vars needed)
        configs[HOODI_CHAIN_ID] = NetworkConfiguration({
            chainId: HOODI_CHAIN_ID,
            name: "Hoodi Testnet",
            rpcUrl: "https://eth-hoodi.g.alchemy.com/v2/Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP",
            explorerUrl: "https://hoodi.etherscan.io",
            explorerApiUrl: "https://hoodi.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: address(0),
            isTestnet: true,
            hasSequencer: false,
            sequencerFeed: address(0),
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", vm.envAddress("DEPLOYER_ADDRESS")),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", vm.envAddress("DEPLOYER_ADDRESS")),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 1
        });
        
        // Ethereum Mainnet - Use envOr with fallback
        configs[MAINNET_CHAIN_ID] = NetworkConfiguration({
            chainId: MAINNET_CHAIN_ID,
            name: "Ethereum Mainnet",
            rpcUrl: vm.envOr("VITE_MAINNET_RPC_URL", string("https://eth-mainnet.g.alchemy.com/v2/demo")),
            explorerUrl: "https://etherscan.io",
            explorerApiUrl: "https://api.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6,
            silverPriceFeed: 0x379589227b15F1a12195D3f2d90bBc9F31f95235,
            oilPriceFeed: 0xf3584F4dd3b467e73C2339EfD008665a70A4185c,
            ethPriceFeed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419,
            isTestnet: false,
            hasSequencer: false,
            sequencerFeed: address(0),
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 120,
            priorityFeeGwei: 2
        });
        
        // Sepolia Testnet - Use envOr with fallback
        configs[SEPOLIA_CHAIN_ID] = NetworkConfiguration({
            chainId: SEPOLIA_CHAIN_ID,
            name: "Sepolia Testnet",
            rpcUrl: vm.envOr("VITE_SEPOLIA_RPC_URL", string("https://eth-sepolia.g.alchemy.com/v2/demo")),
            explorerUrl: "https://sepolia.etherscan.io",
            explorerApiUrl: "https://api-sepolia.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Ea,
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x694AA1769357215DE4FAC081bf1f309aDC325306,
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
            rpcUrl: vm.envOr("VITE_BASE_RPC_URL", string("https://mainnet.base.org")),
            explorerUrl: "https://basescan.org",
            explorerApiUrl: "https://api.basescan.org/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0x8946A183BFaFA95BEcf57c5e08fE5B7654d2807B,
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70,
            isTestnet: false,
            hasSequencer: true,
            sequencerFeed: 0xBCF85224fc0756B9Fa45aA7892530B47e10b6433,
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 0
        });
        
        // Base Sepolia
        configs[BASE_SEPOLIA_CHAIN_ID] = NetworkConfiguration({
            chainId: BASE_SEPOLIA_CHAIN_ID,
            name: "Base Sepolia",
            rpcUrl: vm.envOr("VITE_BASE_SEPOLIA_RPC_URL", string("https://sepolia.base.org")),
            explorerUrl: "https://sepolia.basescan.org",
            explorerApiUrl: "https://api-sepolia.basescan.org/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1,
            isTestnet: true,
            hasSequencer: true,
            sequencerFeed: 0x4C4814aa04433e0FB31310379a4D6946D5e1D353,
            governanceMultiSig: vm.envAddress("DEPLOYER_ADDRESS"),
            emergencyAdmin: vm.envAddress("DEPLOYER_ADDRESS"),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 0
        });
        
        // Arbitrum One
        configs[ARBITRUM_CHAIN_ID] = NetworkConfiguration({
            chainId: ARBITRUM_CHAIN_ID,
            name: "Arbitrum One",
            rpcUrl: vm.envOr("VITE_ARBITRUM_RPC_URL", string("https://arb1.arbitrum.io/rpc")),
            explorerUrl: "https://arbiscan.io",
            explorerApiUrl: "https://api.arbiscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0x0be7C1338e1B1e7BF58DD8F1447C4f73d9DFCa2D,
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612,
            isTestnet: false,
            hasSequencer: true,
            sequencerFeed: 0xFdB631F5EE196F0ed6FAa767959853A9F217697D,
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 105,
            priorityFeeGwei: 0
        });
        
        // Arbitrum Sepolia
        configs[ARBITRUM_SEPOLIA_CHAIN_ID] = NetworkConfiguration({
            chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
            name: "Arbitrum Sepolia",
            rpcUrl: vm.envOr("VITE_ARBITRUM_SEPOLIA_RPC_URL", string("https://sepolia-rollup.arbitrum.io/rpc")),
            explorerUrl: "https://sepolia.arbiscan.io",
            explorerApiUrl: "https://api-sepolia.arbiscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165,
            isTestnet: true,
            hasSequencer: true,
            sequencerFeed: 0x00D4A2dF2Ab9e57e065f18CF70f5F94B20c19A1a,
            governanceMultiSig: vm.envAddress("DEPLOYER_ADDRESS"),
            emergencyAdmin: vm.envAddress("DEPLOYER_ADDRESS"),
            baseFeeMultiplier: 105,
            priorityFeeGwei: 0
        });
        
        // Optimism
        configs[OPTIMISM_CHAIN_ID] = NetworkConfiguration({
            chainId: OPTIMISM_CHAIN_ID,
            name: "Optimism",
            rpcUrl: vm.envOr("VITE_OPTIMISM_RPC_URL", string("https://mainnet.optimism.io")),
            explorerUrl: "https://optimistic.etherscan.io",
            explorerApiUrl: "https://api-optimistic.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: 0x9A7b213e13Ff6653a7C024f90A1371E0097C0D66,
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x13e3Ee699D1909E989722E753853AE30b17e08c5,
            isTestnet: false,
            hasSequencer: true,
            sequencerFeed: 0x371EAD81c9102C9BF4874A9075FFFf170F2Ee389,
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 0
        });
        
        // Optimism Sepolia
        configs[OPTIMISM_SEPOLIA_CHAIN_ID] = NetworkConfiguration({
            chainId: OPTIMISM_SEPOLIA_CHAIN_ID,
            name: "Optimism Sepolia",
            rpcUrl: vm.envOr("VITE_OPTIMISM_SEPOLIA_RPC_URL", string("https://sepolia.optimism.io")),
            explorerUrl: "https://sepolia-optimism.etherscan.io",
            explorerApiUrl: "https://api-sepolia-optimistic.etherscan.io/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0x61Ec26aA57019C486B10502285c5A3D4A4750AD7,
            isTestnet: true,
            hasSequencer: true,
            sequencerFeed: 0x29E65d5A1c5065ca4Ca4d17E0f84030Ab35f0E98,
            governanceMultiSig: vm.envAddress("DEPLOYER_ADDRESS"),
            emergencyAdmin: vm.envAddress("DEPLOYER_ADDRESS"),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 0
        });
        
        // Polygon
        configs[POLYGON_CHAIN_ID] = NetworkConfiguration({
            chainId: POLYGON_CHAIN_ID,
            name: "Polygon",
            rpcUrl: vm.envOr("VITE_POLYGON_RPC_URL", string("https://polygon-rpc.com")),
            explorerUrl: "https://polygonscan.com",
            explorerApiUrl: "https://api.polygonscan.com/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: 0xF9680D99D6C9589e2a93a78A04A279e509205945,
            isTestnet: false,
            hasSequencer: false,
            sequencerFeed: address(0),
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 120,
            priorityFeeGwei: 30
        });
        
        // Amoy (Polygon Testnet)
        configs[AMOY_CHAIN_ID] = NetworkConfiguration({
            chainId: AMOY_CHAIN_ID,
            name: "Amoy",
            rpcUrl: vm.envOr("VITE_AMOY_RPC_URL", string("https://rpc-amoy.polygon.technology")),
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
        
        // Injective Mainnet
        configs[INJECTIVE_MAINNET_CHAIN_ID] = NetworkConfiguration({
            chainId: INJECTIVE_MAINNET_CHAIN_ID,
            name: "Injective",
            rpcUrl: vm.envOr("VITE_INJECTIVE_RPC_URL", string("https://evm-rpc.injective.network")),
            explorerUrl: "https://explorer.injective.network",
            explorerApiUrl: "https://explorer.injective.network/api",
            deployer: vm.envAddress("DEPLOYER_ADDRESS"),
            goldPriceFeed: address(0),
            silverPriceFeed: address(0),
            oilPriceFeed: address(0),
            ethPriceFeed: address(0),
            isTestnet: false,
            hasSequencer: false,
            sequencerFeed: address(0),
            governanceMultiSig: vm.envOr("GOVERNANCE_MULTISIG", address(0)),
            emergencyAdmin: vm.envOr("EMERGENCY_ADMIN", address(0)),
            baseFeeMultiplier: 110,
            priorityFeeGwei: 1
        });
        
        // Injective Testnet
        configs[INJECTIVE_TESTNET_CHAIN_ID] = NetworkConfiguration({
            chainId: INJECTIVE_TESTNET_CHAIN_ID,
            name: "Injective Testnet",
            rpcUrl: vm.envOr("VITE_INJECTIVE_TESTNET_RPC_URL", string("https://testnet.evm-rpc.injective.network")),
            explorerUrl: "https://testnet.explorer.injective.network",
            explorerApiUrl: "https://testnet.explorer.injective.network/api",
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
            baseFeeMultiplier: 110,
            priorityFeeGwei: 1
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
