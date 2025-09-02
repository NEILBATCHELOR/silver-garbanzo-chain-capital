# ERC-1155 Complete Database Coverage Test

## Test JSON with All Auxiliary Tables
```json
{
  "name": "Complete Gaming Token Collection",
  "symbol": "CGTC",
  "decimals": 0,
  "description": "Complete ERC-1155 multi-token with all auxiliary table features",
  "standard": "ERC-1155",
  "config_mode": "max",
  "base_uri": "https://api.gaming.com/metadata/",
  "metadata_storage": "ipfs",
  "has_royalty": true,
  "royalty_percentage": "5.0",
  "royalty_receiver": "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
  "is_burnable": true,
  "is_pausable": true,
  "access_control": "role-based",
  "supply_tracking": true,
  "batch_minting_enabled": true,
  "container_enabled": false,
  "tokenTypes": [
    {
      "id": "1",
      "name": "Legendary Sword",
      "description": "A powerful legendary weapon",
      "maxSupply": "100",
      "isTransferable": true,
      "isTradeable": true,
      "fungible": false
    },
    {
      "id": "2", 
      "name": "Magic Potion",
      "description": "Restores health and mana",
      "maxSupply": "10000",
      "isTransferable": true,
      "isTradeable": true,
      "fungible": true
    },
    {
      "id": "3",
      "name": "Gold Coin",
      "description": "In-game currency",
      "maxSupply": "1000000",
      "isTransferable": true,
      "isTradeable": true,
      "fungible": true
    }
  ],
  "craftingRecipes": [
    {
      "name": "Craft Magic Potion",
      "inputs": [
        { "tokenTypeId": "herb", "amount": 3 },
        { "tokenTypeId": "water", "amount": 1 }
      ],
      "outputTokenTypeId": "2",
      "outputQuantity": 1,
      "successRate": 90,
      "cooldown": 300,
      "requiredLevel": 5,
      "isEnabled": true
    },
    {
      "name": "Forge Legendary Sword",
      "inputs": [
        { "tokenTypeId": "steel", "amount": 5 },
        { "tokenTypeId": "magic_crystal", "amount": 2 }
      ],
      "outputTokenTypeId": "1", 
      "outputQuantity": 1,
      "successRate": 25,
      "cooldown": 3600,
      "requiredLevel": 50,
      "isEnabled": true
    }
  ],
  "discountTiers": [
    {
      "tier": "Bronze",
      "minimumQuantity": 10,
      "maximumQuantity": 49,
      "discountPercentage": "5",
      "description": "5% discount for bronze tier"
    },
    {
      "tier": "Silver",
      "minimumQuantity": 50,
      "maximumQuantity": 99,
      "discountPercentage": "10", 
      "description": "10% discount for silver tier"
    },
    {
      "tier": "Gold",
      "minimumQuantity": 100,
      "discountPercentage": "15",
      "description": "15% discount for gold tier"
    }
  ],
  "uriMappings": [
    {
      "tokenTypeId": "1",
      "uri": "https://api.gaming.com/metadata/legendary-sword.json"
    },
    {
      "tokenTypeId": "2",
      "uri": "https://api.gaming.com/metadata/magic-potion.json" 
    },
    {
      "tokenTypeId": "3",
      "uri": "https://api.gaming.com/metadata/gold-coin.json"
    }
  ],
  "typeConfigs": [
    {
      "tokenTypeId": "1",
      "supplyCap": "100",
      "mintPrice": "0.5",
      "isTradeable": true,
      "isTransferable": true,
      "utilityType": "weapon",
      "rarityTier": "legendary", 
      "experienceValue": 500,
      "craftingMaterials": { "steel": 5, "magic_crystal": 2 },
      "burnRewards": { "steel": 2, "experience": 100 }
    },
    {
      "tokenTypeId": "2",
      "supplyCap": "10000",
      "mintPrice": "0.01",
      "isTradeable": true,
      "isTransferable": true,
      "utilityType": "consumable",
      "rarityTier": "common",
      "experienceValue": 10,
      "craftingMaterials": { "herb": 3, "water": 1 },
      "burnRewards": { "herb": 1, "experience": 2 }
    },
    {
      "tokenTypeId": "3",
      "supplyCap": "1000000",
      "mintPrice": "0.001",
      "isTradeable": true,
      "isTransferable": true,
      "utilityType": "currency",
      "rarityTier": "common",
      "experienceValue": 1,
      "craftingMaterials": {},
      "burnRewards": { "experience": 1 }
    }
  ],
  "balances": [
    {
      "tokenTypeId": "1",
      "address": "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
      "amount": "5"
    },
    {
      "tokenTypeId": "2",
      "address": "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D", 
      "amount": "100"
    },
    {
      "tokenTypeId": "3",
      "address": "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
      "amount": "10000"
    }
  ]
}
```

