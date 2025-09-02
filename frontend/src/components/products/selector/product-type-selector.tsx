/**
 * Product Type Selector component for selecting the product type for a project
 */

import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ProjectType } from '@/types/projects/projectTypes';

export interface ProductTypeSelectorProps {
  value?: ProjectType;
  onChange?: (value: ProjectType) => void;
  onSelect?: (value: ProjectType) => void;
  disabled?: boolean;
}

const productTypeOptions = [
  { value: ProjectType.STRUCTURED_PRODUCTS, label: 'Structured Products' },
  { value: ProjectType.EQUITY, label: 'Equity' },
  { value: ProjectType.COMMODITIES, label: 'Commodities' },
  { value: ProjectType.FUNDS_ETFS_ETPS, label: 'Fund, ETF, ETP' },
  { value: ProjectType.BONDS, label: 'Bond' },
  { value: ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES, label: 'Quantitative Investment Strategy' },
  { value: ProjectType.PRIVATE_EQUITY, label: 'Private Equity' },
  { value: ProjectType.PRIVATE_DEBT, label: 'Private Debt' },
  { value: ProjectType.REAL_ESTATE, label: 'Real Estate' },
  { value: ProjectType.ENERGY, label: 'Energy' },
  { value: ProjectType.INFRASTRUCTURE, label: 'Infrastructure' },
  { value: ProjectType.COLLECTIBLES, label: 'Collectibles & Other Assets' },
  { value: ProjectType.RECEIVABLES, label: 'Asset Backed/Receivables' },
  { value: ProjectType.DIGITAL_TOKENISED_FUND, label: 'Digital Tokenized Fund' },
  { value: ProjectType.FIAT_BACKED_STABLECOIN, label: 'Fiat-Backed Stablecoin' },
  { value: ProjectType.CRYPTO_BACKED_STABLECOIN, label: 'Crypto-Backed Stablecoin' },
  { value: ProjectType.COMMODITY_BACKED_STABLECOIN, label: 'Commodity-Backed Stablecoin' },
  { value: ProjectType.ALGORITHMIC_STABLECOIN, label: 'Algorithmic Stablecoin' },
  { value: ProjectType.REBASING_STABLECOIN, label: 'Rebasing Stablecoin' }
];

export const ProductTypeSelector = ({ value, onChange, onSelect, disabled = false }: ProductTypeSelectorProps) => {
  return (
    <Select
      value={value}
      onValueChange={(val) => {
        const projectType = val as ProjectType;
        if (onChange) onChange(projectType);
        if (onSelect) onSelect(projectType);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select product type" />
      </SelectTrigger>
      <SelectContent>
        {productTypeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ProductTypeSelector;
