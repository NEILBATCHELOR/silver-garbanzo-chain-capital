/**
 * Module Selection Transformer
 * Converts moduleSelection UI object to individual database column names
 * 
 * CRITICAL: moduleSelection is NOT a database column!
 * Instead, it should be transformed to individual module address columns.
 */

export interface ModuleSelection {
  // Universal modules (all standards)
  compliance?: { enabled: boolean; address?: string };
  policyEngine?: { enabled: boolean; address?: string };
  document?: { enabled: boolean; address?: string };
  vesting?: { enabled: boolean; address?: string };

  // ERC20-specific modules
  fees?: { enabled: boolean; address?: string };
  flashMint?: { enabled: boolean; address?: string };
  permit?: { enabled: boolean; address?: string };
  snapshot?: { enabled: boolean; address?: string };
  timelock?: { enabled: boolean; address?: string };
  votes?: { enabled: boolean; address?: string };
  payableToken?: { enabled: boolean; address?: string };
  temporaryApproval?: { enabled: boolean; address?: string };

  // ERC721-specific modules
  royalty?: { enabled: boolean; address?: string };
  rental?: { enabled: boolean; address?: string };
  soulbound?: { enabled: boolean; address?: string };
  fraction?: { enabled: boolean; address?: string };
  consecutive?: { enabled: boolean; address?: string };
  metadataEvents?: { enabled: boolean; address?: string };

  // ERC1155-specific modules
  supplyCap?: { enabled: boolean; address?: string };
  uriManagement?: { enabled: boolean; address?: string };

  // ERC3525-specific modules
  slotApprovable?: { enabled: boolean; address?: string };
  slotManager?: { enabled: boolean; address?: string };
  valueExchange?: { enabled: boolean; address?: string };

  // ERC4626-specific modules
  feeStrategy?: { enabled: boolean; address?: string };
  withdrawalQueue?: { enabled: boolean; address?: string };
  yieldStrategy?: { enabled: boolean; address?: string };
  asyncVault?: { enabled: boolean; address?: string };
  nativeVault?: { enabled: boolean; address?: string };
  router?: { enabled: boolean; address?: string };
  multiAssetVault?: { enabled: boolean; address?: string };

  // ERC1400-specific modules
  controller?: { enabled: boolean; address?: string };
  transferRestrictions?: { enabled: boolean; address?: string };
  erc1400Document?: { enabled: boolean; address?: string };
}

/**
 * Transform moduleSelection object to individual database columns
 * @param moduleSelection The module selection from the UI
 * @param tokenStandard The token standard (erc20, erc721, etc.)
 * @returns Object with individual module address columns
 */
