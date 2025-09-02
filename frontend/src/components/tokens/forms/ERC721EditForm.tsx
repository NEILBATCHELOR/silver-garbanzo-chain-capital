import React from 'react';
import BaseTokenEditForm from './BaseTokenEditForm';
import { FieldRenderer, RelatedTableRenderer } from './FieldRenderer';
import { EditFormProps, TabConfig, FieldConfig } from './types';

// ERC-721 Tab Configurations
const ERC721_TABS: TabConfig[] = [
  {
    id: 'basic',
    label: 'Basic Properties',
    table: 'tokens',
    description: 'Core NFT collection information',
    isRelational: false,
    fields: ['name', 'symbol', 'description', 'standard', 'status']
  },
  {
    id: 'properties',
    label: 'NFT Properties',
    table: 'token_erc721_properties',
    description: 'ERC-721 specific properties and configurations',
    isRelational: false,
    fields: [
      'baseUri', 'contractUri', 'maxSupply', 'isMintable', 'isBurnable', 'isPausable',
      'hasRoyalty', 'royaltyPercentage', 'royaltyReceiver', 'metadataStorage',
      'mintingMethod', 'autoIncrementIds', 'uriStorage', 'updatableUris'
    ]
  },
  {
    id: 'attributes',
    label: 'Token Attributes',
    table: 'token_erc721_attributes',
    description: 'Attributes/traits for individual NFTs',
    isRelational: true,
    fields: ['tokenId', 'traitType', 'value', 'displayType', 'maxValue', 'isRare']
  },
  {
    id: 'mint_phases',
    label: 'Minting Phases',
    table: 'token_erc721_mint_phases',
    description: 'Different phases for NFT minting (presale, public, etc.)',
    isRelational: true,
    fields: ['phaseName', 'startTime', 'endTime', 'maxPerWallet', 'price', 'merkleRoot', 'isActive']
  },
  {
    id: 'trait_definitions',
    label: 'Trait Definitions',
    table: 'token_erc721_trait_definitions',
    description: 'Define possible traits and their rarity',
    isRelational: true,
    fields: ['traitType', 'possibleValues', 'rarity', 'isRequired', 'description']
  }
];

