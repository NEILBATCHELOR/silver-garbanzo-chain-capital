/**
 * Product Factory component for creating different product forms based on type
 */

import React from 'react';
import { ProjectType } from '@/types/projects/projectTypes';
import { BaseProduct } from '@/types/products/productTypes';

// Import all product form components
import { 
  StructuredProductForm,
  EquityProductForm,
  CommoditiesProductForm,
  FundProductForm,
  BondProductForm,
  QuantitativeInvestmentStrategyProductForm,
  PrivateEquityProductForm,
  PrivateDebtProductForm,
  RealEstateProductForm,
  EnergyProductForm,
  InfrastructureProductForm,
  CollectiblesProductForm,
  AssetBackedProductForm,
  DigitalTokenizedFundProductForm,
  StablecoinProductForm
} from '@/components/products';

export interface ProductFactoryProps {
  productType: ProjectType;
  defaultValues?: any;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export const ProductFactory = ({ 
  productType, 
  defaultValues, 
  onSubmit, 
  isSubmitting,
  onCancel
}: ProductFactoryProps) => {
  switch (productType) {
    case ProjectType.STRUCTURED_PRODUCTS:
      return (
        <StructuredProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.EQUITY:
      return (
        <EquityProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.COMMODITIES:
      return (
        <CommoditiesProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.FUNDS_ETFS_ETPS:
      return (
        <FundProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.BONDS:
      return (
        <BondProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES:
      return (
        <QuantitativeInvestmentStrategyProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.PRIVATE_EQUITY:
      return (
        <PrivateEquityProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.PRIVATE_DEBT:
      return (
        <PrivateDebtProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.REAL_ESTATE:
      return (
        <RealEstateProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.ENERGY:
      return (
        <EnergyProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.INFRASTRUCTURE:
      return (
        <InfrastructureProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.COLLECTIBLES:
      return (
        <CollectiblesProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.RECEIVABLES:
      return (
        <AssetBackedProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.DIGITAL_TOKENISED_FUND:
      return (
        <DigitalTokenizedFundProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      );
    case ProjectType.FIAT_BACKED_STABLECOIN:
    case ProjectType.CRYPTO_BACKED_STABLECOIN:
    case ProjectType.COMMODITY_BACKED_STABLECOIN:
    case ProjectType.ALGORITHMIC_STABLECOIN:
    case ProjectType.REBASING_STABLECOIN:
      return (
        <StablecoinProductForm
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          stablecoinType={productType}
        />
      );
    default:
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">
            No form available for product type: {productType}
          </p>
        </div>
      );
  }
};

/**
 * Helper function to get the right product form component based on type
 */
export const getProductForm = (productType: ProjectType) => {
  switch (productType) {
    case ProjectType.STRUCTURED_PRODUCTS:
      return StructuredProductForm;
    case ProjectType.EQUITY:
      return EquityProductForm;
    case ProjectType.COMMODITIES:
      return CommoditiesProductForm;
    case ProjectType.FUNDS_ETFS_ETPS:
      return FundProductForm;
    case ProjectType.BONDS:
      return BondProductForm;
    case ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES:
      return QuantitativeInvestmentStrategyProductForm;
    case ProjectType.PRIVATE_EQUITY:
      return PrivateEquityProductForm;
    case ProjectType.PRIVATE_DEBT:
      return PrivateDebtProductForm;
    case ProjectType.REAL_ESTATE:
      return RealEstateProductForm;
    case ProjectType.ENERGY:
      return EnergyProductForm;
    case ProjectType.INFRASTRUCTURE:
      return InfrastructureProductForm;
    case ProjectType.COLLECTIBLES:
      return CollectiblesProductForm;
    case ProjectType.RECEIVABLES:
      return AssetBackedProductForm;
    case ProjectType.DIGITAL_TOKENISED_FUND:
      return DigitalTokenizedFundProductForm;
    case ProjectType.FIAT_BACKED_STABLECOIN:
    case ProjectType.CRYPTO_BACKED_STABLECOIN:
    case ProjectType.COMMODITY_BACKED_STABLECOIN:
    case ProjectType.ALGORITHMIC_STABLECOIN:
    case ProjectType.REBASING_STABLECOIN:
      return StablecoinProductForm;
    default:
      return () => (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">
            No form available for product type: {productType}
          </p>
        </div>
      );
  }
};

export default ProductFactory;
