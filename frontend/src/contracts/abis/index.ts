/**
 * Contract ABIs Index
 * Central export for all contract ABIs used in the application
 * These ABIs are used for factory-based deployment and token operations
 * 
 * Note: ABIs are also stored in the database for templates.
 * This file provides TypeScript constants for commonly used ABIs.
 */

// Factory Contract ABI - Used for template registration and cloning
export const FACTORY_ABI = [
  'function registerTemplate(string memory templateType, address templateAddress) external',
  'function getTemplateAddress(string memory templateType) external view returns (address)',
  'function isTemplateRegistered(string memory templateType) external view returns (bool)',
  'function deployMasterInstance(string memory templateType, string memory name, string memory symbol, uint8 decimals, uint256 totalSupply) external returns (address instanceAddress)',
  'function deployModuleInstance(string memory moduleType, address masterAddress) external returns (address instanceAddress)',
  'function owner() external view returns (address)',
  'event MasterDeployed(address indexed instanceAddress, address indexed templateAddress, address indexed deployer)',
  'event ModuleDeployed(address indexed instanceAddress, string moduleType, address indexed masterAddress)',
  'event TemplateRegistered(string templateType, address templateAddress)',
] as const;

// Vesting Module ABI - Used for vesting schedule management
export const VESTING_MODULE_ABI = [
  'function createVestingSchedule(address beneficiary, uint256 amount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, bool revocable, bytes32 category) external',
  'function claim() external returns (uint256)',
  'function claimFor(address beneficiary) external returns (uint256)',
  'function getVestingSchedule(address beneficiary) external view returns (uint256 amount, uint256 claimed, uint256 vested, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration)',
  'function revoke(address beneficiary) external',
  'function getClaimableAmount(address beneficiary) external view returns (uint256)',
  'event VestingScheduleCreated(address indexed beneficiary, uint256 amount, uint256 startTime)',
  'event TokensClaimed(address indexed beneficiary, uint256 amount)',
  'event VestingRevoked(address indexed beneficiary)',
] as const;

// Timelock Module ABI - Used for token locking functionality
export const TIMELOCK_MODULE_ABI = [
  'function lock(address user, uint256 amount, uint256 duration) external returns (uint256 lockId)',
  'function unlock(uint256 lockId) external',
  'function getLock(uint256 lockId) external view returns (uint256 amount, uint256 unlockTime, bool claimed, address owner)',
  'function getUserLocks(address user) external view returns (uint256[])',
  'function getLockedBalance(address user) external view returns (uint256)',
  'event TokensLocked(address indexed user, uint256 indexed lockId, uint256 amount, uint256 unlockTime)',
  'event TokensUnlocked(address indexed user, uint256 indexed lockId, uint256 amount)',
] as const;

// Compliance Module ABI - Used for KYC/AML restrictions
export const COMPLIANCE_MODULE_ABI = [
  'function setKYCRequired(bool required) external',
  'function isKYCRequired() external view returns (bool)',
  'function setTransferRestrictions(bool enabled) external',
  'function addToWhitelist(address account) external',
  'function removeFromWhitelist(address account) external',
  'function isWhitelisted(address account) external view returns (bool)',
  'function addToBlacklist(address account) external',
  'function removeFromBlacklist(address account) external',
  'function isBlacklisted(address account) external view returns (bool)',
  'function setRestrictedCountries(bytes32[] countries) external',
  'function canTransfer(address from, address to, uint256 amount) external view returns (bool)',
  'event WhitelistUpdated(address indexed account, bool status)',
  'event BlacklistUpdated(address indexed account, bool status)',
  'event KYCRequirementUpdated(bool required)',
] as const;

// Document Module ABI - Used for document management
export const DOCUMENT_MODULE_ABI = [
  'function setDocument(bytes32 name, string uri, bytes32 documentHash) external',
  'function getDocument(bytes32 name) external view returns (string uri, bytes32 documentHash, uint256 timestamp)',
  'function removeDocument(bytes32 name) external',
  'function getDocuments() external view returns (bytes32[])',
  'event DocumentSet(bytes32 indexed name, string uri, bytes32 documentHash)',
  'event DocumentRemoved(bytes32 indexed name)',
] as const;

// ERC20 Token ABI - Standard token operations
export const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function mint(address to, uint256 amount) external',
  'function burn(uint256 amount) external',
  'function burnFrom(address account, uint256 amount) external',
  'function pause() external',
  'function unpause() external',
  'function paused() external view returns (bool)',
  'function owner() external view returns (address)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

// Role constants for access control
export const ROLE_CONSTANTS = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  BURNER_ROLE: '0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848',
  PAUSER_ROLE: '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a',
  UPGRADER_ROLE: '0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3',
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
} as const;