// Basic Properties Fields
const BASIC_FIELDS: FieldConfig[] = [
  {
    name: 'name',
    type: 'text',
    label: 'Collection Name',
    description: 'The name of the NFT collection',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'symbol',
    type: 'text',
    label: 'Collection Symbol',
    description: 'The symbol for the NFT collection',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    description: 'Detailed description of the NFT collection',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'status',
    type: 'select',
    label: 'Status',
    description: 'Current status of the NFT collection',
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

// NFT Properties Fields
const PROPERTIES_FIELDS: FieldConfig[] = [
  {
    name: 'baseUri',
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
    name: 'maxSupply',
    type: 'text',
    label: 'Maximum Supply',
    description: 'Maximum number of NFTs that can be minted',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isMintable',
    type: 'boolean',
    label: 'Mintable',
    description: 'Allow minting new NFTs',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isBurnable',
    type: 'boolean',
    label: 'Burnable',
    description: 'Allow burning NFTs',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isPausable',
    type: 'boolean',
    label: 'Pausable',
    description: 'Allow pausing NFT transfers',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'hasRoyalty',
    type: 'boolean',
    label: 'Has Royalty',
    description: 'Enable royalty payments for secondary sales',
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
    name: 'metadataStorage',
    type: 'select',
    label: 'Metadata Storage',
    description: 'Where NFT metadata is stored',
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
    name: 'mintingMethod',
    type: 'select',
    label: 'Minting Method',
    description: 'How NFTs are minted',
    showInBasic: false,
    showInAdvanced: true,
    options: [
      { value: 'sequential', label: 'Sequential' },
      { value: 'random', label: 'Random' },
      { value: 'preset', label: 'Preset' }
    ]
  },
  {
    name: 'autoIncrementIds',
    type: 'boolean',
    label: 'Auto Increment IDs',
    description: 'Automatically increment token IDs',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'updatableUris',
    type: 'boolean',
    label: 'Updatable URIs',
    description: 'Allow updating token URIs after minting',
    showInBasic: false,
    showInAdvanced: true
  }
];

// Token Attributes Fields
const ATTRIBUTE_FIELDS: FieldConfig[] = [
  {
    name: 'tokenId',
    type: 'text',
    label: 'Token ID',
    description: 'ID of the NFT',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'traitType',
    type: 'text',
    label: 'Trait Type',
    description: 'Type of trait (e.g., "Background", "Eyes")',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'value',
    type: 'text',
    label: 'Value',
    description: 'Value of the trait',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'displayType',
    type: 'select',
    label: 'Display Type',
    description: 'How the trait should be displayed',
    showInBasic: false,
    showInAdvanced: true,
    options: [
      { value: 'string', label: 'String' },
      { value: 'number', label: 'Number' },
      { value: 'boost_number', label: 'Boost Number' },
      { value: 'boost_percentage', label: 'Boost Percentage' },
      { value: 'date', label: 'Date' }
    ]
  },
  {
    name: 'maxValue',
    type: 'number',
    label: 'Max Value',
    description: 'Maximum value for numeric traits',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'isRare',
    type: 'boolean',
    label: 'Is Rare',
    description: 'Mark this trait as rare',
    showInBasic: true,
    showInAdvanced: true
  }
];

// Mint Phases Fields
const MINT_PHASE_FIELDS: FieldConfig[] = [
  {
    name: 'phaseName',
    type: 'text',
    label: 'Phase Name',
    description: 'Name of the minting phase',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'startTime',
    type: 'text',
    label: 'Start Time',
    description: 'When this phase starts',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'endTime',
    type: 'text',
    label: 'End Time',
    description: 'When this phase ends',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'maxPerWallet',
    type: 'number',
    label: 'Max Per Wallet',
    description: 'Maximum NFTs per wallet in this phase',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'price',
    type: 'text',
    label: 'Price',
    description: 'Price per NFT in this phase',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'merkleRoot',
    type: 'text',
    label: 'Merkle Root',
    description: 'Merkle root for allowlist verification',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'isActive',
    type: 'boolean',
    label: 'Active',
    description: 'This phase is currently active',
    showInBasic: true,
    showInAdvanced: true
  }
];

// Trait Definitions Fields
const TRAIT_DEFINITION_FIELDS: FieldConfig[] = [
  {
    name: 'traitType',
    type: 'text',
    label: 'Trait Type',
    description: 'Type of trait being defined',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'possibleValues',
    type: 'array',
    label: 'Possible Values',
    description: 'List of possible values for this trait',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'rarity',
    type: 'number',
    label: 'Rarity',
    description: 'Rarity percentage (0-100)',
    showInBasic: true,
    showInAdvanced: true,
    validation: { min: 0, max: 100 }
  },
  {
    name: 'isRequired',
    type: 'boolean',
    label: 'Required',
    description: 'This trait is required for all NFTs',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    description: 'Description of this trait type',
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
  onAddRelated: (table: string, record: any) => void;
  onUpdateRelatedRecord: (table: string, index: number, record: any) => void;
  onDeleteRelatedRecord: (table: string, index: number) => void;
  errors: string[];
}

const ERC721TabContent: React.FC<Partial<TabContentProps>> = ({
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
      return (
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

    case 'properties':
      return (
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

    case 'attributes':
      return renderRelatedTable(ATTRIBUTE_FIELDS, 'Token Attributes', 'Attributes/traits for individual NFTs');

    case 'mint_phases':
      return renderRelatedTable(MINT_PHASE_FIELDS, 'Minting Phases', 'Different phases for NFT minting');

    case 'trait_definitions':
      return renderRelatedTable(TRAIT_DEFINITION_FIELDS, 'Trait Definitions', 'Define possible traits and their rarity');

    default:
      return <div>Tab content not found</div>;
  }
};

const ERC721EditForm: React.FC<EditFormProps> = (props) => {
  return (
    <BaseTokenEditForm
      {...props}
      tokenStandard="ERC-721"
      tabs={ERC721_TABS}
    >
      <ERC721TabContent />
    </BaseTokenEditForm>
  );
};

export default ERC721EditForm;
