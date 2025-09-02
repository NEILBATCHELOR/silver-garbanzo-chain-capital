/**
 * Enhanced Token Database Handlers - August 22, 2025
 * 
 * Enhanced handlers with bulletproof duplicate prevention using database constraints.
 * These handlers replace the existing ones in tokenService.ts to eliminate duplicates.
 */

import { supabase } from '@/infrastructure/database/client';

/**
 * Enhanced ERC-1400 Partitions Handler with bulletproof duplicate prevention
 */
async function handleERC1400PartitionsEnhanced(
  tokenId: string, 
  blocks: Record<string, any>, 
  results: Record<string, any>
) {
  const partitions = blocks.partitions;
  
  if (partitions && Array.isArray(partitions) && partitions.length > 0) {
    results.arrayData.partitions = { status: 'pending', count: partitions.length };
    
    try {
      const partitionRecords = partitions.map((partition, index) => {
        const { name, partitionId, transferable, amount, ...rest } = partition;
        const finalPartitionId = partitionId || `PARTITION-${index + 1}`;
        
        return {
          token_id: tokenId,
          name: name,
          partition_id: finalPartitionId,
          amount: amount || '',
          transferable: transferable ?? true,
          metadata: Object.keys(rest).length > 0 ? rest : null
        };
      });
      
      console.log('[Enhanced] Inserting token_erc1400_partitions with UPSERT:', partitionRecords);
      
      // Use UPSERT with ON CONFLICT to handle duplicates gracefully
      const { data: partitionsData, error: partitionsError } = await supabase
        .from('token_erc1400_partitions')
        .upsert(partitionRecords, { 
          onConflict: 'token_id,partition_id',
          ignoreDuplicates: false  // Update existing records
        })
        .select();
      
      if (partitionsError) {
        console.error('[Enhanced] Failed to upsert token_erc1400_partitions:', partitionsError);
        results.arrayData.partitions = { 
          status: 'failed', 
          error: partitionsError.message,
          attempted: partitionRecords.length
        };
      } else {
        console.log('[Enhanced] Successfully upserted token_erc1400_partitions:', partitionsData?.length || 0);
        results.arrayData.partitions = { 
          status: 'success', 
          count: partitionsData?.length || 0,
          data: partitionsData 
        };
      }
    } catch (partitionError: any) {
      console.error('[Enhanced] Error processing partitions:', partitionError);
      results.arrayData.partitions = { 
        status: 'failed', 
        error: partitionError.message 
      };
    }
  }
}

/**
 * Enhanced ERC-1400 Controllers Handler with bulletproof duplicate prevention
 */
async function handleERC1400ControllersEnhanced(
  tokenId: string, 
  blocks: Record<string, any>, 
  results: Record<string, any>
) {
  const controllers = blocks.controllers || blocks.standardArrays?.controllers;
  
  if (controllers && Array.isArray(controllers) && controllers.length > 0) {
    results.arrayData.controllers = { status: 'pending', count: controllers.length };
    
    try {
      const controllerRecords = controllers
        .map(controller => {
          let address;
          let permissions;
          
          if (typeof controller === 'string') {
            address = controller;
            permissions = ['ADMIN'];
          } else {
            address = controller.address || controller.controllerAddress || '0x0000000000000000000000000000000000000000';
            permissions = Array.isArray(controller.permissions) 
              ? controller.permissions 
              : (controller.role ? [controller.role] : ['ADMIN']);
          }
          
          return {
            token_id: tokenId,
            address,
            permissions
          };
        })
        .filter(record => record.address && record.address.trim() !== ''); // Filter out empty addresses
      
      if (controllerRecords.length === 0) {
        console.log('[Enhanced] No valid controllers to insert (all addresses empty)');
        results.arrayData.controllers = { 
          status: 'success', 
          count: 0,
          message: 'No valid controllers provided'
        };
        return;
      }
      
      console.log('[Enhanced] Inserting token_erc1400_controllers with UPSERT:', controllerRecords);
      
      // Use UPSERT with ON CONFLICT to handle duplicates gracefully
      const { data: controllersData, error: controllersError } = await supabase
        .from('token_erc1400_controllers')
        .upsert(controllerRecords, { 
          onConflict: 'token_id,address',
          ignoreDuplicates: false  // Update existing records
        })
        .select();
      
      if (controllersError) {
        console.error('[Enhanced] Failed to upsert token_erc1400_controllers:', controllersError);
        results.arrayData.controllers = { 
          status: 'failed', 
          error: controllersError.message,
          attempted: controllerRecords.length
        };
      } else {
        console.log('[Enhanced] Successfully upserted token_erc1400_controllers:', controllersData?.length || 0);
        results.arrayData.controllers = { 
          status: 'success', 
          count: controllersData?.length || 0,
          data: controllersData
        };
      }
    } catch (controllerError: any) {
      console.error('[Enhanced] Error processing controllers:', controllerError);
      results.arrayData.controllers = { 
        status: 'failed', 
        error: controllerError.message 
      };
    }
  }
}

