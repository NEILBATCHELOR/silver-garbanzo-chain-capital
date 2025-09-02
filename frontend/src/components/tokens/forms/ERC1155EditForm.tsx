import React from 'react';
import BaseTokenEditForm from './BaseTokenEditForm';
import { FieldRenderer, RelatedTableRenderer } from './FieldRenderer';
import { EditFormProps, TabConfig, FieldConfig } from './types';

// ERC-1155 Tab Configurations
const ERC1155_TABS: TabConfig[] = [
  {
    id: 'basic',
    label: 'Basic Properties',
    table: 'tokens',
    description: 'Core token information and basic settings',
    isRelational: false,
    fields: ['name', 'symbol', 'description', 'standard', 'status']
  },
  {
    id: 'properties',
    label: 'ERC-1155 Properties',
    table: 'token_erc1155_properties',
    description: 'ERC-1155 specific properties and configurations',
    isRelational: false,
    fields: [
      'uri', 'contractUri', 'isMintable', 'isBurnable', 'isPausable',
      'isTransferable', 'royaltyPercentage', 'royaltyReceiver', 'maxSupply',
      'batchMinting', 'dynamicUris', 'metadataStorage', 'containerEnabled'
    ]
  },
  {
    id: 'types',
    label: 'Token Types',
    table: 'token_erc1155_types',
    description: 'Define different types of tokens within the collection',
    isRelational: true,
    fields: ['tokenTypeId', 'name', 'description', 'maxSupply', 'uri', 'attributes']
  },
  {
    id: 'balances',
    label: 'Balance Tracking',
    table: 'token_erc1155_balances',
    description: 'Track token balances for different addresses and types',
    isRelational: true,
    fields: ['address', 'tokenTypeId', 'balance', 'lastUpdated']
  },
  {
    id: 'crafting',
    label: 'Crafting Recipes',
    table: 'token_erc1155_crafting_recipes',
    description: 'Gaming mechanics for combining tokens',
    isRelational: true,
    fields: ['recipeId', 'name', 'description', 'inputTokens', 'outputTokens', 'isActive']
  },
  {
    id: 'pricing',
    label: 'Discount Tiers',
    table: 'token_erc1155_discount_tiers',
    description: 'Pricing tiers and discount configurations',
    isRelational: true,
    fields: ['tierId', 'name', 'description', 'discountPercentage', 'minQuantity', 'maxQuantity']
  },
  {
    id: 'uris',
    label: 'URI Mappings',
    table: 'token_erc1155_uri_mappings',
    description: 'Metadata URI mappings for different token types',
    isRelational: true,
    fields: ['tokenTypeId', 'uri', 'metadataHash', 'isActive']
  },
  {
    id: 'configs',
    label: 'Type Configurations',
    table: 'token_erc1155_type_configs',
    description: 'Advanced configurations for each token type',
    isRelational: true,
    fields: ['tokenTypeId', 'config', 'isLocked', 'createdAt', 'updatedAt']
  }
];

// Basic Properties Fields
const BASIC_FIELDS: FieldConfig[] = [
  {
    name: 'name',
    type: 'text',
    label: 'Collection Name',
    description: 'The name of the ERC-1155 token collection',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'symbol',
    type: 'text',
    label: 'Collection Symbol',
    description: 'The symbol for the token collection',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    description: 'Detailed description of the token collection',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'status',
    type: 'select',
    label: 'Status',
    description: 'Current status of the token collection',
    showInBasic: false,
    showInAdvanced: true,
    options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'UNDER REVIEW', label: 'Under Review' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'DEPLOYED', label: 'Deployed' }
    ]
  }
];

