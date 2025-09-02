/**
 * Product details component for displaying product-specific information
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Edit } from 'lucide-react';
import { AnyProduct } from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';
import { ProductFactoryService } from '@/services/products';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import StructuredProductDetails from './product-types/StructuredProductDetails';
import EquityProductDetails from './product-types/EquityProductDetails';
import BondProductDetails from './product-types/BondProductDetails';
import FundProductDetails from './product-types/FundProductDetails';
import PrivateEquityProductDetails from './product-types/PrivateEquityProductDetails';
import PrivateDebtProductDetails from './product-types/PrivateDebtProductDetails';
import RealEstateProductDetails from './product-types/RealEstateProductDetails';
import EnergyProductDetails from './product-types/EnergyProductDetails';
import InfrastructureProductDetails from './product-types/InfrastructureProductDetails';
import CollectiblesProductDetails from './product-types/CollectiblesProductDetails';
import AssetBackedProductDetails from './product-types/AssetBackedProductDetails';
import CommoditiesProductDetails from './product-types/CommoditiesProductDetails';
import QuantitativeInvestmentStrategyProductDetails from './product-types/QuantitativeInvestmentStrategyProductDetails';
import DigitalTokenizedFundProductDetails from './product-types/DigitalTokenizedFundProductDetails';
import StablecoinProductDetails from './product-types/StablecoinProductDetails';
import ProductLifecycleManager from './lifecycle/product-lifecycle-manager';

// Define props for the product details component
interface ProductDetailsProps {
  projectId: string;
  projectType: ProjectType;
  onEdit?: () => void;
}

export default function ProductDetails({ projectId, projectType, onEdit }: ProductDetailsProps) {
  const [product, setProduct] = useState<AnyProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
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

  // Render the appropriate product details component based on product type
  const renderProductDetails = () => {
    if (!product) return null;

    switch (projectType) {
      case ProjectType.STRUCTURED_PRODUCTS:
        return <StructuredProductDetails product={product as any} />;
      case ProjectType.EQUITY:
        return <EquityProductDetails product={product as any} />;
      case ProjectType.BONDS:
        return <BondProductDetails product={product as any} />;
      case ProjectType.FUNDS_ETFS_ETPS:
        return <FundProductDetails product={product as any} />;
      case ProjectType.COMMODITIES:
        return <CommoditiesProductDetails product={product as any} />;
      case ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES:
        return <QuantitativeInvestmentStrategyProductDetails product={product as any} />;
      case ProjectType.PRIVATE_EQUITY:
        return <PrivateEquityProductDetails product={product as any} />;
      case ProjectType.PRIVATE_DEBT:
        return <PrivateDebtProductDetails product={product as any} />;
      case ProjectType.REAL_ESTATE:
        return <RealEstateProductDetails product={product as any} />;
      case ProjectType.ENERGY:
      case ProjectType.SOLAR_WIND_CLIMATE:
        return <EnergyProductDetails product={product as any} type={projectType} />;
      case ProjectType.INFRASTRUCTURE:
        return <InfrastructureProductDetails product={product as any} />;
      case ProjectType.COLLECTIBLES:
        return <CollectiblesProductDetails product={product as any} />;
      case ProjectType.RECEIVABLES:
        return <AssetBackedProductDetails product={product as any} />;
      case ProjectType.DIGITAL_TOKENISED_FUND:
        return <DigitalTokenizedFundProductDetails product={product as any} />;
      case ProjectType.FIAT_BACKED_STABLECOIN:
      case ProjectType.CRYPTO_BACKED_STABLECOIN:
      case ProjectType.COMMODITY_BACKED_STABLECOIN:
      case ProjectType.ALGORITHMIC_STABLECOIN:
      case ProjectType.REBASING_STABLECOIN:
        return <StablecoinProductDetails product={product as any} type={projectType} />;
      default:
        return (
          <div className="p-4 text-muted-foreground">
            Detailed view not available for this product type
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

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>No product information available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This project doesn't have any product details associated with it yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>Specific information for this {projectType.replace('_', ' ')} product</CardDescription>
        </div>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle Events</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            {renderProductDetails()}
          </TabsContent>

          <TabsContent value="lifecycle">
            <ProductLifecycleManager 
              productId={product.id}
              productType={projectType}
            />
          </TabsContent>


        </Tabs>
      </CardContent>
    </Card>
  );
}
