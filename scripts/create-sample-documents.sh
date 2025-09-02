#!/bin/bash

# Sample Document Generation Script for Compliance Upload Testing
# Created: August 10, 2025
# Purpose: Generate sample documents for testing investor and issuer upload functionality

# Create base directories
mkdir -p "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/test-data/compliance-upload/investor-documents"
mkdir -p "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/test-data/compliance-upload/issuer-documents"

BASE_DIR="/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/test-data/compliance-upload"

echo "Creating sample investor documents..."

# INVESTOR DOCUMENTS

# Passport Documents
cat > "$BASE_DIR/investor-documents/hans_mueller_passport.pdf" << 'EOF'
SAMPLE PASSPORT DOCUMENT

Document Type: Passport
Entity: Hans Mueller
Document ID: PASSPORT-DE-123456789
Issue Date: 2019-03-20
Expiry Date: 2029-03-20
Country: Germany
Place of Birth: Frankfurt, Germany

[This would contain passport details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

cat > "$BASE_DIR/investor-documents/akiko_tanaka_passport.pdf" << 'EOF'
SAMPLE PASSPORT DOCUMENT

Document Type: Passport
Entity: Akiko Tanaka
Document ID: PASSPORT-JP-987654321
Issue Date: 2021-07-15
Expiry Date: 2031-07-15
Country: Japan
Place of Birth: Tokyo, Japan

[This would contain passport details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# National ID Documents
cat > "$BASE_DIR/investor-documents/margaret_foster_national_id.pdf" << 'EOF'
SAMPLE NATIONAL ID DOCUMENT

Document Type: National ID Card
Entity: Margaret Foster-Williams
ID Number: UK-123456789
Issue Date: 2020-11-05
Expiry Date: 2030-11-05
Country: United Kingdom
Address: London, UK

[This would contain national ID details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Proof of Address Documents
cat > "$BASE_DIR/investor-documents/charles_worthington_proof_of_address.pdf" << 'EOF'
SAMPLE PROOF OF ADDRESS

Document Type: Utility Bill
Entity: Charles Worthington III
Service Provider: Metropolitan Electric Company
Account Number: 123456789
Service Address: 850 Park Avenue, New York, NY 10075
Statement Date: 2025-01-15
Amount Due: $847.32

[This would contain utility bill details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

cat > "$BASE_DIR/investor-documents/abdullah_alrashid_proof_of_address.pdf" << 'EOF'
SAMPLE PROOF OF ADDRESS

Document Type: Bank Statement
Entity: Abdullah Al-Rashid
Bank: Emirates National Bank
Account Number: ****1234
Statement Period: December 2024
Address: Dubai International Financial Centre, UAE

[This would contain bank statement details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Bank Statements
cat > "$BASE_DIR/investor-documents/jennifer_morrison_bank_statement.pdf" << 'EOF'
SAMPLE BANK STATEMENT

Document Type: Bank Statement
Entity: Jennifer Morrison
Bank: Royal Bank of Canada
Account Number: ****5678
Statement Period: January 2025
Balance: CAD $45,672.18
Transactions: [List of transactions would appear here]

[This would contain bank statement details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

cat > "$BASE_DIR/investor-documents/david_kim_bank_statement.pdf" << 'EOF'
SAMPLE BANK STATEMENT

Document Type: Corporate Bank Statement
Entity: TechCorp International Ltd (David Kim, Treasurer)
Bank: DBS Bank Singapore
Account Number: ****9012
Statement Period: January 2025
Balance: SGD $2,456,789.45

[This would contain corporate bank statement details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Investment Agreements
cat > "$BASE_DIR/investor-documents/elena_rodriguez_investment_agreement.pdf" << 'EOF'
SAMPLE INVESTMENT AGREEMENT

Document Type: Investment Management Agreement
Entity: Dr. Elena Rodriguez / Seguros Mundial SA
Agreement Date: 2024-05-20
Investment Authority: EUR 250,000,000
Fund Manager: Internal Investment Committee
Risk Profile: Conservative

[This would contain investment agreement details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Accreditation Letters
cat > "$BASE_DIR/investor-documents/michael_thompson_accreditation_letter.pdf" << 'EOF'
SAMPLE ACCREDITATION LETTER

Document Type: Qualified Institutional Buyer Certification
Entity: Professor Michael Thompson / Metropolitan University Endowment
Certification Date: 2024-04-15
Assets Under Management: USD $850,000,000
Regulatory Status: Qualified Institutional Buyer (QIB)
Certifying Authority: University Board of Trustees

[This would contain accreditation details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

cat > "$BASE_DIR/investor-documents/patricia_goldberg_accreditation_letter.pdf" << 'EOF'
SAMPLE ACCREDITATION LETTER

Document Type: Private Foundation Certification
Entity: Ms. Patricia Goldberg / Goldberg Philanthropic Foundation
Certification Date: 2024-03-10
Foundation Assets: USD $150,000,000
Tax Status: 501(c)(3) Private Foundation
IRS Recognition: Tax-Exempt Status Confirmed

[This would contain accreditation details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Tax Documents
cat > "$BASE_DIR/investor-documents/john_smith_tax_document.pdf" << 'EOF'
SAMPLE TAX DOCUMENT

Document Type: Form W-9 (Request for Taxpayer Identification)
Entity: John Richardson Smith
Tax ID: 123-45-6789
Tax Year: 2024
Filing Status: Individual
Certification: Under penalties of perjury, I certify the information is correct

[This would contain tax document details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

cat > "$BASE_DIR/investor-documents/maria_santos_tax_document.pdf" << 'EOF'
SAMPLE TAX DOCUMENT

Document Type: Foreign Tax Identification
Entity: Director Maria Santos / Brazilian National Treasury
Tax ID: BR456123789
Country: Brazil
Tax Treaty Benefits: Available under US-Brazil Tax Treaty
Entity Type: Government Entity

[This would contain tax document details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

echo "Creating sample issuer documents..."

# ISSUER DOCUMENTS

# Articles of Incorporation
cat > "$BASE_DIR/issuer-documents/technofin_articles_of_incorporation.pdf" << 'EOF'
SAMPLE ARTICLES OF INCORPORATION

Document Type: Articles of Incorporation
Entity: TechnoFin Solutions Inc.
State of Incorporation: Delaware
File Number: DE-2024-8765432
Date of Incorporation: March 15, 2019
Registered Agent: Corporation Service Company
Authorized Shares: 10,000,000 Common Stock

[This would contain articles of incorporation details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

cat > "$BASE_DIR/issuer-documents/biomedical_articles_of_incorporation.pdf" << 'EOF'
SAMPLE ARTICLES OF INCORPORATION

Document Type: Certificate of Incorporation
Entity: BioMedical Innovations Corp
State of Incorporation: Delaware  
File Number: DE-2021-5432109
Date of Incorporation: July 22, 2021
Business Purpose: Biotechnology Research and Development
Authorized Shares: 50,000,000 Common, 5,000,000 Preferred

[This would contain articles of incorporation details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Bylaws
cat > "$BASE_DIR/issuer-documents/metro_reit_bylaws.pdf" << 'EOF'
SAMPLE CORPORATE BYLAWS

Document Type: Corporate Bylaws
Entity: Metropolitan Property REIT
Adoption Date: November 8, 2018
Last Amendment: January 15, 2024
Board Composition: 7 Independent Trustees
Meeting Requirements: Quarterly Board Meetings

[This would contain corporate bylaws details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Operating Agreements
cat > "$BASE_DIR/issuer-documents/greenenergy_operating_agreement.pdf" << 'EOF'
SAMPLE OPERATING AGREEMENT

Document Type: Limited Liability Company Operating Agreement
Entity: GreenEnergy Infrastructure Ltd
Jurisdiction: United Kingdom
Formation Date: April 12, 2020
Management Structure: Member-Managed
Capital Contributions: £50,000,000 Initial Capital

[This would contain operating agreement details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Certificate of Good Standing
cat > "$BASE_DIR/issuer-documents/quantum_asset_good_standing.pdf" << 'EOF'
SAMPLE CERTIFICATE OF GOOD STANDING

Document Type: Certificate of Good Standing
Entity: Quantum Asset Management LLP
Issuing Authority: New York Secretary of State
Issue Date: February 1, 2025
File Number: NY-2017-4567890
Status: Active and in Good Standing
Authorized Business: Investment Management Services

[This would contain certificate details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Financial Statements
cat > "$BASE_DIR/issuer-documents/capital_credit_financial_statements.pdf" << 'EOF'
SAMPLE AUDITED FINANCIAL STATEMENTS

Document Type: Audited Financial Statements
Entity: Capital Credit Partners Fund I, L.P.
Audit Period: Year Ended December 31, 2024
Auditor: PricewaterhouseCoopers LLP
Total Assets: USD $2,850,000,000
Net Asset Value: USD $2,734,000,000
Investment Performance: 12.4% Net IRR

[This would contain financial statements in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

cat > "$BASE_DIR/issuer-documents/alpine_investment_financial_statements.pdf" << 'EOF'
SAMPLE AUDITED FINANCIAL STATEMENTS

Document Type: Annual Financial Report
Entity: Alpine Investment Management AG
Reporting Period: Year Ended December 31, 2024
Auditor: KPMG Switzerland
Assets Under Management: CHF 15,600,000,000
Management Fee Revenue: CHF 156,000,000
Regulatory Capital: CHF 85,000,000

[This would contain financial statements in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Board Resolutions
cat > "$BASE_DIR/issuer-documents/pacific_rim_board_resolution.pdf" << 'EOF'
SAMPLE BOARD RESOLUTION

Document Type: Board Resolution
Entity: Pacific Rim Investments Pte Ltd
Resolution Date: January 20, 2025
Resolution Number: BR-2025-001
Subject: Authorization for Token Issuance Program
Authorized Amount: SGD $500,000,000
Approval Status: Unanimously Approved

[This would contain board resolution details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Legal Opinions
cat > "$BASE_DIR/issuer-documents/global_infrastructure_legal_opinion.pdf" << 'EOF'
SAMPLE LEGAL OPINION

Document Type: Legal Opinion Letter
Entity: Global Infrastructure Partners II, L.P.
Law Firm: Sullivan & Cromwell LLP
Opinion Date: January 12, 2025
Subject: Securities Law Compliance for Token Offering
Conclusion: The proposed offering structure complies with applicable securities regulations

[This would contain legal opinion details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Prospectuses
cat > "$BASE_DIR/issuer-documents/atlantic_commodities_prospectus.pdf" << 'EOF'
SAMPLE OFFERING PROSPECTUS

Document Type: Private Placement Memorandum
Entity: Atlantic Commodities Trading Ltd
Offering Size: GBP £200,000,000
Security Type: Senior Secured Notes
Maturity: 5 Years
Use of Proceeds: Working Capital and Trading Operations
Risk Factors: [Comprehensive risk disclosures would appear here]

[This would contain prospectus details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Regulatory Filings
cat > "$BASE_DIR/issuer-documents/healthcare_spv_regulatory_filing.pdf" << 'EOF'
SAMPLE REGULATORY FILING

Document Type: Form D - Notice of Exempt Offering
Entity: Healthcare Real Estate SPV I, LLC
Filing Date: March 20, 2024
Offering Amount: USD $150,000,000
Exemption Claimed: Rule 506(c)
Investor Type: Accredited Investors Only
General Solicitation: Permitted

[This would contain regulatory filing details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

# Compliance Certificates
cat > "$BASE_DIR/issuer-documents/structured_finance_compliance_certificate.pdf" << 'EOF'
SAMPLE COMPLIANCE CERTIFICATE

Document Type: CSSF Compliance Certificate
Entity: Structured Finance Solutions SA
Regulatory Authority: Commission de Surveillance du Secteur Financier (Luxembourg)
Certificate Number: LU-2024-SF-789
Issue Date: August 14, 2024
Compliance Status: Fully Compliant with AIFMD Regulations
Next Review: August 14, 2025

[This would contain compliance certificate details in a real document]

Status: Test Document - Not Valid for Legal Purposes
EOF

echo "Sample documents created successfully!"
echo "Investor documents: $(ls -1 "$BASE_DIR/investor-documents" | wc -l) files"
echo "Issuer documents: $(ls -1 "$BASE_DIR/issuer-documents" | wc -l) files"
echo ""
echo "Documents are located in:"
echo "$BASE_DIR/investor-documents/"
echo "$BASE_DIR/issuer-documents/"