export function transformModuleSelectionToColumns(
  moduleSelection: ModuleSelection | undefined,
  tokenStandard: string
): Record<string, string | null> {
  if (!moduleSelection) return {};

  const result: Record<string, string | null> = {};
  const lowerStandard = tokenStandard.toLowerCase();

  // Universal modules (all standards)
  if (moduleSelection.compliance?.enabled && moduleSelection.compliance.address) {
    result.compliance_module_address = moduleSelection.compliance.address;
  }
  if (moduleSelection.policyEngine?.enabled && moduleSelection.policyEngine.address) {
    result.policy_engine_address = moduleSelection.policyEngine.address;
  }
  if (moduleSelection.document?.enabled && moduleSelection.document.address) {
    result.document_module_address = moduleSelection.document.address;
  }
  if (moduleSelection.vesting?.enabled && moduleSelection.vesting.address) {
    result.vesting_module_address = moduleSelection.vesting.address;
  }

  // Standard-specific modules
  switch (lowerStandard) {
    case 'erc20':
      if (moduleSelection.fees?.enabled && moduleSelection.fees.address) {
        result.fees_module_address = moduleSelection.fees.address;
      }
      if (moduleSelection.flashMint?.enabled && moduleSelection.flashMint.address) {
        result.flash_mint_module_address = moduleSelection.flashMint.address;
      }
      if (moduleSelection.permit?.enabled && moduleSelection.permit.address) {
        result.permit_module_address = moduleSelection.permit.address;
      }
      if (moduleSelection.snapshot?.enabled && moduleSelection.snapshot.address) {
        result.snapshot_module_address = moduleSelection.snapshot.address;
      }
      if (moduleSelection.timelock?.enabled && moduleSelection.timelock.address) {
        result.timelock_module_address = moduleSelection.timelock.address;
      }
      if (moduleSelection.votes?.enabled && moduleSelection.votes.address) {
        result.votes_module_address = moduleSelection.votes.address;
      }
      if (moduleSelection.payableToken?.enabled && moduleSelection.payableToken.address) {
        result.payable_token_module_address = moduleSelection.payableToken.address;
      }
      if (moduleSelection.temporaryApproval?.enabled && moduleSelection.temporaryApproval.address) {
        result.temporary_approval_module_address = moduleSelection.temporaryApproval.address;
      }
      break;

    case 'erc721':
      if (moduleSelection.royalty?.enabled && moduleSelection.royalty.address) {
        result.royalty_module_address = moduleSelection.royalty.address;
      }
      if (moduleSelection.rental?.enabled && moduleSelection.rental.address) {
        result.rental_module_address = moduleSelection.rental.address;
      }
      if (moduleSelection.soulbound?.enabled && moduleSelection.soulbound.address) {
        result.soulbound_module_address = moduleSelection.soulbound.address;
      }
      if (moduleSelection.fraction?.enabled && moduleSelection.fraction.address) {
        result.fractionalization_module_address = moduleSelection.fraction.address;
      }
      if (moduleSelection.consecutive?.enabled && moduleSelection.consecutive.address) {
        result.consecutive_module_address = moduleSelection.consecutive.address;
      }
      if (moduleSelection.metadataEvents?.enabled && moduleSelection.metadataEvents.address) {
        result.metadata_events_module_address = moduleSelection.metadataEvents.address;
      }
      break;

    case 'erc1155':
      if (moduleSelection.royalty?.enabled && moduleSelection.royalty.address) {
        result.royalty_module_address = moduleSelection.royalty.address;
      }
      if (moduleSelection.supplyCap?.enabled && moduleSelection.supplyCap.address) {
        result.supply_cap_module_address = moduleSelection.supplyCap.address;
      }
      if (moduleSelection.uriManagement?.enabled && moduleSelection.uriManagement.address) {
        result.uri_management_module_address = moduleSelection.uriManagement.address;
      }
      break;

    case 'erc3525':
      if (moduleSelection.slotApprovable?.enabled && moduleSelection.slotApprovable.address) {
        result.slot_approvable_module_address = moduleSelection.slotApprovable.address;
      }
      if (moduleSelection.slotManager?.enabled && moduleSelection.slotManager.address) {
        result.slot_manager_module_address = moduleSelection.slotManager.address;
      }
      if (moduleSelection.valueExchange?.enabled && moduleSelection.valueExchange.address) {
        result.value_exchange_module_address = moduleSelection.valueExchange.address;
      }
      break;

    case 'erc4626':
      if (moduleSelection.feeStrategy?.enabled && moduleSelection.feeStrategy.address) {
        result.fee_strategy_module_address = moduleSelection.feeStrategy.address;
      }
      if (moduleSelection.withdrawalQueue?.enabled && moduleSelection.withdrawalQueue.address) {
        result.withdrawal_queue_module_address = moduleSelection.withdrawalQueue.address;
      }
      if (moduleSelection.yieldStrategy?.enabled && moduleSelection.yieldStrategy.address) {
        result.yield_strategy_module_address = moduleSelection.yieldStrategy.address;
      }
      if (moduleSelection.asyncVault?.enabled && moduleSelection.asyncVault.address) {
        result.async_vault_module_address = moduleSelection.asyncVault.address;
      }
      if (moduleSelection.nativeVault?.enabled && moduleSelection.nativeVault.address) {
        result.native_vault_module_address = moduleSelection.nativeVault.address;
      }
      if (moduleSelection.router?.enabled && moduleSelection.router.address) {
        result.router_module_address = moduleSelection.router.address;
      }
      if (moduleSelection.multiAssetVault?.enabled && moduleSelection.multiAssetVault.address) {
        result.multi_asset_vault_module_address = moduleSelection.multiAssetVault.address;
      }
      break;

    case 'erc1400':
      if (moduleSelection.controller?.enabled && moduleSelection.controller.address) {
        result.controller_module_address = moduleSelection.controller.address;
      }
      if (moduleSelection.transferRestrictions?.enabled && moduleSelection.transferRestrictions.address) {
        result.transfer_restrictions_module_address = moduleSelection.transferRestrictions.address;
      }
      if (moduleSelection.erc1400Document?.enabled && moduleSelection.erc1400Document.address) {
        result.erc1400_document_module_address = moduleSelection.erc1400Document.address;
      }
      break;
  }

  return result;
}

/**
 * Transform database module columns back to moduleSelection object
 * Used when loading existing token data for editing
 * @param databaseColumns The database row data
 * @param tokenStandard The token standard
 * @returns ModuleSelection object for the UI
 */
