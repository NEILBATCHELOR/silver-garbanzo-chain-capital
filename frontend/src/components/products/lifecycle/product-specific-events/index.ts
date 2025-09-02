import StructuredProductEventCard from './structured-product-event-card';
import BondProductEventCard from './bond-product-event-card';
import EquityProductEventCard from './equity-product-event-card';
import FundProductEventCard from './fund-product-event-card';
import DigitalTokenizedFundEventCard from './digital-tokenized-fund-event-card';
import StablecoinEventCard from './stablecoin-event-card';
import CommoditiesEventCard from './commodities-event-card';
import PrivateEquityDebtEventCard from './private-equity-debt-event-card';
import RealEstateEventCard from './real-estate-event-card';

export {
  StructuredProductEventCard,
  BondProductEventCard,
  EquityProductEventCard,
  FundProductEventCard,
  DigitalTokenizedFundEventCard,
  StablecoinEventCard,
  CommoditiesEventCard,
  PrivateEquityDebtEventCard,
  RealEstateEventCard
};

/**
 * Factory function to get the appropriate event card component based on product type
 * @param productType The product type identifier
 * @returns The appropriate event card component or null to use the default card
 */
export const getProductSpecificEventCard = (productType: string) => {
  switch (productType) {
    case 'structured_products':
      return StructuredProductEventCard;
    case 'bonds':
      return BondProductEventCard;
    case 'equity':
      return EquityProductEventCard;
    case 'funds_etfs_etps':
      return FundProductEventCard;
    case 'digital_tokenised_fund':
      return DigitalTokenizedFundEventCard;
    case 'fiat_backed_stablecoin':
    case 'crypto_backed_stablecoin':
    case 'commodity_backed_stablecoin':
    case 'algorithmic_stablecoin':
    case 'rebasing_stablecoin':
      return StablecoinEventCard;
    case 'commodities':
      return CommoditiesEventCard;
    case 'private_equity':
    case 'private_debt':
      return PrivateEquityDebtEventCard;
    case 'real_estate':
      return RealEstateEventCard;
    // Future product types can be added here
    default:
      return null; // Return null to use the default event card
  }
};