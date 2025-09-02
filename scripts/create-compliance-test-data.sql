-- Comprehensive Test Data for Compliance Upload Testing
-- Created: August 10, 2025
-- Purpose: Create diverse test investors and issuers for compliance upload functionality

BEGIN;

-- Insert comprehensive test investors covering all profile types
INSERT INTO investors (
    name, email, type, wallet_address, kyc_status, company, notes, 
    investor_status, investor_type, onboarding_completed, 
    accreditation_status, accreditation_type, tax_residency, tax_id_number,
    verification_details, risk_assessment, profile_data, investment_preferences,
    kyc_expiry_date, accreditation_expiry_date, last_compliance_check
) VALUES 
-- High Net Worth Individual Investors (US)
('John Richardson Smith', 'john.smith@wealthfund.com', 'individual', '0x1234567890123456789012345678901234567890', 'approved', NULL, 'High net worth individual, technology executive', 'active', 'individual', true, 'approved', 'high_net_worth', 'United States', '123-45-6789',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed"}',
 '{"risk_score": 2, "risk_level": "low", "assessment_date": "2024-12-01", "factors": ["stable_income", "clean_background", "us_person"]}',
 '{"age": 45, "occupation": "CTO", "annual_income": 850000, "net_worth": 5200000, "investment_experience": "experienced", "education": "MBA", "source_of_wealth": "technology_equity"}',
 '{"sectors": ["technology", "healthcare"], "risk_tolerance": "moderate", "investment_horizon": "long_term", "liquidity_needs": "low"}',
 '2025-12-01 00:00:00+00', '2025-10-15 00:00:00+00', '2024-12-01 10:30:00+00'),

('Sarah Elizabeth Chen', 'sarah.chen@chenventures.com', 'individual', '0x2345678901234567890123456789012345678901', 'approved', 'Chen Ventures LLC', 'Angel investor and serial entrepreneur', 'active', 'individual', true, 'approved', 'qualified_purchaser', 'United States', '234-56-7890',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed"}',
 '{"risk_score": 3, "risk_level": "moderate", "assessment_date": "2024-11-15", "factors": ["entrepreneur", "diversified_portfolio", "venture_capital"]}',
 '{"age": 38, "occupation": "Venture Capitalist", "annual_income": 1200000, "net_worth": 15000000, "investment_experience": "expert", "education": "Stanford MBA", "source_of_wealth": "business_sale"}',
 '{"sectors": ["fintech", "ai", "biotech"], "risk_tolerance": "high", "investment_horizon": "medium_term", "liquidity_needs": "moderate"}',
 '2025-11-15 00:00:00+00', '2025-09-01 00:00:00+00', '2024-11-15 14:20:00+00'),

-- International Investors
('Hans Mueller', 'hans.mueller@deutsche-invest.de', 'individual', '0x3456789012345678901234567890123456789012', 'approved', NULL, 'German institutional investor representative', 'active', 'individual', true, 'approved', 'institutional', 'Germany', 'DE123456789',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "sanctions_check": "clear"}',
 '{"risk_score": 2, "risk_level": "low", "assessment_date": "2024-10-20", "factors": ["institutional_backing", "regulated_entity", "eu_person"]}',
 '{"age": 52, "occupation": "Fund Manager", "annual_income": 350000, "net_worth": 2800000, "investment_experience": "expert", "education": "German CFA", "source_of_wealth": "institutional_salary"}',
 '{"sectors": ["real_estate", "infrastructure", "private_debt"], "risk_tolerance": "conservative", "investment_horizon": "long_term", "liquidity_needs": "low"}',
 '2025-10-20 00:00:00+00', '2025-08-10 00:00:00+00', '2024-10-20 09:15:00+00'),

