import React from 'react';
import BaseTokenEditForm from './BaseTokenEditForm';
import { FieldRenderer, RelatedTableRenderer } from './FieldRenderer';
import { EditFormProps, TabConfig, FieldConfig } from './types';

// ERC-3525 Tab Configurations
const ERC3525_TABS: TabConfig[] = [
  {
    id: 'basic',
    label: 'Basic Properties',
    table: 'tokens',
    description: 'Core semi-fungible token information',
    isRelational: false,
    fields: ['name', 'symbol', 'description', 'standard', 'status']
  },
  {
    id: 'properties',
    label: 'Semi-Fungible Properties',
    table: 'token_erc3525_properties',
    description: 'ERC-3525 specific properties and configurations',
    isRelational: false,
    fields: [
      'valueDecimals', 'contractUri', 'slotUri', 'isTransferable', 'isMergeable',
      'isSplittable', 'financialInstrument', 'maturityDate', 'interestRate',
      'principalAmount', 'paymentFrequency', 'underlyingAsset'
    ]
  },
  {
    id: 'slots',
    label: 'Slot Definitions',
    table: 'token_erc3525_slots',
    description: 'Define different slots for grouping tokens',
    isRelational: true,
    fields: ['slotId', 'name', 'description', 'slotUri', 'category', 'isActive']
  },
  {
    id: 'allocations',
    label: 'Value Allocations',
    table: 'token_erc3525_allocations',
    description: 'Allocate values to different purposes or entities',
    isRelational: true,
    fields: ['tokenId', 'purpose', 'allocatedValue', 'allocatedTo', 'allocationDate', 'status']
  },
  {
    id: 'payment_schedules',
    label: 'Payment Schedules',
    table: 'token_erc3525_payment_schedules',
    description: 'Payment schedules for financial instruments',
    isRelational: true,
    fields: ['tokenId', 'paymentDate', 'paymentAmount', 'paymentType', 'isPaid', 'transactionHash']
  },
  {
    id: 'value_adjustments',
    label: 'Value Modifications',
    table: 'token_erc3525_value_adjustments',
    description: 'Track value modifications and adjustments',
    isRelational: true,
    fields: ['tokenId', 'adjustmentType', 'oldValue', 'newValue', 'reason', 'adjustedBy', 'adjustmentDate']
  },
  {
    id: 'slot_configs',
    label: 'Slot Configurations',
    table: 'token_erc3525_slot_configs',
    description: 'Advanced configurations for each slot',
    isRelational: true,
    fields: ['slotId', 'config', 'isLocked', 'maxTokens', 'transferRestrictions', 'valueLimits']
  }
];

