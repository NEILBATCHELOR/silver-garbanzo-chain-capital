-- Create regulatory exemptions table for Chain Capital
-- Contains regulatory issuance status exemptions by region and country

CREATE TABLE public.regulatory_exemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  region text NOT NULL,
  country text NOT NULL,
  exemption_type text NOT NULL,
  explanation text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT regulatory_exemptions_pkey PRIMARY KEY (id),
  CONSTRAINT regulatory_exemptions_region_check CHECK (
    region IN ('Americas', 'Europe', 'Asia-Pacific')
  ),
  CONSTRAINT unique_region_country_exemption_type UNIQUE (region, country, exemption_type)
);

-- Create indexes for efficient querying
CREATE INDEX idx_regulatory_exemptions_region ON public.regulatory_exemptions(region);
CREATE INDEX idx_regulatory_exemptions_country ON public.regulatory_exemptions(country);
CREATE INDEX idx_regulatory_exemptions_exemption_type ON public.regulatory_exemptions(exemption_type);

-- Add RLS policies
ALTER TABLE public.regulatory_exemptions ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to regulatory exemptions"
  ON public.regulatory_exemptions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow insert/update/delete for users with appropriate permissions
CREATE POLICY "Allow write access to regulatory exemptions for authorized users"
  ON public.regulatory_exemptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uor
      JOIN role_permissions rp ON uor.role_id = rp.role_id
      WHERE uor.user_id = auth.uid()
      AND rp.permission_name IN ('manage_regulatory_data', 'admin_access')
    )
  );

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_regulatory_exemptions_updated_at
    BEFORE UPDATE ON public.regulatory_exemptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert the regulatory exemption data
INSERT INTO public.regulatory_exemptions (region, country, exemption_type, explanation) VALUES
-- Americas
('Americas', 'US', 'Regulation D (Rule 506(b))', 'Allows private offerings to unlimited accredited investors and up to 35 non-accredited without general solicitation, exempting from SEC registration for domestic sales.'),
('Americas', 'US', 'Regulation D (Rule 506(c))', 'Permits general solicitation in private offerings but requires verification of accredited investor status, exempting from registration for US-based raises.'),
('Americas', 'US', 'Regulation S', 'Exempts offshore offerings from SEC registration if no directed selling efforts in the US and sales are to non-US persons.'),
('Americas', 'Canada', 'Accredited Investor Exemption (NI 45-106)', 'Allows sales to accredited investors (high net worth or institutional) without prospectus, for private capital raising.'),
('Americas', 'Canada', 'Private Issuer Exemption (NI 45-106 s.2.4)', 'Exempts distributions by private issuers to a limited group (e.g., founders, family) without prospectus if no commissions paid.'),
('Americas', 'Canada', 'Minimum Amount Exemption (NI 45-106)', 'Permits sales without prospectus if each purchaser invests at least CAD150,000 in cash.'),
('Americas', 'Canada', 'Family, Friends and Business Associates Exemption (NI 45-106)', 'Exempts offerings to close personal or business relations without prospectus for small-scale raises.'),
('Americas', 'Canada', 'Offering Memorandum Exemption (NI 45-106)', 'Allows broader distributions with a prescribed offering memorandum disclosing risks and financials, exempt from full prospectus.'),
('Americas', 'Canada', 'Listed Issuer Financing Exemption (LIFE)', 'Enables listed issuers with disclosure records to raise equity efficiently without prospectus for up to CAD10 million annually.'),
('Americas', 'Brazil', 'Restricted Offerings Exemption (CVM Resolution 160)', 'Exempts offerings targeted exclusively at professional investors (e.g., institutions) from registration, with transfer restrictions.'),
('Americas', 'Brazil', 'Private Placement (General)', 'Allows non-public offerings without organized market, but limited by broad public offering definition requiring no mass solicitation.'),

-- Europe
('Europe', 'EU', 'Qualified Investors Exemption (Prospectus Regulation)', 'Exempts offers solely to qualified investors (e.g., institutions, high net worth) from prospectus requirement for private placements.'),
('Europe', 'EU', 'Fewer than 150 Persons Exemption (Prospectus Regulation)', 'Allows offers to fewer than 150 non-qualified natural or legal persons per EU member state without prospectus.'),
('Europe', 'EU', 'High Denomination Exemption (Prospectus Regulation)', 'Exempts securities with denomination of at least €100,000 per unit from prospectus for wholesale markets.'),
('Europe', 'EU', 'Small Offers Exemption (Prospectus Regulation)', 'Permits offers with total consideration under €8 million over 12 months without prospectus, varying by member state thresholds.'),
('Europe', 'UK', 'Qualified Investors Exemption (FSMA)', 'Similar to EU, exempts offers to professional investors from financial promotion restrictions for private raises.'),
('Europe', 'UK', 'High Net Worth Individuals Exemption (FSMA)', 'Allows communications to certified high net worth individuals (income/net assets thresholds) without approval.'),
('Europe', 'UK', 'Sophisticated Investors Exemption (FSMA)', 'Exempts offers to self-certified sophisticated investors experienced in unlisted companies.'),

-- Asia-Pacific
('Asia-Pacific', 'China', 'Categorized Shares Exemption (Securities Law)', 'Permits issuance of B-shares to foreigners or H-shares in Hong Kong with CSRC approval, for controlled foreign capital access.'),
('Asia-Pacific', 'Singapore', 'Private Placement Exemption (SFA s.272B)', 'Exempts offers to no more than 50 persons in 12 months without prospectus if no advertising.'),
('Asia-Pacific', 'Singapore', 'Small Offers Exemption (SFA s.272A)', 'Allows personal offers up to SGD5 million in 12 months without prospectus, aggregated across series.'),
('Asia-Pacific', 'Singapore', 'Accredited Investor Exemption (SFA)', 'Exempts offers to accredited investors (high net worth/institutions) from prospectus for sophisticated buyers.'),
('Asia-Pacific', 'India', 'Private Placement (Companies Act s.42)', 'Permits issuances to up to 200 persons (excluding QIBs/employees) via offer letter, without public ads.'),
('Asia-Pacific', 'Japan', 'Private Placement for QIIs (FIEA)', 'Exempts offerings to Qualified Institutional Investors (professionals) from disclosure if transfer restricted.'),
('Asia-Pacific', 'Japan', 'Small Number Private Placement (FIEA)', 'Allows offers to fewer than 50 non-QII offerees without disclosure, with resale restrictions.'),
('Asia-Pacific', 'Japan', 'Private Placement for Professionals (FIEA)', 'Exempts fund management/offers to professionals without full registration, under simplified notification.'),
('Asia-Pacific', 'Australia', 'Sophisticated Investors Exemption (Corporations Act)', 'Exempts offers to experienced investors (net assets/income thresholds) without disclosure document.'),
('Asia-Pacific', 'Australia', 'Professional Investors Exemption (Corporations Act)', 'Allows sales to wholesale clients (institutions/large entities) without regulated disclosure.'),
('Asia-Pacific', 'Australia', 'Minimum Amount Exemption (Corporations Act)', 'Exempts offers where at least AUD500,000 is payable per investor without disclosure.'),
('Asia-Pacific', 'Australia', 'Small Scale Offerings Exemption (Corporations Act)', 'Permits raises up to AUD2 million from up to 20 investors in 12 months without disclosure.');

-- Grant appropriate permissions
GRANT SELECT ON public.regulatory_exemptions TO authenticated;
GRANT ALL ON public.regulatory_exemptions TO service_role;