('Akiko Tanaka', 'akiko.tanaka@nippon-capital.jp', 'individual', '0x4567890123456789012345678901234567890123', 'pending', 'Nippon Capital Management', 'Japanese pension fund representative', 'pending_review', 'individual', false, 'in_progress', 'institutional', 'Japan', 'JP987654321',
 '{"identity_verified": true, "address_verified": false, "income_verified": true, "background_check": "in_progress"}',
 '{"risk_score": 1, "risk_level": "very_low", "assessment_date": "2025-01-15", "factors": ["pension_fund", "regulated_entity", "conservative_mandate"]}',
 '{"age": 48, "occupation": "Portfolio Manager", "annual_income": 280000, "net_worth": 1500000, "investment_experience": "expert", "education": "Tokyo University", "source_of_wealth": "institutional_role"}',
 '{"sectors": ["government_bonds", "infrastructure", "real_estate"], "risk_tolerance": "very_conservative", "investment_horizon": "very_long_term", "liquidity_needs": "very_low"}',
 '2026-01-15 00:00:00+00', '2025-12-01 00:00:00+00', '2025-01-15 16:45:00+00'),

-- Corporate/Institutional Investors
('Margaret Foster-Williams', 'margaret.foster@pension-trustees.co.uk', 'institutional', '0x5678901234567890123456789012345678901234', 'approved', 'UK Teachers Pension Scheme', 'Trustee representing £50B pension fund', 'active', 'institutional', true, 'approved', 'qualified_institutional_buyer', 'United Kingdom', 'GB123456789',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "institution_verified": true}',
 '{"risk_score": 1, "risk_level": "very_low", "assessment_date": "2024-09-10", "factors": ["pension_fund", "fiduciary_duty", "long_term_mandate"]}',
 '{"occupation": "Pension Trustee", "institution_aum": 50000000000, "investment_authority": 500000000, "investment_experience": "expert", "regulatory_status": "fca_regulated"}',
 '{"sectors": ["infrastructure", "real_estate", "private_debt", "renewable_energy"], "risk_tolerance": "conservative", "investment_horizon": "very_long_term", "liquidity_needs": "very_low", "esg_requirements": true}',
 '2025-09-10 00:00:00+00', '2025-07-01 00:00:00+00', '2024-09-10 11:30:00+00'),

-- Family Office Representatives
('Charles Worthington III', 'charles@worthington-office.com', 'family_office', '0x6789012345678901234567890123456789012345', 'approved', 'Worthington Family Office', 'Multi-generational family office, $2B AUM', 'active', 'family_office', true, 'approved', 'qualified_purchaser', 'United States', '345-67-8901',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "family_office_verified": true}',
 '{"risk_score": 3, "risk_level": "moderate", "assessment_date": "2024-08-25", "factors": ["family_office", "diversified_strategies", "long_term_horizon"]}',
 '{"occupation": "Family Office CIO", "family_aum": 2000000000, "investment_authority": 100000000, "investment_experience": "expert", "generations_represented": 3}',
 '{"sectors": ["private_equity", "hedge_funds", "real_estate", "venture_capital", "art"], "risk_tolerance": "moderate_aggressive", "investment_horizon": "long_term", "liquidity_needs": "moderate"}',
 '2025-08-25 00:00:00+00', '2025-06-15 00:00:00+00', '2024-08-25 13:20:00+00'),

-- Sovereign Wealth Fund Representative
('Abdullah Al-Rashid', 'abdullah.rashid@swf-emirates.ae', 'sovereign', '0x7890123456789012345678901234567890123456', 'approved', 'Emirates Strategic Investment Fund', 'Sovereign wealth fund representative', 'active', 'sovereign', true, 'approved', 'qualified_institutional_buyer', 'United Arab Emirates', 'AE789123456',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "sovereign_entity_verified": true}',
 '{"risk_score": 2, "risk_level": "low", "assessment_date": "2024-07-10", "factors": ["sovereign_fund", "strategic_mandate", "government_backing"]}',
 '{"occupation": "Deputy Portfolio Manager", "fund_aum": 75000000000, "investment_authority": 1000000000, "investment_experience": "expert", "sovereign_mandate": true}',
 '{"sectors": ["infrastructure", "technology", "healthcare", "renewable_energy"], "risk_tolerance": "moderate", "investment_horizon": "very_long_term", "liquidity_needs": "low", "strategic_investments": true}',
 '2025-07-10 00:00:00+00', '2025-05-01 00:00:00+00', '2024-07-10 08:45:00+00'),