/**
 * Enhanced ERC-3525 Slots Handler with bulletproof duplicate prevention
 */
async function handleERC3525SlotsEnhanced(
  tokenId: string, 
  blocks: Record<string, any>, 
  results: Record<string, any>
) {
  const slots = blocks.slots;
  
  if (slots && Array.isArray(slots) && slots.length > 0) {
    results.arrayData.slots = { status: 'pending', count: slots.length };
    
    try {
      const slotRecords = slots.map((slot, index) => {
        console.log(`[Enhanced] Processing ERC3525 slot ${index}:`, JSON.stringify(slot, null, 2));
        
        // Handle various slot_id field names and ensure it's never null/undefined
        let slotId = slot.slotId || slot.slot_id || slot.id || slot.slot;
        
        // Always ensure slot_id exists
        if (!slotId || slotId === null || slotId === undefined || slotId === '') {
          slotId = `slot-${index + 1}`;
          console.warn(`[Enhanced] Generated slot_id for slot ${index}:`, slotId);
        }
        
        // Ensure it's a string and not empty
        slotId = String(slotId).trim();
        
        // Extra safeguard
        if (!slotId || slotId === '' || slotId === 'null' || slotId === 'undefined') {
          slotId = `emergency-slot-${Date.now()}-${index}`;
          console.error(`[Enhanced] Emergency slot_id for slot ${index}:`, slotId);
        }
        
        // Extract other fields
        const { slotId: _slotId, slot_id: _slot_id, id: _id, slot: _slot, name, slotName, description, slotDescription, valueUnits, transferable, ...rest } = slot;
        
        const record = {
          token_id: tokenId,
          slot_id: slotId,
          name: name || slotName || `Slot ${index + 1}`,
          description: description || slotDescription || '',
          value_units: valueUnits || slot.value_units || 'units',
          slot_transferable: transferable ?? slot.slot_transferable ?? true,
          metadata: Object.keys(rest).length > 0 ? {
            ...rest,
            properties: slot.properties || {}
          } : null
        };
        
        console.log(`[Enhanced] Final ERC3525 slot record ${index}:`, JSON.stringify(record, null, 2));
        return record;
      });
      
      console.log('[Enhanced] Inserting token_erc3525_slots with UPSERT:', slotRecords);
      
      // Use UPSERT with ON CONFLICT to handle duplicates gracefully
      const { data: slotsData, error: slotsError } = await supabase
        .from('token_erc3525_slots')
        .upsert(slotRecords, { 
          onConflict: 'token_id,slot_id',
          ignoreDuplicates: false  // Update existing records
        })
        .select();
      
      if (slotsError) {
        console.error('[Enhanced] Failed to upsert token_erc3525_slots:', slotsError);
        results.arrayData.slots = { 
          status: 'failed', 
          error: slotsError.message,
          attempted: slotRecords.length
        };
      } else {
        console.log('[Enhanced] Successfully upserted token_erc3525_slots:', slotsData?.length || 0);
        results.arrayData.slots = { 
          status: 'success', 
          count: slotsData?.length || 0,
          data: slotsData 
        };
      }
    } catch (slotError: any) {
      console.error('[Enhanced] Error processing slots:', slotError);
      results.arrayData.slots = { 
        status: 'failed', 
        error: slotError.message 
      };
    }
  }
}

