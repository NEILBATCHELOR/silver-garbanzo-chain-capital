# Smart Contract Roles Reference

## Overview
This document describes all smart contract roles available in the Chain Capital platform, organized by category and contract usage.

## Role Categories

### Master Administrator Roles
**Highest level administrative authority**

#### DEFAULT_ADMIN_ROLE
- **Used in**: ERC20Master
- **Authority**: Master admin, manages all roles
- **Key Functions**:
  - Grant/revoke all other roles
  - Configure contract settings
  - Emergency controls

#### OWNER_ROLE
- **Used in**: ERC721Master, ERC1155Master, ERC3525Master, ERC4626Master, ERC1400Master, TokenFactory
- **Authority**: Single administrator with all permissions
- **Key Functions**:
  - Mint/burn tokens
  - Configure settings
  - Attach extension modules
  - Authorize upgrades

### Upgrade & Governance Roles
**Contract upgrade and governance processes**

#### UPGRADER_ROLE
- **Used in**: PolicyEngine, PolicyRegistry, TokenRegistry, UpgradeGovernor, ERC20Master
- **Authority**: Authorizes contract upgrades
- **Key Functions**:
  - Propose UUPS upgrades
  - Approve upgrade proposals
  - Execute upgrades
  - Record upgrade history

#### PROPOSER_ROLE
- **Used in**: UpgradeGovernance
- **Authority**: Creates upgrade proposals
- **Key Functions**:
  - Submit upgrade proposals
  - Provide upgrade justification
  - Set upgrade parameters

#### APPROVER_ROLE
- **Used in**: PolicyEngine, UpgradeGovernance
- **Authority**: Approves multi-signature operations
- **Key Functions**:
  - Vote on upgrade proposals (min 2 required)
  - Approve policy changes
  - Multi-sig authorization

#### EXECUTOR_ROLE
- **Used in**: UpgradeGovernance
- **Authority**: Executes approved proposals
- **Key Functions**:
  - Execute proposals after timelock
  - Implement approved upgrades
  - Deploy authorized changes

### Compliance Roles
**Regulatory and compliance oversight**

#### COMPLIANCE_OFFICER_ROLE
- **Authority**: Compliance oversight and enforcement
- **Key Functions**:
  - Monitor regulatory compliance
  - Enforce compliance policies
  - Generate compliance reports

#### CONTROLLER_ROLE
- **Authority**: Financial control and oversight
- **Key Functions**:
  - Financial oversight
  - Transaction monitoring
  - Risk management

### Policy & Registry Roles
**Policy and token registry management**

#### POLICY_ADMIN_ROLE
- **Used in**: PolicyEngine
- **Authority**: Creates/manages policies, sets limits
- **Key Functions**:
  - Create policy templates
  - Set operational limits
  - Configure policy rules
  - Update policy parameters

#### REGISTRY_ADMIN_ROLE
- **Used in**: PolicyRegistry
- **Authority**: Registers tokens and policies
- **Key Functions**:
  - Register new tokens
  - Link policies to tokens
  - Manage registry entries

#### REGISTRAR_ROLE
- **Used in**: TokenRegistry
- **Authority**: Registers token deployments
- **Key Functions**:
  - Record new token deployments
  - Track token lifecycle
  - Update token metadata
  - Manage token versions

### Asset Management Roles
**Investment and treasury management**

#### VAULT_MANAGER_ROLE
- **Authority**: Vault and treasury management
- **Key Functions**:
  - Manage vault assets
  - Execute deposits/withdrawals
  - Treasury operations

#### REBALANCER_ROLE
- **Authority**: Portfolio rebalancing
- **Key Functions**:
  - Rebalance portfolios
  - Adjust asset allocations
  - Execute trading strategies

#### STRATEGY_MANAGER_ROLE
- **Authority**: Investment strategy management
- **Key Functions**:
  - Define investment strategies
  - Set strategy parameters
  - Monitor strategy performance

### Operations Roles
**Day-to-day operational functions**

#### MINTER_ROLE
- **Used in**: ERC20Master
- **Authority**: Token minting
- **Key Functions**:
  - Mint new tokens
  - Increase token supply
  - Authorize token creation

#### PAUSER_ROLE
- **Used in**: ERC20Master, UpgradeGovernance
- **Authority**: Emergency pause mechanism
- **Key Functions**:
  - Pause token transfers
  - Emergency stop operations
  - Resume normal operations

#### FEE_MANAGER_ROLE
- **Authority**: Fee structure management
- **Key Functions**:
  - Set transaction fees
  - Configure fee schedules
  - Manage fee distribution

#### SNAPSHOT_ROLE
- **Authority**: Balance snapshot creation
- **Key Functions**:
  - Create balance snapshots
  - Record historical states
  - Support voting/dividends

### Content Roles
**Token metadata and documentation**

#### DOCUMENT_MANAGER_ROLE
- **Authority**: Document management
- **Key Functions**:
  - Upload/manage documents
  - Version control
  - Access control

#### URI_MANAGER_ROLE
- **Authority**: URI and metadata endpoints
- **Key Functions**:
  - Set token URIs
  - Manage metadata locations
  - Update endpoint references

#### METADATA_UPDATER_ROLE
- **Authority**: Token metadata updates
- **Key Functions**:
  - Update token metadata
  - Modify token properties
  - Refresh metadata cache

### Governance Roles
**Governance and vesting**

#### GOVERNANCE_ROLE
- **Authority**: Governance proposals and voting
- **Key Functions**:
  - Submit governance proposals
  - Participate in voting
  - Execute governance decisions

#### VESTING_MANAGER_ROLE
- **Authority**: Vesting schedule management
- **Key Functions**:
  - Create vesting schedules
  - Manage unlock periods
  - Process vesting claims

## Contract-to-Role Mapping

### TokenFactory
- OWNER_ROLE

### PolicyEngine
- POLICY_ADMIN_ROLE
- APPROVER_ROLE
- UPGRADER_ROLE

### PolicyRegistry
- REGISTRY_ADMIN_ROLE
- UPGRADER_ROLE

### TokenRegistry
- REGISTRAR_ROLE
- UPGRADER_ROLE

### UpgradeGovernance
- PROPOSER_ROLE
- APPROVER_ROLE
- EXECUTOR_ROLE
- PAUSER_ROLE

### UpgradeGovernor
- UPGRADER_ROLE

### ERC20Master
- DEFAULT_ADMIN_ROLE
- MINTER_ROLE
- PAUSER_ROLE
- UPGRADER_ROLE

### Master Contracts (ERC721, ERC1155, ERC3525, ERC4626, ERC1400)
- OWNER_ROLE

## Role Assignment Best Practices

1. **Principle of Least Privilege**: Only assign roles necessary for job function
2. **Separation of Duties**: Critical operations require multiple roles
3. **Multi-Signature Requirements**: High-risk operations need APPROVER_ROLE (min 2)
4. **Emergency Procedures**: Always assign PAUSER_ROLE for emergency controls
5. **Audit Trail**: All role assignments should be logged and monitored
6. **Regular Review**: Periodically review and update role assignments
7. **Owner Role**: Use sparingly - represents single point of control

## Multi-Signature Roles

The following roles typically require multiple signers:
- APPROVER_ROLE (minimum 2 required)
- EXECUTOR_ROLE (for critical operations)
- UPGRADER_ROLE (for production contracts)

## Emergency Roles

Critical for incident response:
- PAUSER_ROLE: Immediate halt of operations
- OWNER_ROLE: Override authority
- DEFAULT_ADMIN_ROLE: Role management in emergencies

## Total Roles: 23

Organized into 8 categories for efficient management and clear separation of duties.