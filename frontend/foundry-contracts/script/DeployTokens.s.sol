// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BaseERC20Token.sol";
import "../src/BaseERC721Token.sol";
import "../src/BaseERC1155Token.sol";

contract DeployTokens is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying contracts with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        // Deploy ERC20 Token
        BaseERC20Token.TokenConfig memory erc20Config = BaseERC20Token.TokenConfig({
            name: "Sample ERC20",
            symbol: "SERC20",
            decimals: 18,
            initialSupply: 1000000 * 10**18,
            maxSupply: 10000000 * 10**18,
            transfersPaused: false,
            mintingEnabled: true,
            burningEnabled: true,
            votingEnabled: true,
            initialOwner: deployer
        });

        BaseERC20Token erc20Token = new BaseERC20Token(erc20Config);
        console.log("ERC20 Token deployed at:", address(erc20Token));

        // Deploy ERC721 Token
        BaseERC721Token.TokenConfig memory erc721Config = BaseERC721Token.TokenConfig({
            name: "Sample NFT",
            symbol: "SNFT",
            baseURI: "https://api.example.com/metadata/",
            maxSupply: 10000,
            mintPrice: 0.01 ether,
            transfersPaused: false,
            mintingEnabled: true,
            burningEnabled: true,
            publicMinting: true,
            initialOwner: deployer
        });

        BaseERC721Token erc721Token = new BaseERC721Token(erc721Config);
        console.log("ERC721 Token deployed at:", address(erc721Token));

        // Deploy ERC1155 Token
        BaseERC1155Token.TokenConfig memory erc1155Config = BaseERC1155Token.TokenConfig({
            name: "Sample Multi-Token",
            symbol: "SMT",
            baseURI: "https://api.example.com/metadata/{id}",
            transfersPaused: false,
            mintingEnabled: true,
            burningEnabled: true,
            publicMinting: true,
            initialOwner: deployer
        });

        BaseERC1155Token erc1155Token = new BaseERC1155Token(erc1155Config);
        console.log("ERC1155 Token deployed at:", address(erc1155Token));

        vm.stopBroadcast();

        // Log deployment information
        console.log("\n=== Deployment Summary ===");
        console.log("ERC20 Token:");
        console.log("  Address:", address(erc20Token));
        console.log("  Name:", erc20Token.name());
        console.log("  Symbol:", erc20Token.symbol());
        console.log("  Total Supply:", erc20Token.totalSupply());

        console.log("\nERC721 Token:");
        console.log("  Address:", address(erc721Token));
        console.log("  Name:", erc721Token.name());
        console.log("  Symbol:", erc721Token.symbol());

        console.log("\nERC1155 Token:");
        console.log("  Address:", address(erc1155Token));
        console.log("  Name:", erc1155Token.name());
        console.log("  Symbol:", erc1155Token.symbol());
    }
}