// Basic Properties Fields
const BASIC_FIELDS: FieldConfig[] = [
  {
    name: 'name',
    type: 'text',
    label: 'Token Name',
    description: 'The name of the semi-fungible token',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'symbol',
    type: 'text',
    label: 'Token Symbol',
    description: 'The symbol for the token',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    description: 'Detailed description of the semi-fungible token',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'status',
    type: 'select',
    label: 'Status',
    description: 'Current status of the token',
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

// Semi-Fungible Properties Fields
const PROPERTIES_FIELDS: FieldConfig[] = [
  {
    name: 'valueDecimals',
    type: 'number',
    label: 'Value Decimals',
    description: 'Number of decimal places for token values',
    required: true,
    showInBasic: true,
    showInAdvanced: true,
    validation: { min: 0, max: 18 }
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
    name: 'slotUri',
    type: 'text',
    label: 'Slot URI Template',
    description: 'URI template for slot metadata',
    showInBasic: false,
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
    name: 'isMergeable',
    type: 'boolean',
    label: 'Mergeable',
    description: 'Allow merging tokens of the same slot',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isSplittable',
    type: 'boolean',
    label: 'Splittable',
    description: 'Allow splitting token values',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'financialInstrument',
    type: 'select',
    label: 'Financial Instrument',
    description: 'Type of financial instrument represented',
    showInBasic: false,
    showInAdvanced: true,
    options: [
      { value: 'bond', label: 'Bond' },
      { value: 'note', label: 'Note' },
      { value: 'certificate', label: 'Certificate' },
      { value: 'coupon', label: 'Coupon' },
      { value: 'loan', label: 'Loan' },
      { value: 'other', label: 'Other' }
    ]
  },
  {
    name: 'maturityDate',
    type: 'text',
    label: 'Maturity Date',
    description: 'Maturity date for financial instruments',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'interestRate',
    type: 'number',
    label: 'Interest Rate',
    description: 'Interest rate percentage',
    showInBasic: false,
    showInAdvanced: true,
    validation: { min: 0, max: 100 }
  },
  {
    name: 'principalAmount',
    type: 'text',
    label: 'Principal Amount',
    description: 'Principal amount for financial instruments',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'paymentFrequency',
    type: 'select',
    label: 'Payment Frequency',
    description: 'Frequency of interest/dividend payments',
    showInBasic: false,
    showInAdvanced: true,
    options: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'semi_annual', label: 'Semi-Annual' },
      { value: 'annual', label: 'Annual' },
      { value: 'maturity', label: 'At Maturity' }
    ]
  },
  {
    name: 'underlyingAsset',
    type: 'text',
    label: 'Underlying Asset',
    description: 'The underlying asset or reference',
    showInBasic: false,
    showInAdvanced: true
  }
];

// Slot Definition Fields
const SLOT_FIELDS: FieldConfig[] = [
  {
    name: 'slotId',
    type: 'text',
    label: 'Slot ID',
    description: 'Unique identifier for this slot',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'name',
    type: 'text',
    label: 'Slot Name',
    description: 'Human-readable name for the slot',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    description: 'Description of what this slot represents',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'slotUri',
    type: 'text',
    label: 'Slot URI',
    description: 'URI for slot-specific metadata',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'category',
    type: 'select',
    label: 'Category',
    description: 'Category of the slot',
    showInBasic: true,
    showInAdvanced: true,
    options: [
      { value: 'maturity', label: 'Maturity' },
      { value: 'risk_level', label: 'Risk Level' },
      { value: 'asset_class', label: 'Asset Class' },
      { value: 'geographic', label: 'Geographic' },
      { value: 'other', label: 'Other' }
    ]
  },
  {
    name: 'isActive',
    type: 'boolean',
    label: 'Active',
    description: 'This slot is currently active',
    showInBasic: true,
    showInAdvanced: true
  }
];

// Value Allocation Fields
const ALLOCATION_FIELDS: FieldConfig[] = [
  {
    name: 'tokenId',
    type: 'text',
    label: 'Token ID',
    description: 'ID of the token being allocated',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'purpose',
    type: 'text',
    label: 'Purpose',
    description: 'Purpose of this allocation',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'allocatedValue',
    type: 'text',
    label: 'Allocated Value',
    description: 'Amount of value allocated',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'allocatedTo',
    type: 'text',
    label: 'Allocated To',
    description: 'Entity or address receiving the allocation',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'allocationDate',
    type: 'text',
    label: 'Allocation Date',
    description: 'Date when allocation was made',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'status',
    type: 'select',
    label: 'Status',
    description: 'Status of the allocation',
    showInBasic: true,
    showInAdvanced: true,
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ]
  }
];

// Payment Schedule Fields
const PAYMENT_FIELDS: FieldConfig[] = [
  {
    name: 'tokenId',
    type: 'text',
    label: 'Token ID',
    description: 'ID of the token',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'paymentDate',
    type: 'text',
    label: 'Payment Date',
    description: 'Scheduled payment date',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'paymentAmount',
    type: 'text',
    label: 'Payment Amount',
    description: 'Amount to be paid',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'paymentType',
    type: 'select',
    label: 'Payment Type',
    description: 'Type of payment',
    showInBasic: true,
    showInAdvanced: true,
    options: [
      { value: 'interest', label: 'Interest' },
      { value: 'principal', label: 'Principal' },
      { value: 'dividend', label: 'Dividend' },
      { value: 'coupon', label: 'Coupon' },
      { value: 'redemption', label: 'Redemption' }
    ]
  },
  {
    name: 'isPaid',
    type: 'boolean',
    label: 'Is Paid',
    description: 'Payment has been made',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'transactionHash',
    type: 'text',
    label: 'Transaction Hash',
    description: 'Hash of the payment transaction',
    showInBasic: false,
    showInAdvanced: true
  }
];