-- Retail/Smaller Investors
('Jennifer Morrison', 'jennifer.morrison@email.com', 'individual', '0x8901234567890123456789012345678901234567', 'pending', NULL, 'Retail investor, first-time participant', 'pending_review', 'individual', false, 'in_progress', 'accredited_investor', 'Canada', 'CA123456789',
 '{"identity_verified": true, "address_verified": false, "income_verified": false, "background_check": "pending"}',
 '{"risk_score": 4, "risk_level": "moderate_high", "assessment_date": "2025-02-01", "factors": ["first_time_investor", "limited_experience", "moderate_income"]}',
 '{"age": 34, "occupation": "Software Engineer", "annual_income": 125000, "net_worth": 350000, "investment_experience": "limited", "education": "Computer Science Degree"}',
 '{"sectors": ["technology", "etfs"], "risk_tolerance": "moderate", "investment_horizon": "medium_term", "liquidity_needs": "moderate"}',
 '2026-02-01 00:00:00+00', '2025-11-15 00:00:00+00', '2025-02-01 10:00:00+00'),

-- Corporate Treasury Representatives  
('David Kim', 'david.kim@techcorp-treasury.com', 'corporate', '0x9012345678901234567890123456789012345678', 'approved', 'TechCorp International Ltd', 'Corporate treasury managing surplus cash', 'active', 'corporate', true, 'approved', 'qualified_institutional_buyer', 'Singapore', 'SG456789123',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "corporate_verified": true}',
 '{"risk_score": 2, "risk_level": "low", "assessment_date": "2024-06-15", "factors": ["corporate_treasury", "conservative_mandate", "regulated_entity"]}',
 '{"occupation": "Corporate Treasurer", "corporate_aum": 500000000, "investment_authority": 50000000, "investment_experience": "experienced", "fiduciary_duty": true}',
 '{"sectors": ["money_market", "short_term_bonds", "stable_value"], "risk_tolerance": "conservative", "investment_horizon": "short_term", "liquidity_needs": "high"}',
 '2025-06-15 00:00:00+00', '2025-04-01 00:00:00+00', '2024-06-15 15:30:00+00'),

-- Insurance Company Representative
('Dr. Elena Rodriguez', 'elena.rodriguez@seguros-mundial.es', 'insurance', '0xa123456789012345678901234567890123456789', 'approved', 'Seguros Mundial SA', 'Insurance company investment committee member', 'active', 'insurance', true, 'approved', 'qualified_institutional_buyer', 'Spain', 'ES321654987',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "insurance_license_verified": true}',
 '{"risk_score": 1, "risk_level": "very_low", "assessment_date": "2024-05-20", "factors": ["insurance_company", "regulatory_compliance", "liability_matching"]}',
 '{"occupation": "Chief Investment Officer", "insurance_reserves": 2500000000, "investment_authority": 250000000, "investment_experience": "expert", "regulatory_capital_requirements": true}',
 '{"sectors": ["government_bonds", "corporate_bonds", "real_estate", "infrastructure"], "risk_tolerance": "very_conservative", "investment_horizon": "long_term", "liquidity_needs": "low", "liability_matching": true}',
 '2025-05-20 00:00:00+00', '2025-03-10 00:00:00+00', '2024-05-20 12:15:00+00'),

-- Endowment Fund Representative
('Professor Michael Thompson', 'michael.thompson@university-endowment.edu', 'endowment', '0xb234567890123456789012345678901234567890', 'approved', 'Metropolitan University Endowment', 'University endowment fund manager', 'active', 'endowment', true, 'approved', 'qualified_institutional_buyer', 'United States', '456-78-9012',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "institutional_verification": true}',
 '{"risk_score": 3, "risk_level": "moderate", "assessment_date": "2024-04-15", "factors": ["endowment_fund", "perpetual_mandate", "spending_requirements"]}',
 '{"occupation": "Endowment CIO", "endowment_size": 850000000, "investment_authority": 85000000, "investment_experience": "expert", "spending_policy": 0.045}',
 '{"sectors": ["private_equity", "hedge_funds", "real_estate", "natural_resources", "international_equity"], "risk_tolerance": "moderate_aggressive", "investment_horizon": "perpetual", "liquidity_needs": "moderate"}',
 '2025-04-15 00:00:00+00', '2025-02-01 00:00:00+00', '2024-04-15 14:45:00+00'),

