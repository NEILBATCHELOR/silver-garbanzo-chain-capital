import React from 'react';
import BaseTokenEditForm from './BaseTokenEditForm';
import { FieldRenderer, RelatedTableRenderer } from './FieldRenderer';
import { EditFormProps, TabConfig, FieldConfig } from './types';

// ERC-20 Tab Configurations
const ERC20_TABS: TabConfig[] = [
  {
    id: 'basic',
    label: 'Basic Properties',
    table: 'tokens',
    description: 'Core token information and basic settings',
    isRelational: false,
    fields: ['name', 'symbol', 'decimals', 'description', 'standard', 'status']
  },
  {
    id: 'properties',
    label: 'ERC-20 Properties',
    table: 'token_erc20_properties',
    description: 'ERC-20 specific properties and configurations',
    isRelational: false,
    fields: [
      'initialSupply', 'cap', 'isMintable', 'isBurnable', 'isPausable',
      'tokenType', 'allowManagement', 'snapshot', 'transferConfig',
      'gasConfig', 'complianceConfig', 'whitelistConfig', 'governanceConfig'
    ]
  }
];

// Field Configurations for Basic Properties Tab
const BASIC_FIELDS: FieldConfig[] = [
  {
    name: 'name',
    type: 'text',
    label: 'Token Name',
    description: 'The full name of the token (e.g., "Ethereum")',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'symbol',
    type: 'text',
    label: 'Token Symbol',
    description: 'The ticker symbol of the token (e.g., "ETH")',
    required: true,
    showInBasic: true,
    showInAdvanced: true,
    validation: { max: 10 }
  },
  {
    name: 'decimals',
    type: 'number',
    label: 'Decimals',
    description: 'Number of decimal places for token amounts',
    required: true,
    showInBasic: true,
    showInAdvanced: true,
    validation: { min: 0, max: 18 }
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    description: 'Detailed description of the token and its purpose',
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

// Field Configurations for ERC-20 Properties Tab
const PROPERTIES_FIELDS: FieldConfig[] = [
  {
    name: 'initialSupply',
    type: 'text',
    label: 'Initial Supply',
    description: 'The initial amount of tokens to mint',
    required: true,
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'cap',
    type: 'text',
    label: 'Maximum Cap',
    description: 'Maximum total supply of tokens (0 for unlimited)',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isMintable',
    type: 'boolean',
    label: 'Mintable',
    description: 'Allow minting new tokens after deployment',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isBurnable',
    type: 'boolean',
    label: 'Burnable',
    description: 'Allow burning/destroying tokens',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'isPausable',
    type: 'boolean',
    label: 'Pausable',
    description: 'Allow pausing all token transfers',
    showInBasic: true,
    showInAdvanced: true
  },
  {
    name: 'tokenType',
    type: 'select',
    label: 'Token Type',
    description: 'The category/type of token',
    showInBasic: false,
    showInAdvanced: true,
    options: [
      { value: 'utility', label: 'Utility Token' },
      { value: 'security', label: 'Security Token' },
      { value: 'payment', label: 'Payment Token' },
      { value: 'governance', label: 'Governance Token' },
      { value: 'stablecoin', label: 'Stablecoin' }
    ]
  },
  {
    name: 'allowManagement',
    type: 'boolean',
    label: 'Allow Management',
    description: 'Enable advanced management features',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'snapshot',
    type: 'boolean',
    label: 'Snapshot Support',
    description: 'Enable balance snapshots for governance',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'transferConfig',
    type: 'json',
    label: 'Transfer Configuration',
    description: 'Advanced transfer settings and restrictions',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'gasConfig',
    type: 'json',
    label: 'Gas Configuration',
    description: 'Gas optimization and limit settings',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'complianceConfig',
    type: 'json',
    label: 'Compliance Configuration',
    description: 'KYC, AML, and regulatory compliance settings',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'whitelistConfig',
    type: 'json',
    label: 'Whitelist Configuration',
    description: 'Address whitelist and access control settings',
    showInBasic: false,
    showInAdvanced: true
  },
  {
    name: 'governanceConfig',
    type: 'json',
    label: 'Governance Configuration',
    description: 'Voting and governance mechanism settings',
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

const ERC20TabContent: React.FC<Partial<TabContentProps>> = ({
  activeTab,
  tabConfig,
  mode,
  tokenData,
  propertiesData,
  onUpdateToken,
  onUpdateProperties,
  errors
}) => {
  if (activeTab === 'basic') {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  if (activeTab === 'properties') {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  return null;
};

const ERC20EditForm: React.FC<EditFormProps> = (props) => {
  return (
    <BaseTokenEditForm
      {...props}
      tokenStandard="ERC-20"
      tabs={ERC20_TABS}
    >
      <ERC20TabContent />
    </BaseTokenEditForm>
  );
};

export default ERC20EditForm;