// Value Adjustment Fields
const ADJUSTMENT_FIELDS: FieldConfig[] = [
  {
    name: 'tokenId',
    type: 'text',
    label: 'Token ID',
    description: 'ID of the token being adjusted',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'adjustmentType',
    type: 'select',
    label: 'Adjustment Type',
    description: 'Type of value adjustment',
    required: true,
    showInBasic: true,
    showInAdvanced: true,
    options: [
      { value: 'increase', label: 'Increase' },
      { value: 'decrease', label: 'Decrease' },
      { value: 'split', label: 'Split' },
      { value: 'merge', label: 'Merge' },
      { value: 'correction', label: 'Correction' }
    ]
  },
  {
    name: 'oldValue',
    type: 'text',
    label: 'Old Value',
    description: 'Value before adjustment',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'newValue',
    type: 'text',
    label: 'New Value',
    description: 'Value after adjustment',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'reason',
    type: 'textarea',
    label: 'Reason',
    description: 'Reason for the adjustment',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'adjustedBy',
    type: 'text',
    label: 'Adjusted By',
    description: 'Address that made the adjustment',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'adjustmentDate',
    type: 'text',
    label: 'Adjustment Date',
    description: 'Date when adjustment was made',
    showInBasic: false,
    showInAdvanced: true
  }
];

// Slot Configuration Fields
const SLOT_CONFIG_FIELDS: FieldConfig[] = [
  {
    name: 'slotId',
    type: 'text',
    label: 'Slot ID',
    description: 'ID of the slot being configured',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'config',
    type: 'json',
    label: 'Configuration',
    description: 'Slot configuration as JSON',
    required: true,
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'isLocked',
    type: 'boolean',
    label: 'Locked',
    description: 'Configuration is locked',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'maxTokens',
    type: 'text',
    label: 'Max Tokens',
    description: 'Maximum tokens allowed in this slot',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'transferRestrictions',
    type: 'json',
    label: 'Transfer Restrictions',
    description: 'Transfer restrictions for this slot',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'valueLimits',
    type: 'json',
    label: 'Value Limits',
    description: 'Value limits for tokens in this slot',
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

const ERC3525TabContent: React.FC<Partial<TabContentProps>> = ({
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

    case 'slots':
      return renderRelatedTable(SLOT_FIELDS, 'Slot Definitions', 'Define different slots for grouping tokens');

    case 'allocations':
      return renderRelatedTable(ALLOCATION_FIELDS, 'Value Allocations', 'Allocate values to different purposes');

    case 'payment_schedules':
      return renderRelatedTable(PAYMENT_FIELDS, 'Payment Schedules', 'Payment schedules for financial instruments');

    case 'value_adjustments':
      return renderRelatedTable(ADJUSTMENT_FIELDS, 'Value Modifications', 'Track value modifications and adjustments');

    case 'slot_configs':
      return renderRelatedTable(SLOT_CONFIG_FIELDS, 'Slot Configurations', 'Advanced configurations for each slot');

    default:
      return <div>Tab content not found</div>;
  }
};

const ERC3525EditForm: React.FC<EditFormProps> = (props) => {
  return (
    <BaseTokenEditForm
      {...props}
      tokenStandard="ERC-3525"
      tabs={ERC3525_TABS}
    >
      <ERC3525TabContent />
    </BaseTokenEditForm>
  );
};

export default ERC3525EditForm;