/**
 * Enhanced ERC-1155 Token Types Handler with bulletproof duplicate prevention
 */
async function handleERC1155TokenTypesEnhanced(
  tokenId: string, 
  blocks: Record<string, any>, 
  results: Record<string, any>
) {
  const tokenTypes = blocks.tokenTypes || blocks.token_types;
  
  if (tokenTypes && Array.isArray(tokenTypes) && tokenTypes.length > 0) {
    results.arrayData.tokenTypes = { status: 'pending', count: tokenTypes.length };
    
    try {
      const typeRecords = tokenTypes.map((type, index) => ({
        token_id: tokenId,
        token_type_id: type.id || `${index + 1}`,
        name: type.name || `Token Type ${index + 1}`,
        description: type.description || '',
        max_supply: type.supply || type.maxSupply,
        fungibility_type: type.fungible !== undefined 
          ? (type.fungible ? 'fungible' : 'non-fungible')
          : 'non-fungible',
        metadata: {
          rarityLevel: type.rarityLevel || 'common',
          originalFungibleFlag: type.fungible
        }
      }));
      
      console.log('[Enhanced] Inserting token_erc1155_types with UPSERT:', typeRecords);
      
      // Use UPSERT with ON CONFLICT to handle duplicates gracefully
      const { data: typesData, error: typesError } = await supabase
        .from('token_erc1155_types')
        .upsert(typeRecords, { 
          onConflict: 'token_id,token_type_id',
          ignoreDuplicates: false  // Update existing records
        })
        .select();
      
      if (typesError) {
        console.error('[Enhanced] Failed to upsert token_erc1155_types:', typesError);
        results.arrayData.tokenTypes = { 
          status: 'failed', 
          error: typesError.message,
          attempted: typeRecords.length
        };
      } else {
        console.log('[Enhanced] Successfully upserted token_erc1155_types:', typesData?.length || 0);
        results.arrayData.tokenTypes = { 
          status: 'success', 
          count: typesData?.length || 0,
          data: typesData 
        };
      }
    } catch (typeError: any) {
      console.error('[Enhanced] Error processing token types:', typeError);
      results.arrayData.tokenTypes = { 
        status: 'failed', 
        error: typeError.message 
      };
    }
  }
}

/**
 * Enhanced ERC-721 Attributes Handler with bulletproof duplicate prevention
 */
async function handleERC721AttributesEnhanced(
  tokenId: string, 
  blocks: Record<string, any>, 
  results: Record<string, any>
) {
  const tokenAttributes = blocks.tokenAttributes || blocks.token_attributes;
  
  if (tokenAttributes && Array.isArray(tokenAttributes) && tokenAttributes.length > 0) {
    results.arrayData.tokenAttributes = { status: 'pending', count: tokenAttributes.length };
    
    try {
      const attributeRecords = tokenAttributes.map(attr => ({
        token_id: tokenId,
        trait_type: attr.name || attr.trait_type || 'unknown',
        values: Array.isArray(attr.values) ? attr.values : [attr.value || 'unknown']
      }));
      
      console.log('[Enhanced] Inserting token_erc721_attributes with UPSERT:', attributeRecords);
      
      // Use UPSERT with ON CONFLICT to handle duplicates gracefully
      const { data: attributesData, error: attributesError } = await supabase
        .from('token_erc721_attributes')
        .upsert(attributeRecords, { 
          onConflict: 'token_id,trait_type',
          ignoreDuplicates: false  // Update existing records
        })
        .select();
      
      if (attributesError) {
        console.error('[Enhanced] Failed to upsert token_erc721_attributes:', attributesError);
        results.arrayData.tokenAttributes = { 
          status: 'failed', 
          error: attributesError.message,
          attempted: attributeRecords.length
        };
      } else {
        console.log('[Enhanced] Successfully upserted token_erc721_attributes:', attributesData?.length || 0);
        results.arrayData.tokenAttributes = { 
          status: 'success', 
          count: attributesData?.length || 0,
          data: attributesData
        };
      }
    } catch (attrError: any) {
      console.error('[Enhanced] Error processing token attributes:', attrError);
      results.arrayData.tokenAttributes = { 
        status: 'failed', 
        error: attrError.message 
      };
    }
  }
}

