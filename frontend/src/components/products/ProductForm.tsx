/**
 * Product form component for adding or editing product details
 * This component dynamically renders the appropriate form based on the product type
 */

import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { AnyProduct } from '@/types/products';
import { EnhancedStablecoinProduct } from '@/types/products/enhancedProducts';
import { ProjectType } from '@/types/projects/projectTypes';
import { ProductFactoryService } from '@/services/products';
import StructuredProductForm from './product-forms/StructuredProductForm';
import EquityProductForm from './product-forms/EquityProductForm';
import BondProductForm from './product-forms/BondProductForm';
import FundProductForm from './product-forms/FundProductForm';
import CommoditiesProductForm from './product-forms/CommoditiesProductForm';
import QuantitativeInvestmentStrategyProductForm from './product-forms/QuantitativeInvestmentStrategyProductForm';
import PrivateEquityProductForm from './product-forms/PrivateEquityProductForm';
import PrivateDebtProductForm from './product-forms/PrivateDebtProductForm';
import RealEstateProductForm from './product-forms/RealEstateProductForm';
import EnergyProductForm from './product-forms/EnergyProductForm';
import InfrastructureProductForm from './product-forms/InfrastructureProductForm';
import CollectiblesProductForm from './product-forms/CollectiblesProductForm';
import AssetBackedProductForm from './product-forms/AssetBackedProductForm';
import DigitalTokenizedFundProductForm from './product-forms/DigitalTokenizedFundProductForm';
import StablecoinProductForm from './product-forms/StablecoinProductForm';

interface ProductFormProps {
  projectId: string;
  projectType: ProjectType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ProductForm({ projectId, projectType, onSuccess, onCancel }: ProductFormProps) {
  const [product, setProduct] = useState<AnyProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProductData();
  }, [projectId, projectType]);

  const loadProductData = async () => {
    try {
      setIsLoading(true);
      const productData = await ProductFactoryService.getProductForProject(projectId, projectType);
      setProduct(productData);
    } catch (error) {
      console.error('Error loading product:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      
      // Add project ID to form data
      const productData = {
        ...formData,
        projectId,
      };
      
      // Create or update product
      if (product) {
        // Update existing product
        console.log('Updating product:', product.id, projectType, productData);
        await ProductFactoryService.updateProduct(product.id, projectType, productData);
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
      } else {
        // Create new product
        await ProductFactoryService.createProduct(projectType, productData);
        toast({
          title: 'Success',
          description: 'Product created successfully',
        });
      }
      
      // Refresh product data
      await loadProductData();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Extract error message for better user feedback
      let errorMessage = 'Failed to save product details';
      if (error instanceof Error) {
        // Check for specific errors to provide better messages
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          errorMessage = 'A product already exists for this project. The existing product will be updated.';
          
          // Try to reload the product data to show the existing product
          try {
            await loadProductData();
          } catch (loadError) {
            console.error('Error reloading product after duplicate key error:', loadError);
          }
        } else {
          // Use the error message from the caught error
          errorMessage = `Failed to save product details: ${error.message}`;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the appropriate form based on product type
  const renderProductForm = () => {
    const defaultValues = product || undefined;
    
    switch (projectType) {
      case ProjectType.STRUCTURED_PRODUCTS:
        return (
          <StructuredProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.EQUITY:
        return (
          <EquityProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.BONDS:
        return (
          <BondProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.FUNDS_ETFS_ETPS:
        return (
          <FundProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.COMMODITIES:
        return (
          <CommoditiesProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES:
        return (
          <QuantitativeInvestmentStrategyProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.PRIVATE_EQUITY:
        // Cast defaultValues to the proper type expected by PrivateEquityProductForm
        const privateEquityDefaults = defaultValues ? {
          ...defaultValues,
          // Ensure fundVintageYear is a string using type checking
          fundVintageYear: 'fundVintageYear' in defaultValues && defaultValues.fundVintageYear ? 
            defaultValues.fundVintageYear.toString() : undefined,
          // Ensure all other fields are properly typed
          sectorFocus: 'sectorFocus' in defaultValues ? 
            (typeof defaultValues.sectorFocus === 'string' ? 
              defaultValues.sectorFocus : undefined) : undefined,
          // Ensure geographicFocus is a string
          geographicFocus: 'geographicFocus' in defaultValues ? 
            (Array.isArray(defaultValues.geographicFocus) ? 
              defaultValues.geographicFocus.join(', ') : defaultValues.geographicFocus) : undefined
        } : undefined;
        
        return (
          <PrivateEquityProductForm 
            defaultValues={privateEquityDefaults} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.PRIVATE_DEBT:
        return (
          <PrivateDebtProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.REAL_ESTATE:
        return (
          <RealEstateProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.ENERGY:
      case ProjectType.SOLAR_WIND_CLIMATE:
        return (
          <EnergyProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            energyType={projectType}
            onCancel={onCancel}
          />
        );
      case ProjectType.INFRASTRUCTURE:
        return (
          <InfrastructureProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.COLLECTIBLES:
        return (
          <CollectiblesProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.RECEIVABLES:
        return (
          <AssetBackedProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.DIGITAL_TOKENISED_FUND:
        return (
          <DigitalTokenizedFundProductForm 
            defaultValues={defaultValues} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            onCancel={onCancel}
          />
        );
      case ProjectType.FIAT_BACKED_STABLECOIN:
      case ProjectType.CRYPTO_BACKED_STABLECOIN:
      case ProjectType.COMMODITY_BACKED_STABLECOIN:
      case ProjectType.ALGORITHMIC_STABLECOIN:
      case ProjectType.REBASING_STABLECOIN:
        // Create a clean object without the collateralTypeEnum property
        const stablecoinProduct = { ...defaultValues } as Partial<EnhancedStablecoinProduct>;
        
        // Safely remove the property if it exists to avoid type errors
        if ('collateralTypeEnum' in stablecoinProduct) {
          const { collateralTypeEnum, ...rest } = stablecoinProduct;
          return (
            <StablecoinProductForm 
              defaultValues={rest}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              stablecoinType={projectType}
              onCancel={onCancel}
            />
          );
        }
        
        // If collateralTypeEnum doesn't exist, use the original object
        return (
          <StablecoinProductForm 
            defaultValues={stablecoinProduct}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            stablecoinType={projectType}
            onCancel={onCancel}
          />
        );
      default:
        return (
          <div className="p-4 text-muted-foreground">
            Product form not available for this project type
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {product ? 'Edit Product Details' : 'Add Product Details'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderProductForm()}
      </CardContent>
    </Card>
  );
}
