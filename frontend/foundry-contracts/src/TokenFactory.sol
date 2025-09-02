// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseERC20Token.sol";
import "./BaseERC721Token.sol";
import "./BaseERC1155Token.sol";
import "./BaseERC1400Token.sol";
import "./BaseERC3525Token.sol";
import "./BaseERC4626Token.sol";

/**
 * @title TokenFactory
 * @notice Factory contract for deploying different types of tokens
 */
contract TokenFactory {
    // Events
    event ERC20TokenDeployed(address indexed token, address indexed owner, string name, string symbol);
    event ERC721TokenDeployed(address indexed token, address indexed owner, string name, string symbol);
    event ERC1155TokenDeployed(address indexed token, address indexed owner, string name, string symbol);
    event ERC1400TokenDeployed(address indexed token, address indexed owner, string name, string symbol);
    event ERC3525TokenDeployed(address indexed token, address indexed owner, string name, string symbol);
    event ERC4626TokenDeployed(address indexed token, address indexed owner, string name, string symbol);

    /**
     * @notice Deploy a new ERC20 token
     * @param config Token configuration
     * @return address Address of the deployed token
     */
    function deployERC20Token(BaseERC20Token.TokenConfig memory config) 
        external 
        returns (address) 
    {
        BaseERC20Token token = new BaseERC20Token(config);
        
        emit ERC20TokenDeployed(
            address(token),
            config.initialOwner,
            config.name,
            config.symbol
        );
        
        return address(token);
    }

    /**
     * @notice Deploy a new ERC721 token
     * @param config Token configuration
     * @return address Address of the deployed token
     */
    function deployERC721Token(BaseERC721Token.TokenConfig memory config) 
        external 
        returns (address) 
    {
        BaseERC721Token token = new BaseERC721Token(config);
        
        emit ERC721TokenDeployed(
            address(token),
            config.initialOwner,
            config.name,
            config.symbol
        );
        
        return address(token);
    }

    /**
     * @notice Deploy a new ERC1155 token
     * @param config Token configuration
     * @return address Address of the deployed token
     */
    function deployERC1155Token(BaseERC1155Token.TokenConfig memory config) 
        external 
        returns (address) 
    {
        BaseERC1155Token token = new BaseERC1155Token(config);
        
        emit ERC1155TokenDeployed(
            address(token),
            config.initialOwner,
            config.name,
            config.symbol
        );
        
        return address(token);
    }

    /**
     * @notice Deploy a new ERC1400 token
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply
     * @param cap Maximum supply (0 for unlimited)
     * @param controller Controller address
     * @param requireKYC Whether KYC is required
     * @param documentURI Document URI
     * @param documentHash Document hash
     * @return address Address of the deployed token
     */
    function deployERC1400Token(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 cap,
        address controller,
        bool requireKYC,
        string memory documentURI,
        bytes32 documentHash
    ) external returns (address) {
        BaseERC1400Token token = new BaseERC1400Token(
            name,
            symbol,
            initialSupply,
            cap,
            controller,
            requireKYC,
            documentURI,
            documentHash
        );
        
        emit ERC1400TokenDeployed(
            address(token),
            msg.sender,
            name,
            symbol
        );
        
        return address(token);
    }

    /**
     * @notice Deploy a new ERC3525 token
     * @param config Token configuration
     * @param initialSlots Initial slots to create
     * @param allocations Initial allocations
     * @param royaltyFraction Royalty fraction in basis points
     * @param royaltyRecipient Royalty recipient address
     * @return address Address of the deployed token
     */
    function deployERC3525Token(
        BaseERC3525Token.TokenConfig memory config,
        BaseERC3525Token.SlotInfo[] memory initialSlots,
        BaseERC3525Token.AllocationInfo[] memory allocations,
        uint96 royaltyFraction,
        address royaltyRecipient
    ) external returns (address) {
        BaseERC3525Token token = new BaseERC3525Token(
            config,
            initialSlots,
            allocations,
            royaltyFraction,
            royaltyRecipient
        );
        
        emit ERC3525TokenDeployed(
            address(token),
            config.initialOwner,
            config.name,
            config.symbol
        );
        
        return address(token);
    }

    /**
     * @notice Deploy a new ERC4626 token
     * @param asset Underlying asset address
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Token decimals
     * @param owner Initial owner
     * @return address Address of the deployed token
     */
    function deployERC4626Token(
        address asset,
        string memory name,
        string memory symbol,
        uint8 decimals,
        address owner
    ) external returns (address) {
        BaseERC4626Token token = new BaseERC4626Token(
            asset,
            name,
            symbol,
            decimals,
            owner
        );
        
        emit ERC4626TokenDeployed(
            address(token),
            owner,
            name,
            symbol
        );
        
        return address(token);
    }

    /**
     * @notice Get the predicted address for a token deployment
     * @param tokenType Type of token (0=ERC20, 1=ERC721, 2=ERC1155, 3=ERC1400, 4=ERC3525, 5=ERC4626)
     * @param salt Salt for create2 deployment
     * @return address Predicted address
     */
    function predictTokenAddress(uint256 tokenType, bytes32 salt) 
        external 
        view 
        returns (address) 
    {
        bytes32 bytecodeHash;
        
        if (tokenType == 0) {
            bytecodeHash = keccak256(type(BaseERC20Token).creationCode);
        } else if (tokenType == 1) {
            bytecodeHash = keccak256(type(BaseERC721Token).creationCode);
        } else if (tokenType == 2) {
            bytecodeHash = keccak256(type(BaseERC1155Token).creationCode);
        } else if (tokenType == 3) {
            bytecodeHash = keccak256(type(BaseERC1400Token).creationCode);
        } else if (tokenType == 4) {
            bytecodeHash = keccak256(type(BaseERC3525Token).creationCode);
        } else if (tokenType == 5) {
            bytecodeHash = keccak256(type(BaseERC4626Token).creationCode);
        } else {
            revert("Invalid token type");
        }
        
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            bytecodeHash
        )))));
    }

    /**
     * @notice Deploy a token using create2 for deterministic addresses
     * @param tokenType Type of token (0=ERC20, 1=ERC721, 2=ERC1155, 3=ERC1400, 4=ERC3525, 5=ERC4626)
     * @param configData Encoded configuration data
     * @param salt Salt for create2 deployment
     * @return address Address of the deployed token
     */
    function deployTokenWithSalt(
        uint256 tokenType,
        bytes memory configData,
        bytes32 salt
    ) external returns (address) {
        address deployed;
        
        if (tokenType == 0) {
            BaseERC20Token.TokenConfig memory config = abi.decode(configData, (BaseERC20Token.TokenConfig));
            deployed = address(new BaseERC20Token{salt: salt}(config));
            emit ERC20TokenDeployed(deployed, config.initialOwner, config.name, config.symbol);
        } else if (tokenType == 1) {
            BaseERC721Token.TokenConfig memory config = abi.decode(configData, (BaseERC721Token.TokenConfig));
            deployed = address(new BaseERC721Token{salt: salt}(config));
            emit ERC721TokenDeployed(deployed, config.initialOwner, config.name, config.symbol);
        } else if (tokenType == 2) {
            BaseERC1155Token.TokenConfig memory config = abi.decode(configData, (BaseERC1155Token.TokenConfig));
            deployed = address(new BaseERC1155Token{salt: salt}(config));
            emit ERC1155TokenDeployed(deployed, config.initialOwner, config.name, config.symbol);
        } else if (tokenType == 3) {
            (
                string memory name,
                string memory symbol,
                uint256 initialSupply,
                uint256 cap,
                address controller,
                bool requireKYC,
                string memory documentURI,
                bytes32 documentHash
            ) = abi.decode(configData, (string, string, uint256, uint256, address, bool, string, bytes32));
            deployed = address(new BaseERC1400Token{salt: salt}(
                name,
                symbol,
                initialSupply,
                cap,
                controller,
                requireKYC,
                documentURI,
                documentHash
            ));
            emit ERC1400TokenDeployed(deployed, msg.sender, name, symbol);
        } else if (tokenType == 4) {
            (
                BaseERC3525Token.TokenConfig memory config,
                BaseERC3525Token.SlotInfo[] memory initialSlots,
                BaseERC3525Token.AllocationInfo[] memory allocations,
                uint96 royaltyFraction,
                address royaltyRecipient
            ) = abi.decode(configData, (
                BaseERC3525Token.TokenConfig,
                BaseERC3525Token.SlotInfo[],
                BaseERC3525Token.AllocationInfo[],
                uint96,
                address
            ));
            deployed = address(new BaseERC3525Token{salt: salt}(
                config,
                initialSlots,
                allocations,
                royaltyFraction,
                royaltyRecipient
            ));
            emit ERC3525TokenDeployed(deployed, config.initialOwner, config.name, config.symbol);
        } else if (tokenType == 5) {
            (
                address asset,
                string memory name,
                string memory symbol,
                uint8 decimals,
                address owner
            ) = abi.decode(configData, (address, string, string, uint8, address));
            deployed = address(new BaseERC4626Token{salt: salt}(
                asset,
                name,
                symbol,
                decimals,
                owner
            ));
            emit ERC4626TokenDeployed(deployed, owner, name, symbol);
        } else {
            revert("Invalid token type");
        }
        
        return deployed;
    }
}