// ERC-1155 Properties Fields
const PROPERTIES_FIELDS: FieldConfig[] = [
  {
    name: 'uri',
    type: 'text',
    label: 'Base URI',
    description: 'Base URI for token metadata',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'contractUri',
    type: 'text',
    label: 'Contract URI',
    description: 'URI for contract-level metadata',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'isMintable',
    type: 'boolean',
    label: 'Mintable',
    description: 'Allow minting new tokens',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isBurnable',
    type: 'boolean',
    label: 'Burnable',
    description: 'Allow burning tokens',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isPausable',
    type: 'boolean',
    label: 'Pausable',
    description: 'Allow pausing token transfers',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isTransferable',
    type: 'boolean',
    label: 'Transferable',
    description: 'Allow token transfers between addresses',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'royaltyPercentage',
    type: 'number',
    label: 'Royalty Percentage',
    description: 'Royalty percentage for secondary sales',
    showInBasic: false,
    showInAdvanced: true,
    validation: { min: 0, max: 100 }
  },
  {
    name: 'royaltyReceiver',
    type: 'text',
    label: 'Royalty Receiver',
    description: 'Address to receive royalty payments',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'maxSupply',
    type: 'text',
    label: 'Maximum Supply',
    description: 'Maximum total supply for all token types',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'batchMinting',
    type: 'boolean',
    label: 'Batch Minting',
    description: 'Enable batch minting operations',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'dynamicUris',
    type: 'boolean',
    label: 'Dynamic URIs',
    description: 'Enable dynamic URI updates',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'metadataStorage',
    type: 'select',
    label: 'Metadata Storage',
    description: 'Storage method for token metadata',
    showInBasic: false,
    showInAdvanced: true,
    options: [
      { value: 'ipfs', label: 'IPFS' },
      { value: 'arweave', label: 'Arweave' },
      { value: 'centralized', label: 'Centralized' },
      { value: 'on_chain', label: 'On-chain' }
    ]
  },
  {
    name: 'containerEnabled',
    type: 'boolean',
    label: 'Container Support',
    description: 'Enable container/bundle functionality',
    showInBasic: false,
    showInAdvanced: true
  }
];

// Token Types Fields
const TOKEN_TYPES_FIELDS: FieldConfig[] = [
  {
    name: 'tokenTypeId',
    type: 'number',
    label: 'Token Type ID',
    description: 'Unique identifier for this token type',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'name',
    type: 'text',
    label: 'Type Name',
    description: 'Name of the token type',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Type Description',
    description: 'Description of this token type',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'maxSupply',
    type: 'text',
    label: 'Max Supply',
    description: 'Maximum supply for this token type',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'uri',
    type: 'text',
    label: 'Token URI',
    description: 'Specific URI for this token type',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'attributes',
    type: 'json',
    label: 'Attributes',
    description: 'Token type attributes as JSON',
    showInBasic: false,
    showInAdvanced: true
  }
];

// Balance Tracking Fields
const BALANCE_FIELDS: FieldConfig[] = [
  {
    name: 'address',
    type: 'text',
    label: 'Address',
    description: 'Wallet address holding tokens',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'tokenTypeId',
    type: 'number',
    label: 'Token Type ID',
    description: 'ID of the token type',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'balance',
    type: 'text',
    label: 'Balance',
    description: 'Current token balance',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'lastUpdated',
    type: 'text',
    label: 'Last Updated',
    description: 'Timestamp of last balance update',
    showInBasic: false,
    showInAdvanced: true
  }
];

// Crafting Recipe Fields
const CRAFTING_FIELDS: FieldConfig[] = [
  {
    name: 'recipeId',
    type: 'text',
    label: 'Recipe ID',
    description: 'Unique identifier for this recipe',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'name',
    type: 'text',
    label: 'Recipe Name',
    description: 'Name of the crafting recipe',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    description: 'Description of what this recipe creates',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'inputTokens',
    type: 'json',
    label: 'Input Tokens',
    description: 'Required tokens for crafting (JSON format)',
    required: true,
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'outputTokens',
    type: 'json',
    label: 'Output Tokens',
    description: 'Tokens created by this recipe (JSON format)',
    required: true,
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'isActive',
    type: 'boolean',
    label: 'Active',
    description: 'Whether this recipe is currently active',
    showInBasic: true,
    showInAdvanced: true
  }
];

// Discount Tier Fields
const DISCOUNT_FIELDS: FieldConfig[] = [
  {
    name: 'tierId',
    type: 'text',
    label: 'Tier ID',
    description: 'Unique identifier for this tier',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'name',
    type: 'text',
    label: 'Tier Name',
    description: 'Name of the discount tier',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    description: 'Description of this discount tier',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'discountPercentage',
    type: 'number',
    label: 'Discount %',
    description: 'Discount percentage for this tier',
    required: true,
    showInBasic: true,
    showInAdvanced: true,
    validation: { min: 0, max: 100 }
  },
  {
    name: 'minQuantity',
    type: 'number',
    label: 'Min Quantity',
    description: 'Minimum quantity required for this tier',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'maxQuantity',
    type: 'number',
    label: 'Max Quantity',
    description: 'Maximum quantity for this tier',
    showInBasic: false,
    showInAdvanced: true
  }
];

// URI Mapping Fields
const URI_MAPPING_FIELDS: FieldConfig[] = [
  {
    name: 'tokenTypeId',
    type: 'number',
    label: 'Token Type ID',
    description: 'ID of the token type',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'uri',
    type: 'text',
    label: 'URI',
    description: 'Metadata URI for this token type',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'metadataHash',
    type: 'text',
    label: 'Metadata Hash',
    description: 'Hash of the metadata for verification',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'isActive',
    type: 'boolean',
    label: 'Active',
    description: 'Whether this URI mapping is active',
    showInBasic: true,
    showInAdvanced: true
  }
];

