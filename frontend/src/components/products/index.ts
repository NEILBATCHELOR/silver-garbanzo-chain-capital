/**
 * Product Components Index
 * Exports all product details and form components for easy importing
 */

// Product Details Components
import BondProductDetails from './product-types/BondProductDetails';
import CommoditiesProductDetails from './product-types/CommoditiesProductDetails';
import DigitalTokenizedFundProductDetails from './product-types/DigitalTokenizedFundProductDetails';
import EnergyProductDetails from './product-types/EnergyProductDetails';
import EquityProductDetails from './product-types/EquityProductDetails';
import FundProductDetails from './product-types/FundProductDetails';
import InfrastructureProductDetails from './product-types/InfrastructureProductDetails';
import PrivateDebtProductDetails from './product-types/PrivateDebtProductDetails';
import PrivateEquityProductDetails from './product-types/PrivateEquityProductDetails';
import QuantitativeInvestmentStrategyProductDetails from './product-types/QuantitativeInvestmentStrategyProductDetails';
import RealEstateProductDetails from './product-types/RealEstateProductDetails';
import StablecoinProductDetails from './product-types/StablecoinProductDetails';
import StructuredProductDetails from './product-types/StructuredProductDetails';
import AssetBackedProductDetails from './product-types/AssetBackedProductDetails';
import CollectiblesProductDetails from './product-types/CollectiblesProductDetails';

// Product Form Components
import BondProductForm from './product-forms/BondProductForm';
import CommoditiesProductForm from './product-forms/CommoditiesProductForm';
import DigitalTokenizedFundProductForm from './product-forms/DigitalTokenizedFundProductForm';
import EnergyProductForm from './product-forms/EnergyProductForm';
import EquityProductForm from './product-forms/EquityProductForm';
import FundProductForm from './product-forms/FundProductForm';
import InfrastructureProductForm from './product-forms/InfrastructureProductForm';
import PrivateDebtProductForm from './product-forms/PrivateDebtProductForm';
import PrivateEquityProductForm from './product-forms/PrivateEquityProductForm';
import QuantitativeInvestmentStrategyProductForm from './product-forms/QuantitativeInvestmentStrategyProductForm';
import RealEstateProductForm from './product-forms/RealEstateProductForm';
import StablecoinProductForm from './product-forms/StablecoinProductForm';
import StructuredProductForm from './product-forms/StructuredProductForm';
import AssetBackedProductForm from './product-forms/AssetBackedProductForm';
import CollectiblesProductForm from './product-forms/CollectiblesProductForm';

// Lifecycle Components
import {
  LifecycleEventCard,
  LifecycleTimeline,
  LifecycleEventForm,
  LifecycleAnalytics,
  LifecycleReport,
  ProductLifecycleManager
} from './lifecycle';

// Main Components
import ProductDetails from './ProductDetails';
import ProductForm from './ProductForm';
import { BaseProductForm } from './BaseProductForm';

export {
  // Main Components
  ProductDetails,
  ProductForm,
  BaseProductForm,
  
  // Product Details Components
  BondProductDetails,
  CommoditiesProductDetails,
  DigitalTokenizedFundProductDetails,
  EnergyProductDetails,
  EquityProductDetails,
  FundProductDetails,
  InfrastructureProductDetails,
  PrivateDebtProductDetails,
  PrivateEquityProductDetails,
  QuantitativeInvestmentStrategyProductDetails,
  RealEstateProductDetails,
  StablecoinProductDetails,
  StructuredProductDetails,
  AssetBackedProductDetails,
  CollectiblesProductDetails,
  
  // Product Form Components
  BondProductForm,
  CommoditiesProductForm,
  DigitalTokenizedFundProductForm,
  EnergyProductForm,
  EquityProductForm,
  FundProductForm,
  InfrastructureProductForm,
  PrivateDebtProductForm,
  PrivateEquityProductForm,
  QuantitativeInvestmentStrategyProductForm,
  RealEstateProductForm,
  StablecoinProductForm,
  StructuredProductForm,
  AssetBackedProductForm,
  CollectiblesProductForm,
  
  // Lifecycle Components
  LifecycleEventCard,
  LifecycleTimeline,
  LifecycleEventForm,
  LifecycleAnalytics,
  LifecycleReport,
  ProductLifecycleManager
};
