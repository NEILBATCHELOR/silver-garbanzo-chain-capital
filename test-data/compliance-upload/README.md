# Compliance Upload Test Data - Complete Setup Guide

This directory contains comprehensive test data for testing the Chain Capital compliance upload functionality at:
- http://localhost:5173/compliance/upload/investor 
- http://localhost:5173/compliance/upload/issuer

## Test Data Overview

### 📊 Database Test Data
The SQL script `create-compliance-test-data.sql` contains 17+ test investors and 12+ test issuers with comprehensive data including:

**Investor Types Covered:**
- High Net Worth Individuals (US)
- International Investors (Germany, Japan, UK, UAE, etc.)
- Institutional Investors (Pension Funds, Insurance Companies)
- Family Offices ($2B+ AUM)
- Sovereign Wealth Funds
- Corporate Treasury Representatives
- Endowment Funds
- Private Foundations
- Religious Institutions
- Government Entities
- Retail/First-time Investors
- Failed/Rejected Cases (for negative testing)

**Issuer Types Covered:**
- Technology Companies
- Biotechnology/Healthcare
- Real Estate Investment Trusts (REITs)
- Renewable Energy Infrastructure
- Asset Management Companies
- Private Credit Funds
- European Asset Managers
- Asian Investment Companies
- Infrastructure Funds
- Commodities Trading Companies
- Special Purpose Vehicles (SPVs)
- Structured Product Issuers

### 📄 CSV Upload Files
Ready-to-use CSV files with properly formatted data for bulk upload testing:

1. **`investor-test-data.csv`** - 10 comprehensive investor records with all 27 supported fields
2. **`issuer-test-data.csv`** - 12 comprehensive issuer records with all 15 supported fields

### 📁 Sample Documents
Complete set of blank sample documents for document upload testing:

**Investor Documents (14 files):**
- Passports (multiple countries)
- Driver's Licenses
- National ID Cards
- Proof of Address (utility bills, bank statements)
- Bank Statements (personal and corporate)
- Investment Agreements
- Accreditation Letters
- Tax Documents (W-9, foreign tax ID)

**Issuer Documents (12 files):**
- Articles of Incorporation
- Corporate Bylaws
- Operating Agreements
- Certificates of Good Standing
- Audited Financial Statements
- Board Resolutions
- Legal Opinion Letters
- Offering Prospectuses
- Regulatory Filings (Form D)
- Compliance Certificates

## 🚀 How to Use This Test Data

### Step 1: Load Database Test Data (Optional)
```sql
-- Run this in your Supabase SQL editor to add comprehensive test data
-- File: scripts/create-compliance-test-data.sql
-- Note: Provides extensive test cases beyond the CSV files
```

### Step 2: Test CSV Upload Functionality

#### For Investor Upload:
1. Navigate to: `http://localhost:5173/compliance/upload/investor`
2. Upload file: `test-data/compliance-upload/investor-test-data.csv`
3. Verify all 10 records are processed successfully
4. Check validation of complex JSON fields (risk_assessment, investment_preferences, etc.)

#### For Issuer Upload:
1. Navigate to: `http://localhost:5173/compliance/upload/issuer`
2. Upload file: `test-data/compliance-upload/issuer-test-data.csv`
3. Verify all 12 organizations are processed successfully
4. Check validation of JSON fields (address, legal_representatives)

### Step 3: Test Document Upload Functionality

#### Upload Investor Documents:
1. Complete Step 2 (investor CSV upload) first
2. In the document upload phase, select files from: `test-data/compliance-upload/investor-documents/`
3. Test document type mapping and entity linking
4. Verify document validation and storage

#### Upload Issuer Documents:
1. Complete Step 2 (issuer CSV upload) first
2. In the document upload phase, select files from: `test-data/compliance-upload/issuer-documents/`
3. Test document categorization and compliance requirements
4. Verify document workflow integration

## 📋 Field Mapping Reference