/**
 * Enhanced ERC-3525 Allocations Handler with bulletproof duplicate prevention
 */
async function handleERC3525AllocationsEnhanced(
  tokenId: string, 
  blocks: Record<string, any>, 
  results: Record<string, any>
) {
  const allocations = blocks.allocations;
  
  if (allocations && Array.isArray(allocations) && allocations.length > 0) {
    results.arrayData.allocations = { status: 'pending', count: allocations.length };
    
    try {
      const allocationRecords = allocations.map((allocation: any, index: number) => {
        let slotId = allocation.slotId || allocation.slot_id || allocation.slot;
        let tokenIdWithinSlot = allocation.tokenIdWithinSlot || allocation.token_id_within_slot || allocation.tokenId || allocation.id;
        
        // Ensure slot_id is not null/undefined
        if (!slotId || slotId === null || slotId === undefined || slotId === '') {
          slotId = `slot-${index + 1}`;
          console.warn(`[Enhanced] Generated slot_id for allocation ${index}:`, slotId);
        }
        
        // Ensure token_id_within_slot is not null/undefined
        if (!tokenIdWithinSlot || tokenIdWithinSlot === null || tokenIdWithinSlot === undefined || tokenIdWithinSlot === '') {
          tokenIdWithinSlot = `token-${index + 1}`;
          console.warn(`[Enhanced] Generated token_id_within_slot for allocation ${index}:`, tokenIdWithinSlot);
        }
        
        return {
          token_id: tokenId,
          slot_id: String(slotId).trim(),
          token_id_within_slot: String(tokenIdWithinSlot).trim(),
          value: allocation.value || allocation.valueAmount || '0',
          recipient: allocation.recipient || allocation.holderAddress || allocation.holder_address,
          linked_token_id: allocation.linkedTokenId || allocation.linked_token_id || null
        };
      });
      
      console.log('[Enhanced] Inserting token_erc3525_allocations with UPSERT:', allocationRecords);
      
      // Use UPSERT with ON CONFLICT to handle duplicates gracefully
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('token_erc3525_allocations')
        .upsert(allocationRecords, { 
          onConflict: 'token_id,slot_id,token_id_within_slot',
          ignoreDuplicates: false  // Update existing records
        })
        .select();
      
      if (allocationsError) {
        console.error('[Enhanced] Failed to upsert token_erc3525_allocations:', allocationsError);
        results.arrayData.allocations = {
          status: 'failed',
          error: allocationsError.message,
          attempted: allocationRecords.length
        };
      } else {
        console.log('[Enhanced] Successfully upserted token_erc3525_allocations:', allocationsData?.length || 0);
        results.arrayData.allocations = {
          status: 'success',
          count: allocationsData?.length || 0,
          data: allocationsData
        };
      }
    } catch (allocationError: any) {
      console.error('[Enhanced] Error processing allocations:', allocationError);
      results.arrayData.allocations = {
        status: 'failed',
        error: allocationError.message
      };
    }
  }
}

export {
  handleERC1400PartitionsEnhanced,
  handleERC1400ControllersEnhanced,
  handleERC3525SlotsEnhanced,
  handleERC1155TokenTypesEnhanced,
  handleERC721AttributesEnhanced,
  handleERC3525AllocationsEnhanced
};