// Type Configuration Fields
const TYPE_CONFIG_FIELDS: FieldConfig[] = [
  {
    name: 'tokenTypeId',
    type: 'number',
    label: 'Token Type ID',
    description: 'ID of the token type',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'config',
    type: 'json',
    label: 'Configuration',
    description: 'Advanced configuration for this token type',
    required: true,
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'isLocked',
    type: 'boolean',
    label: 'Locked',
    description: 'Whether this configuration is locked',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'createdAt',
    type: 'text',
    label: 'Created At',
    description: 'Timestamp when configuration was created',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'updatedAt',
    type: 'text',
    label: 'Updated At',
    description: 'Timestamp when configuration was last updated',
    showInBasic: false,
    showInAdvanced: true
  }
];

interface TabContentProps {
  activeTab: string;
  tabConfig: TabConfig;
  mode: 'basic' | 'advanced';
  tokenData: any;
  propertiesData: any;
  relatedData: any[];
  onUpdateToken: (field: string, value: any) => void;
  onUpdateProperties: (field: string, value: any) => void;
  onUpdateRelated: (table: string, data: any[]) => void;
  onAddRelated: (table: string, record: any) => void;
  onUpdateRelatedRecord: (table: string, index: number, record: any) => void;
  onDeleteRelatedRecord: (table: string, index: number) => void;
  errors: string[];
}

const ERC1155TabContent: React.FC<Partial<TabContentProps>> = ({
  activeTab,
  tabConfig,
  mode,
  tokenData,
  propertiesData,
  relatedData,
  onUpdateToken,
  onUpdateProperties,
  onAddRelated,
  onUpdateRelatedRecord,
  onDeleteRelatedRecord,
  errors
}) => {
  const renderBasicTab = () => (
    <div className="grid gap-6 md:grid-cols-2">
      {BASIC_FIELDS.map((field) => (
        <FieldRenderer
          key={field.name}
          config={field}
          value={tokenData[field.name]}
          onChange={(value) => onUpdateToken(field.name, value)}
          error={errors.filter(e => e.includes(field.name))}
          mode={mode}
        />
      ))}
    </div>
  );

  const renderPropertiesTab = () => (
    <div className="grid gap-6 md:grid-cols-2">
      {PROPERTIES_FIELDS.map((field) => (
        <FieldRenderer
          key={field.name}
          config={field}
          value={propertiesData[field.name]}
          onChange={(value) => onUpdateProperties(field.name, value)}
          error={errors.filter(e => e.includes(field.name))}
          mode={mode}
        />
      ))}
    </div>
  );

  const renderRelatedTable = (fields: FieldConfig[], title: string, description: string) => (
    <RelatedTableRenderer
      title={title}
      description={description}
      data={relatedData}
      fields={fields}
      onAdd={(record) => onAddRelated(tabConfig.table, record)}
      onUpdate={(index, record) => onUpdateRelatedRecord(tabConfig.table, index, record)}
      onDelete={(index) => onDeleteRelatedRecord(tabConfig.table, index)}
      mode={mode}
    />
  );

  switch (activeTab) {
    case 'basic':
      return renderBasicTab();
    case 'properties':
      return renderPropertiesTab();
    case 'types':
      return renderRelatedTable(TOKEN_TYPES_FIELDS, 'Token Types', 'Define different types of tokens within the collection');
    case 'balances':
      return renderRelatedTable(BALANCE_FIELDS, 'Balance Tracking', 'Track token balances for different addresses');
    case 'crafting':
      return renderRelatedTable(CRAFTING_FIELDS, 'Crafting Recipes', 'Gaming mechanics for combining tokens');
    case 'pricing':
      return renderRelatedTable(DISCOUNT_FIELDS, 'Discount Tiers', 'Pricing tiers and discount configurations');
    case 'uris':
      return renderRelatedTable(URI_MAPPING_FIELDS, 'URI Mappings', 'Metadata URI mappings for token types');
    case 'configs':
      return renderRelatedTable(TYPE_CONFIG_FIELDS, 'Type Configurations', 'Advanced configurations for each token type');
    default:
      return <div>Tab content not found</div>;
  }
};

const ERC1155EditForm: React.FC<EditFormProps> = (props) => {
  return (
    <BaseTokenEditForm
      {...props}
      tokenStandard="ERC-1155"
      tabs={ERC1155_TABS}
    >
      <ERC1155TabContent />
    </BaseTokenEditForm>
  );
};

export default ERC1155EditForm;