-- Foundation Representative
('Ms. Patricia Goldberg', 'patricia@goldberg-foundation.org', 'foundation', '0xc345678901234567890123456789012345678901', 'approved', 'Goldberg Philanthropic Foundation', 'Private foundation focused on healthcare research', 'active', 'foundation', true, 'approved', 'qualified_institutional_buyer', 'United States', '567-89-0123',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "foundation_status_verified": true}',
 '{"risk_score": 2, "risk_level": "low", "assessment_date": "2024-03-10", "factors": ["private_foundation", "philanthropic_mission", "perpetual_existence"]}',
 '{"occupation": "Foundation Investment Director", "foundation_assets": 150000000, "investment_authority": 15000000, "investment_experience": "expert", "grant_making_requirements": 0.05}',
 '{"sectors": ["healthcare", "biotechnology", "esg_investments", "impact_investing"], "risk_tolerance": "conservative_moderate", "investment_horizon": "long_term", "liquidity_needs": "moderate", "impact_requirements": true}',
 '2025-03-10 00:00:00+00', '2025-01-15 00:00:00+00', '2024-03-10 11:00:00+00'),

-- High Risk/Complex Cases
('Viktor Petrov', 'viktor.petrov@offshore-capital.cy', 'individual', '0xd456789012345678901234567890123456789012', 'failed', 'Offshore Capital Management', 'Complex offshore structure, failed initial screening', 'rejected', 'individual', false, 'rejected', 'not_applicable', 'Cyprus', 'CY789456123',
 '{"identity_verified": false, "address_verified": false, "income_verified": false, "background_check": "failed", "sanctions_check": "flagged"}',
 '{"risk_score": 8, "risk_level": "high", "assessment_date": "2025-01-20", "factors": ["offshore_structure", "sanctions_concerns", "documentation_issues"]}',
 '{"age": 45, "occupation": "Investment Manager", "annual_income": 0, "net_worth": 0, "investment_experience": "unknown", "source_of_wealth": "unclear"}',
 '{"sectors": [], "risk_tolerance": "unknown", "investment_horizon": "unknown", "liquidity_needs": "unknown"}',
 NULL, NULL, '2025-01-20 09:30:00+00'),

-- Pending/In-Progress Cases
('Lisa Chang Wang', 'lisa.wang@emerging-markets.com', 'individual', '0xe567890123456789012345678901234567890123', 'pending', 'Emerging Markets Asia Fund', 'Documentation review in progress', 'pending_documentation', 'individual', false, 'in_progress', 'accredited_investor', 'Hong Kong', 'HK654321987',
 '{"identity_verified": true, "address_verified": true, "income_verified": false, "background_check": "in_progress"}',
 '{"risk_score": 5, "risk_level": "moderate", "assessment_date": "2025-02-10", "factors": ["emerging_markets", "documentation_pending", "new_client"]}',
 '{"age": 41, "occupation": "Fund Manager", "annual_income": 450000, "net_worth": 2200000, "investment_experience": "experienced", "education": "CFA Charter"}',
 '{"sectors": ["emerging_markets", "asia_pacific", "private_equity"], "risk_tolerance": "aggressive", "investment_horizon": "medium_term", "liquidity_needs": "moderate"}',
 '2026-02-10 00:00:00+00', '2025-12-01 00:00:00+00', '2025-02-10 13:15:00+00'),

-- Special Categories
('Rabbi Jacob Goldman', 'jacob@temple-endowment.org', 'religious_institution', '0xf678901234567890123456789012345678901234', 'approved', 'Temple Beth Shalom Endowment', 'Religious institution endowment fund', 'active', 'religious_institution', true, 'approved', 'qualified_institutional_buyer', 'United States', '678-90-1234',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "religious_institution_verified": true}',
 '{"risk_score": 1, "risk_level": "very_low", "assessment_date": "2024-02-15", "factors": ["religious_institution", "community_mandate", "conservative_approach"]}',
 '{"occupation": "Endowment Board Chair", "endowment_size": 25000000, "investment_authority": 2500000, "investment_experience": "experienced", "religious_guidelines": true}',
 '{"sectors": ["esg_investments", "socially_responsible", "bonds"], "risk_tolerance": "conservative", "investment_horizon": "long_term", "liquidity_needs": "low", "ethical_requirements": true}',
 '2025-02-15 00:00:00+00', '2024-12-01 00:00:00+00', '2024-02-15 16:20:00+00'),