### Investor CSV Fields (27 total)
```
Required: name, email
Optional: company, type, notes, investor_type, investor_status, onboarding_completed, 
          wallet_address, kyc_status, kyc_verified_at, kyc_expiry_date, verification_details,
          accreditation_status, accreditation_type, accreditation_verified_at, 
          accreditation_expires_at, risk_score, risk_factors, risk_assessment,
          tax_residency, tax_id_number, last_compliance_check, investment_preferences,
          profile_data, user_id, lastUpdated
```

### Issuer CSV Fields (15 total)
```
Required: name
Optional: legal_name, registration_number, registration_date, tax_id, jurisdiction,
          business_type, status, compliance_status, onboarding_completed,
          contact_email, contact_phone, website, address, legal_representatives
```

## 🧪 Test Scenarios Covered

### Data Validation Testing
- ✅ Required field validation (name, email for investors; name for issuers)
- ✅ Email format validation
- ✅ JSON field parsing (verification_details, risk_assessment, etc.)
- ✅ Date format validation (ISO 8601)
- ✅ Enum value validation (kyc_status, investor_type, etc.)
- ✅ Wallet address format validation
- ✅ Phone number format validation
- ✅ URL format validation

### Business Logic Testing
- ✅ Duplicate handling (by email for investors, by name for issuers)
- ✅ Complex investor types (family offices, sovereign funds, etc.)
- ✅ Multi-jurisdiction compliance (US, UK, Germany, Singapore, etc.)
- ✅ Risk scoring and assessment validation
- ✅ Accreditation status workflows
- ✅ KYC status progression
- ✅ Corporate structure validation

### Document Workflow Testing
- ✅ Document type categorization
- ✅ Entity-document linking
- ✅ Multi-file upload handling
- ✅ File format validation (.pdf extension)
- ✅ Document metadata extraction
- ✅ Compliance requirement mapping

### Error Handling Testing
- ✅ Invalid data scenarios (use the rejected investor in CSV)
- ✅ Missing required fields
- ✅ Malformed JSON data
- ✅ Invalid date formats
- ✅ Unsupported file types
- ✅ Network failure simulation

## 🔧 Customization Guide

### Adding More Test Data
1. **Investors**: Add rows to `investor-test-data.csv` following the same format
2. **Issuers**: Add rows to `issuer-test-data.csv` following the same format
3. **Documents**: Create additional files in the document directories with descriptive names

### Modifying Test Scenarios
- Update JSON fields in CSV to test different validation rules
- Change status values to test different workflow states
- Modify risk scores to test scoring algorithms
- Add invalid data to test error handling

### Integration Testing
- Use the CSV data for automated testing scripts
- Reference document files in end-to-end test scenarios
- Combine with database test data for comprehensive coverage

## 📊 Expected Results

After successful upload, you should see:
- **Investors**: 10 new investor records in the database
- **Issuers**: 12 new organization records in the database
- **Documents**: All uploaded documents properly categorized and linked
- **Validation**: Clean validation results with no errors
- **UI Feedback**: Progress indicators and completion confirmations

## 🐛 Troubleshooting

### Common Issues
1. **CSV parsing errors**: Check for quotes in JSON fields
2. **Date format errors**: Ensure ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
3. **JSON validation errors**: Validate JSON syntax in complex fields
4. **Duplicate key errors**: Check for email/name conflicts in existing data

### Debug Tips
- Check browser console for detailed error messages
- Use the validation preview before uploading
- Test with basic template first, then comprehensive data
- Monitor network requests in browser dev tools

## 📈 Performance Testing

The test data is designed to support:
- Batch upload testing (10-12 records per file)
- Concurrent document upload (14+ files)
- Complex data validation (JSON fields, relationships)
- Error recovery scenarios
- Progress tracking validation

## 🎯 Next Steps

1. **Run the test suite** using all provided data
2. **Verify database integrity** after uploads
3. **Test the complete workflow** from CSV upload to document management
4. **Validate compliance reports** generated from the test data
5. **Extend test coverage** by adding custom scenarios

---

**Total Test Assets:**
- 📄 29+ database records across the SQL script
- 📊 22 CSV records (10 investors + 12 issuers) 
- 📁 26 sample documents (14 investor + 12 issuer)
- 🔧 Complete workflow coverage for both entity types

This comprehensive test suite enables thorough validation of the compliance upload functionality across all supported features and edge cases.