-- Add cache tables for weather data and carbon market prices

-- We're already using the existing weather_data table directly

-- Create a table for REC price cache
CREATE TABLE IF NOT EXISTS rec_price_cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    price NUMERIC NOT NULL,
    market_type VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rec_price_cache_date ON rec_price_cache(date);
CREATE INDEX IF NOT EXISTS idx_rec_price_cache_market_type ON rec_price_cache(market_type);
CREATE INDEX IF NOT EXISTS idx_rec_price_cache_region ON rec_price_cache(region);

-- Note: We're already using the carbon_offsets table for carbon pricing data