-- Government Entity Representative
('Director Maria Santos', 'maria.santos@treasury.gov.br', 'government', '0x0123456789012345678901234567890123456789', 'approved', 'Brazilian National Treasury', 'Government treasury investment division', 'active', 'government', true, 'approved', 'sovereign_entity', 'Brazil', 'BR456123789',
 '{"identity_verified": true, "address_verified": true, "income_verified": true, "background_check": "passed", "government_entity_verified": true}',
 '{"risk_score": 1, "risk_level": "very_low", "assessment_date": "2024-01-10", "factors": ["government_entity", "sovereign_immunity", "public_mandate"]}',
 '{"occupation": "Treasury Investment Director", "government_reserves": 5000000000, "investment_authority": 500000000, "investment_experience": "expert", "public_accountability": true}',
 '{"sectors": ["government_securities", "infrastructure", "development_finance"], "risk_tolerance": "very_conservative", "investment_horizon": "long_term", "liquidity_needs": "low", "public_benefit": true}',
 '2025-01-10 00:00:00+00', '2024-11-15 00:00:00+00', '2024-01-10 10:45:00+00');

-- Insert comprehensive test organizations/issuers
INSERT INTO organizations (
    name, legal_name, registration_number, registration_date, tax_id, 
    jurisdiction, business_type, status, contact_email, contact_phone, website,
    address, legal_representatives, compliance_status, onboarding_completed
) VALUES 
-- Technology Companies
('TechnoFin Solutions Inc.', 'TechnoFin Solutions Incorporated', 'DE-2024-8765432', '2019-03-15 00:00:00+00', '83-1234567', 'Delaware', 'technology', 'active', 'legal@technofin.com', '+1-555-0123', 'https://www.technofin.com',
 '{"street": "1200 Innovation Drive", "city": "San Francisco", "state": "California", "zip": "94105", "country": "United States"}',
 '{"ceo": {"name": "Sarah Chen", "title": "Chief Executive Officer", "email": "sarah.chen@technofin.com"}, "cfo": {"name": "Michael Rodriguez", "title": "Chief Financial Officer", "email": "michael.rodriguez@technofin.com"}, "legal_counsel": {"name": "Jennifer Park", "title": "General Counsel", "email": "jennifer.park@technofin.com"}}',
 'approved', true),

-- Healthcare/Biotech
('BioMedical Innovations Corp', 'BioMedical Innovations Corporation', 'DE-2021-5432109', '2021-07-22 00:00:00+00', '84-2345678', 'Delaware', 'biotechnology', 'pending_review', 'compliance@biomed-innovations.com', '+1-555-0234', 'https://www.biomed-innovations.com',
 '{"street": "450 Research Parkway", "city": "Boston", "state": "Massachusetts", "zip": "02215", "country": "United States"}',
 '{"ceo": {"name": "Dr. Robert Williams", "title": "Chief Executive Officer", "email": "robert.williams@biomed-innovations.com"}, "cso": {"name": "Dr. Lisa Thompson", "title": "Chief Scientific Officer", "email": "lisa.thompson@biomed-innovations.com"}, "regulatory": {"name": "Amanda Foster", "title": "VP Regulatory Affairs", "email": "amanda.foster@biomed-innovations.com"}}',
 'pending_review', false),

-- Real Estate Investment Trust
('Metropolitan Property REIT', 'Metropolitan Property Real Estate Investment Trust', 'MD-2018-9876543', '2018-11-08 00:00:00+00', '85-3456789', 'Maryland', 'real_estate_investment_trust', 'active', 'investors@metro-reit.com', '+1-555-0345', 'https://www.metro-reit.com',
 '{"street": "800 Commerce Street", "city": "Baltimore", "state": "Maryland", "zip": "21202", "country": "United States"}',
 '{"ceo": {"name": "James Morrison", "title": "Chief Executive Officer", "email": "james.morrison@metro-reit.com"}, "president": {"name": "Patricia Davis", "title": "President", "email": "patricia.davis@metro-reit.com"}, "trustees": [{"name": "Charles Baker", "title": "Chairman of Trustees", "email": "charles.baker@metro-reit.com"}]}',
 'approved', true),

