// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CREATE2Deployer
 * @notice Deploy contracts with deterministic addresses across all EVM chains
 * @dev Uses CREATE2 opcode for predictable contract addresses
 */
contract CREATE2Deployer {
    
    /**
     * @notice Deploy a contract using CREATE2
     * @param salt Unique salt for address generation
     * @param bytecode Contract creation bytecode
     * @return deployed Address of the deployed contract
     */
    function deploy(bytes32 salt, bytes memory bytecode) 
        external 
        returns (address deployed) 
    {
        assembly {
            deployed := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(deployed)) {
                revert(0, 0)
            }
        }
        
        emit ContractDeployed(deployed, salt, msg.sender);
    }
    
    /**
     * @notice Predict the address where a contract will be deployed
     * @param salt Unique salt for address generation
     * @param bytecode Contract creation bytecode
     * @param deployer Address that will deploy the contract
     * @return predicted Predicted contract address
     */
    function predictAddress(
        bytes32 salt,
        bytes memory bytecode,
        address deployer
    ) public pure returns (address predicted) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                deployer,
                salt,
                keccak256(bytecode)
            )
        );
        
        return address(uint160(uint256(hash)));
    }
    
    /**
     * @notice Check if a contract is deployed at an address
     * @param account Address to check
     * @return bool True if contract exists
     */
    function isDeployed(address account) public view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
    
    // Events
    event ContractDeployed(
        address indexed deployed,
        bytes32 indexed salt,
        address indexed deployer
    );
}