## Expected Database Records

### ✅ token_erc1155_properties (1 record)
Main properties with all 69 fields populated according to the JSON data.

### ✅ token_erc1155_types (3 records)
- Legendary Sword (id: 1, fungibility_type: non-fungible)
- Magic Potion (id: 2, fungibility_type: fungible)  
- Gold Coin (id: 3, fungibility_type: fungible)

### ✅ token_erc1155_crafting_recipes (2 records)
- Craft Magic Potion (recipe_name, input_tokens, output_token_type_id, etc.)
- Forge Legendary Sword (with higher difficulty and longer cooldown)

### ✅ token_erc1155_discount_tiers (3 records)
- Bronze: 10-49 quantity, 5% discount
- Silver: 50-99 quantity, 10% discount
- Gold: 100+ quantity, 15% discount

### ✅ token_erc1155_uri_mappings (3 records)
- Maps each token type to its specific metadata URI

### ✅ token_erc1155_type_configs (3 records)
- Individual configuration for each token type
- Supply caps, mint prices, utility types, rarity tiers
- Crafting materials and burn rewards

### ✅ token_erc1155_balances (3 records)
- Initial balance allocations for the test address
- Different amounts for each token type

## Test Steps

1. **Open TokenTestUtility**
2. **Set standard to ERC-1155**
3. **Paste the complete JSON above**
4. **Click Execute**
5. **Verify Success**: Token creation should succeed
6. **Check Database**: All 7 tables should have records

## Verification Queries

```sql
-- Check main token
SELECT id, name, symbol, standard FROM tokens WHERE name = 'Complete Gaming Token Collection';

-- Check properties
SELECT * FROM token_erc1155_properties WHERE token_id = '[TOKEN_ID]';

-- Check all auxiliary tables
SELECT COUNT(*) as types_count FROM token_erc1155_types WHERE token_id = '[TOKEN_ID]';
SELECT COUNT(*) as recipes_count FROM token_erc1155_crafting_recipes WHERE token_id = '[TOKEN_ID]';
SELECT COUNT(*) as tiers_count FROM token_erc1155_discount_tiers WHERE token_id = '[TOKEN_ID]';
SELECT COUNT(*) as mappings_count FROM token_erc1155_uri_mappings WHERE token_id = '[TOKEN_ID]';
SELECT COUNT(*) as configs_count FROM token_erc1155_type_configs WHERE token_id = '[TOKEN_ID]';
SELECT COUNT(*) as balances_count FROM token_erc1155_balances WHERE token_id = '[TOKEN_ID]';
```

## Expected Results
- ✅ **Token Creation**: Succeeds without validation errors
- ✅ **Properties**: 1 record in token_erc1155_properties
- ✅ **Types**: 3 records in token_erc1155_types
- ✅ **Recipes**: 2 records in token_erc1155_crafting_recipes
- ✅ **Tiers**: 3 records in token_erc1155_discount_tiers
- ✅ **Mappings**: 3 records in token_erc1155_uri_mappings
- ✅ **Configs**: 3 records in token_erc1155_type_configs
- ✅ **Balances**: 3 records in token_erc1155_balances

## Success Criteria
✅ All 7 ERC-1155 tables have data  
✅ No validation errors during creation  
✅ Proper field mapping to database schema  
✅ Complete CRUD operations functional  
✅ Array data properly extracted and stored