-- Renewable Energy Infrastructure
('GreenEnergy Infrastructure Ltd', 'GreenEnergy Infrastructure Limited', 'UK-12345678', '2020-04-12 00:00:00+00', 'GB123456789', 'United Kingdom', 'renewable_energy', 'active', 'corporate@greenenergy-infra.co.uk', '+44-20-7123-4567', 'https://www.greenenergy-infra.co.uk',
 '{"street": "25 Canary Wharf", "city": "London", "zip": "E14 5AB", "country": "United Kingdom"}',
 '{"ceo": {"name": "Oliver Henderson", "title": "Chief Executive Officer", "email": "oliver.henderson@greenenergy-infra.co.uk"}, "cfo": {"name": "Emma Richardson", "title": "Chief Financial Officer", "email": "emma.richardson@greenenergy-infra.co.uk"}, "technical": {"name": "Dr. Ian Stewart", "title": "Chief Technology Officer", "email": "ian.stewart@greenenergy-infra.co.uk"}}',
 'approved', true),

-- Financial Services (Alternative Investment Manager)
('Quantum Asset Management LLP', 'Quantum Asset Management Limited Liability Partnership', 'NY-2017-4567890', '2017-09-30 00:00:00+00', '86-4567890', 'New York', 'investment_management', 'active', 'compliance@quantum-assets.com', '+1-555-0456', 'https://www.quantum-assets.com',
 '{"street": "200 West Street", "city": "New York", "state": "New York", "zip": "10282", "country": "United States"}',
 '{"managing_partner": {"name": "David Kim", "title": "Managing Partner", "email": "david.kim@quantum-assets.com"}, "cio": {"name": "Dr. Elena Rodriguez", "title": "Chief Investment Officer", "email": "elena.rodriguez@quantum-assets.com"}, "compliance": {"name": "Michael Johnson", "title": "Chief Compliance Officer", "email": "michael.johnson@quantum-assets.com"}}',
 'approved', true),

-- Private Credit Fund
('Capital Credit Partners Fund I', 'Capital Credit Partners Fund I, L.P.', 'DE-2022-1357924', '2022-02-14 00:00:00+00', '87-5678901', 'Delaware', 'private_fund', 'active', 'operations@capital-credit.com', '+1-555-0567', 'https://www.capital-credit.com',
 '{"street": "600 Fifth Avenue", "city": "New York", "state": "New York", "zip": "10020", "country": "United States"}',
 '{"general_partner": {"name": "Thomas Anderson", "title": "General Partner", "email": "thomas.anderson@capital-credit.com"}, "investment_committee": [{"name": "Rachel Green", "title": "Managing Director", "email": "rachel.green@capital-credit.com"}, {"name": "Mark Stevens", "title": "Senior Partner", "email": "mark.stevens@capital-credit.com"}]}',
 'approved', true),

-- European Asset Manager
('Alpine Investment Management AG', 'Alpine Investment Management Aktiengesellschaft', 'CH-2019-2468135', '2019-06-18 00:00:00+00', 'CHE-123456789', 'Switzerland', 'asset_management', 'active', 'legal@alpine-im.ch', '+41-44-123-4567', 'https://www.alpine-im.ch',
 '{"street": "Bahnhofstrasse 45", "city": "Zurich", "zip": "8001", "country": "Switzerland"}',
 '{"ceo": {"name": "Hans Weber", "title": "Chief Executive Officer", "email": "hans.weber@alpine-im.ch"}, "cro": {"name": "Claudia Mueller", "title": "Chief Risk Officer", "email": "claudia.mueller@alpine-im.ch"}, "compliance": {"name": "Andreas Zimmermann", "title": "Head of Compliance", "email": "andreas.zimmermann@alpine-im.ch"}}',
 'approved', true),