export function transformColumnsToModuleSelection(
  databaseColumns: Record<string, any>,
  tokenStandard: string
): ModuleSelection {
  const result: ModuleSelection = {};
  const lowerStandard = tokenStandard.toLowerCase();

  // Universal modules
  if (databaseColumns.compliance_module_address) {
    result.compliance = {
      enabled: true,
      address: databaseColumns.compliance_module_address
    };
  }
  if (databaseColumns.policy_engine_address) {
    result.policyEngine = {
      enabled: true,
      address: databaseColumns.policy_engine_address
    };
  }
  if (databaseColumns.document_module_address) {
    result.document = {
      enabled: true,
      address: databaseColumns.document_module_address
    };
  }
  if (databaseColumns.vesting_module_address) {
    result.vesting = {
      enabled: true,
      address: databaseColumns.vesting_module_address
    };
  }

  // Standard-specific modules
  switch (lowerStandard) {
    case 'erc20':
      if (databaseColumns.fees_module_address) {
        result.fees = { enabled: true, address: databaseColumns.fees_module_address };
      }
      if (databaseColumns.flash_mint_module_address) {
        result.flashMint = { enabled: true, address: databaseColumns.flash_mint_module_address };
      }
      if (databaseColumns.permit_module_address) {
        result.permit = { enabled: true, address: databaseColumns.permit_module_address };
      }
      if (databaseColumns.snapshot_module_address) {
        result.snapshot = { enabled: true, address: databaseColumns.snapshot_module_address };
      }
      if (databaseColumns.timelock_module_address) {
        result.timelock = { enabled: true, address: databaseColumns.timelock_module_address };
      }
      if (databaseColumns.votes_module_address) {
        result.votes = { enabled: true, address: databaseColumns.votes_module_address };
      }
      if (databaseColumns.payable_token_module_address) {
        result.payableToken = { enabled: true, address: databaseColumns.payable_token_module_address };
      }
      if (databaseColumns.temporary_approval_module_address) {
        result.temporaryApproval = { enabled: true, address: databaseColumns.temporary_approval_module_address };
      }
      break;

    case 'erc721':
      if (databaseColumns.royalty_module_address) {
        result.royalty = { enabled: true, address: databaseColumns.royalty_module_address };
      }
      if (databaseColumns.rental_module_address) {
        result.rental = { enabled: true, address: databaseColumns.rental_module_address };
      }
      if (databaseColumns.soulbound_module_address) {
        result.soulbound = { enabled: true, address: databaseColumns.soulbound_module_address };
      }
      if (databaseColumns.fractionalization_module_address) {
        result.fraction = { enabled: true, address: databaseColumns.fractionalization_module_address };
      }
      if (databaseColumns.consecutive_module_address) {
        result.consecutive = { enabled: true, address: databaseColumns.consecutive_module_address };
      }
      if (databaseColumns.metadata_events_module_address) {
        result.metadataEvents = { enabled: true, address: databaseColumns.metadata_events_module_address };
      }
      break;

    case 'erc1155':
      if (databaseColumns.royalty_module_address) {
        result.royalty = { enabled: true, address: databaseColumns.royalty_module_address };
      }
      if (databaseColumns.supply_cap_module_address) {
        result.supplyCap = { enabled: true, address: databaseColumns.supply_cap_module_address };
      }
      if (databaseColumns.uri_management_module_address) {
        result.uriManagement = { enabled: true, address: databaseColumns.uri_management_module_address };
      }
      break;

    case 'erc3525':
      if (databaseColumns.slot_approvable_module_address) {
        result.slotApprovable = { enabled: true, address: databaseColumns.slot_approvable_module_address };
      }
      if (databaseColumns.slot_manager_module_address) {
        result.slotManager = { enabled: true, address: databaseColumns.slot_manager_module_address };
      }
      if (databaseColumns.value_exchange_module_address) {
        result.valueExchange = { enabled: true, address: databaseColumns.value_exchange_module_address };
      }
      break;

    case 'erc4626':
      if (databaseColumns.fee_strategy_module_address) {
        result.feeStrategy = { enabled: true, address: databaseColumns.fee_strategy_module_address };
      }
      if (databaseColumns.withdrawal_queue_module_address) {
        result.withdrawalQueue = { enabled: true, address: databaseColumns.withdrawal_queue_module_address };
      }
      if (databaseColumns.yield_strategy_module_address) {
        result.yieldStrategy = { enabled: true, address: databaseColumns.yield_strategy_module_address };
      }
      if (databaseColumns.async_vault_module_address) {
        result.asyncVault = { enabled: true, address: databaseColumns.async_vault_module_address };
      }
      if (databaseColumns.native_vault_module_address) {
        result.nativeVault = { enabled: true, address: databaseColumns.native_vault_module_address };
      }
      if (databaseColumns.router_module_address) {
        result.router = { enabled: true, address: databaseColumns.router_module_address };
      }
      if (databaseColumns.multi_asset_vault_module_address) {
        result.multiAssetVault = { enabled: true, address: databaseColumns.multi_asset_vault_module_address };
      }
      break;

    case 'erc1400':
      if (databaseColumns.controller_module_address) {
        result.controller = { enabled: true, address: databaseColumns.controller_module_address };
      }
      if (databaseColumns.transfer_restrictions_module_address) {
        result.transferRestrictions = { enabled: true, address: databaseColumns.transfer_restrictions_module_address };
      }
      if (databaseColumns.erc1400_document_module_address) {
        result.erc1400Document = { enabled: true, address: databaseColumns.erc1400_document_module_address };
      }
      break;
  }

  return result;
}
