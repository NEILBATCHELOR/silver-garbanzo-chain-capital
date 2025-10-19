// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IERC20VotesModule.sol";
import "./storage/VotesStorage.sol";

/**
 * @title ERC20VotesModule
 * @notice Modular governance system for ERC20 tokens
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Features:
 * - Vote delegation
 * - Historical vote tracking via checkpoints
 * - Gasless delegation via EIP-712 signatures
 * - Snapshot-based governance
 */
contract ERC20VotesModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    EIP712Upgradeable,
    IERC20VotesModule,
    VotesStorage
{
    // ============ Roles ============
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Constants ============
    bytes32 public constant override DELEGATION_TYPEHASH = 
        keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize votes module
     * @param admin Admin address
     * @param tokenName Token name for EIP-712
     */
    function initialize(
        address admin,
        string memory tokenName
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __EIP712_init(tokenName, "1");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Delegation Functions ============
    
    function delegate(address delegatee) external override {
        _delegate(msg.sender, delegatee);
    }
    
    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        if (block.timestamp > expiry) {
            revert SignatureExpired();
        }
        
        address signer = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(
                DELEGATION_TYPEHASH,
                delegatee,
                nonce,
                expiry
            ))),
            v, r, s
        );
        
        if (nonce != _useNonce(signer)) {
            revert InvalidSignature();
        }
        
        _delegate(signer, delegatee);
    }
    
    function delegates(address account) external view override returns (address) {
        return _delegates[account];
    }
    
    // ============ Voting Power Functions ============
    
    function getVotes(address account) external view override returns (uint256) {
        uint256 pos = _checkpoints[account].length;
        return pos == 0 ? 0 : _checkpoints[account][pos - 1].votes;
    }
    
    function getPastVotes(address account, uint256 blockNumber) external view override returns (uint256) {
        if (blockNumber >= block.number) {
            revert InvalidBlockNumber();
        }
        return _checkpointsLookup(_checkpoints[account], blockNumber);
    }
    
    function getPastTotalSupply(uint256 blockNumber) external view override returns (uint256) {
        if (blockNumber >= block.number) {
            revert InvalidBlockNumber();
        }
        return _checkpointsLookup(_totalSupplyCheckpoints, blockNumber);
    }
    
    function numCheckpoints(address account) external view override returns (uint32) {
        return uint32(_checkpoints[account].length);
    }
    
    function checkpoints(address account, uint32 pos) external view override returns (uint32, uint224) {
        Checkpoint memory checkpoint = _checkpoints[account][pos];
        return (checkpoint.fromBlock, checkpoint.votes);
    }
    
    // ============ Balance Update Hook ============
    
    function updateVotingPower(
        address from,
        address to,
        uint256 amount
    ) external override onlyRole(GOVERNANCE_ROLE) {
        _transferVotingUnits(from, to, amount);
    }
    
    // ============ Internal Functions ============
    
    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = _delegates[delegator];
        _delegates[delegator] = delegatee;
        
        emit DelegateChanged(delegator, currentDelegate, delegatee);
        
        // Move voting power
        _moveDelegateVotes(currentDelegate, delegatee, _getVotingUnits(delegator));
    }
    
    function _transferVotingUnits(address from, address to, uint256 amount) internal {
        // Update voting units tracking
        if (from != address(0)) {
            require(_votingUnits[from] >= amount, "Insufficient voting units");
            _votingUnits[from] -= amount;
        }
        if (to != address(0)) {
            _votingUnits[to] += amount;
        }
        
        // Update total supply checkpoints
        if (from == address(0)) {
            _totalSupplyCheckpoints.push(_add(_getTotalSupply(), amount));
        }
        if (to == address(0)) {
            _totalSupplyCheckpoints.push(_subtract(_getTotalSupply(), amount));
        }
        
        // Move delegate votes
        _moveDelegateVotes(_delegates[from], _delegates[to], amount);
    }
    
    function _moveDelegateVotes(address from, address to, uint256 amount) internal {
        if (from != to && amount > 0) {
            if (from != address(0)) {
                uint256 oldWeight = _checkpoints[from].length == 0 ? 0 : _checkpoints[from][_checkpoints[from].length - 1].votes;
                uint256 newWeight = oldWeight - amount;
                _checkpoints[from].push(_subtract(oldWeight, amount));
                emit DelegateVotesChanged(from, oldWeight, newWeight);
            }
            if (to != address(0)) {
                uint256 oldWeight = _checkpoints[to].length == 0 ? 0 : _checkpoints[to][_checkpoints[to].length - 1].votes;
                uint256 newWeight = oldWeight + amount;
                _checkpoints[to].push(_add(oldWeight, amount));
                emit DelegateVotesChanged(to, oldWeight, newWeight);
            }
        }
    }
    
    function _checkpointsLookup(Checkpoint[] storage ckpts, uint256 blockNumber) internal view returns (uint256) {
        uint256 high = ckpts.length;
        uint256 low = 0;
        while (low < high) {
            uint256 mid = (low + high) / 2;
            if (ckpts[mid].fromBlock > blockNumber) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        return high == 0 ? 0 : ckpts[high - 1].votes;
    }
    
    function _add(uint256 a, uint256 b) internal view returns (Checkpoint memory) {
        return Checkpoint(uint32(block.number), uint224(a + b));
    }
    
    function _subtract(uint256 a, uint256 b) internal view returns (Checkpoint memory) {
        return Checkpoint(uint32(block.number), uint224(a - b));
    }
    
    function _getVotingUnits(address account) internal view returns (uint256) {
        return _votingUnits[account];
    }
    
    function _getTotalSupply() internal view returns (uint256) {
        uint256 pos = _totalSupplyCheckpoints.length;
        return pos == 0 ? 0 : _totalSupplyCheckpoints[pos - 1].votes;
    }
    
    function _useNonce(address owner) internal returns (uint256 current) {
        current = _nonces[owner];
        _nonces[owner] = current + 1;
    }
    
    // ============ EIP-712 Functions ============
    
    function DOMAIN_SEPARATOR() external view override returns (bytes32) {
        return _domainSeparatorV4();
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