-- Asian Investment Company
('Pacific Rim Investments Pte Ltd', 'Pacific Rim Investments Private Limited', 'SG-2020-9876543', '2020-10-25 00:00:00+00', 'SG123456789C', 'Singapore', 'investment_company', 'pending_review', 'regulatory@pacific-rim.com.sg', '+65-6123-4567', 'https://www.pacific-rim.com.sg',
 '{"street": "1 Raffles Place", "city": "Singapore", "zip": "048616", "country": "Singapore"}',
 '{"ceo": {"name": "Li Wei Chen", "title": "Chief Executive Officer", "email": "li.chen@pacific-rim.com.sg"}, "cio": {"name": "Priya Sharma", "title": "Chief Investment Officer", "email": "priya.sharma@pacific-rim.com.sg"}, "compliance": {"name": "Tan Wei Ming", "title": "Compliance Director", "email": "wei.tan@pacific-rim.com.sg"}}',
 'pending_review', false),

-- Infrastructure Fund
('Global Infrastructure Partners II', 'Global Infrastructure Partners II, L.P.', 'DE-2023-1122334', '2023-01-12 00:00:00+00', '88-6789012', 'Delaware', 'infrastructure_fund', 'active', 'investor.relations@global-infra.com', '+1-555-0678', 'https://www.global-infra.com',
 '{"street": "345 Park Avenue", "city": "New York", "state": "New York", "zip": "10154", "country": "United States"}',
 '{"managing_partner": {"name": "Catherine Williams", "title": "Managing Partner", "email": "catherine.williams@global-infra.com"}, "investment_team": [{"name": "Roberto Silva", "title": "Principal", "email": "roberto.silva@global-infra.com"}, {"name": "Jennifer Chang", "title": "Vice President", "email": "jennifer.chang@global-infra.com"}]}',
 'approved', true),

-- Commodities Trading Company
('Atlantic Commodities Trading Ltd', 'Atlantic Commodities Trading Limited', 'UK-87654321', '2016-12-03 00:00:00+00', 'GB987654321', 'United Kingdom', 'commodities_trading', 'active', 'compliance@atlantic-commodities.com', '+44-20-8765-4321', 'https://www.atlantic-commodities.com',
 '{"street": "100 Bishopsgate", "city": "London", "zip": "EC2N 4EX", "country": "United Kingdom"}',
 '{"ceo": {"name": "Alexander Thomson", "title": "Chief Executive Officer", "email": "alexander.thomson@atlantic-commodities.com"}, "head_trading": {"name": "Sophie Davis", "title": "Head of Trading", "email": "sophie.davis@atlantic-commodities.com"}, "risk": {"name": "James Wright", "title": "Chief Risk Officer", "email": "james.wright@atlantic-commodities.com"}}',
 'approved', true),

-- Special Purpose Vehicle
('Healthcare Real Estate SPV I', 'Healthcare Real Estate Special Purpose Vehicle I, LLC', 'DE-2024-5555555', '2024-03-20 00:00:00+00', '89-7890123', 'Delaware', 'special_purpose_vehicle', 'pending_review', 'legal@healthcare-re-spv.com', '+1-555-0789', NULL,
 '{"street": "c/o Corporation Service Company", "city": "Wilmington", "state": "Delaware", "zip": "19801", "country": "United States"}',
 '{"manager": {"name": "Healthcare REIT Management LLC", "title": "Managing Member", "email": "manager@healthcare-re-spv.com"}, "sponsor": {"name": "National Healthcare Properties", "title": "Sponsor", "email": "sponsor@healthcare-re-spv.com"}}',
 'pending_review', false),

-- Structured Product Issuer
('Structured Finance Solutions SA', 'Structured Finance Solutions Société Anonyme', 'LU-2021-7777777', '2021-08-14 00:00:00+00', 'LU12345678', 'Luxembourg', 'structured_products', 'active', 'operations@structured-finance.lu', '+352-26-12-34-56', 'https://www.structured-finance.lu',
 '{"street": "12 Rue Eugène Ruppert", "city": "Luxembourg", "zip": "L-2453", "country": "Luxembourg"}',
 '{"ceo": {"name": "Marie Dubois", "title": "Chief Executive Officer", "email": "marie.dubois@structured-finance.lu"}, "structuring": {"name": "Klaus Weber", "title": "Head of Structuring", "email": "klaus.weber@structured-finance.lu"}, "operations": {"name": "Laura Rossi", "title": "Chief Operating Officer", "email": "laura.rossi@structured-finance.lu"}}',
 'approved', true);

COMMIT;
