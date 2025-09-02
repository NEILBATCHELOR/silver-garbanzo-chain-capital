#!/usr/bin/env node

/**
 * CSV Test Data Validator
 * 
 * Validates the structure and content of test CSV files for compliance upload
 * Run with: node validate-test-data.js
 */

const fs = require('fs');
const path = require('path');

// Expected investor fields (27 total)
const INVESTOR_REQUIRED_FIELDS = ['name', 'email'];
const INVESTOR_ALL_FIELDS = [
  'name', 'email', 'company', 'type', 'notes', 'investor_type', 'investor_status', 
  'onboarding_completed', 'wallet_address', 'kyc_status', 'kyc_verified_at', 
  'kyc_expiry_date', 'verification_details', 'accreditation_status', 'accreditation_type', 
  'accreditation_verified_at', 'accreditation_expires_at', 'risk_score', 'risk_factors', 
  'risk_assessment', 'tax_residency', 'tax_id_number', 'last_compliance_check', 
  'investment_preferences', 'profile_data', 'user_id', 'lastUpdated'
];

// Expected issuer fields (15 total)
const ISSUER_REQUIRED_FIELDS = ['name'];
const ISSUER_ALL_FIELDS = [
  'name', 'legal_name', 'registration_number', 'registration_date', 'tax_id', 
  'jurisdiction', 'business_type', 'status', 'compliance_status', 'onboarding_completed',
  'contact_email', 'contact_phone', 'website', 'address', 'legal_representatives'
];

// Valid enum values
const VALID_ENUMS = {
  kyc_status: ['approved', 'pending', 'failed', 'not_started', 'expired'],
  investor_status: ['active', 'pending', 'pending_review', 'pending_documentation', 'rejected'],
  investor_type: ['individual', 'institutional', 'family_office', 'sovereign', 'corporate', 'insurance', 'endowment', 'foundation', 'religious_institution', 'government'],
  accreditation_status: ['approved', 'pending', 'in_progress', 'rejected', 'not_started'],
  status: ['active', 'pending', 'pending_review', 'rejected'],
  compliance_status: ['approved', 'pending_review', 'compliant', 'non_compliant']
};

function validateCSV(filePath, entityType) {
  console.log(`\n🔍 Validating ${entityType} CSV: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    console.error(`❌ File must have at least header + 1 data row`);
    return false;
  }

  // Parse header
  const header = lines[0].split(',');
  const expectedFields = entityType === 'investor' ? INVESTOR_ALL_FIELDS : ISSUER_ALL_FIELDS;
  const requiredFields = entityType === 'investor' ? INVESTOR_REQUIRED_FIELDS : ISSUER_REQUIRED_FIELDS;
  
  console.log(`📋 Header fields found: ${header.length}`);
  console.log(`📋 Expected fields: ${expectedFields.length}`);
  
  // Check required fields
  const missingRequired = requiredFields.filter(field => !header.includes(field));
  if (missingRequired.length > 0) {
    console.error(`❌ Missing required fields: ${missingRequired.join(', ')}`);
    return false;
  } else {
    console.log(`✅ All required fields present: ${requiredFields.join(', ')}`);
  }
  
  // Check for unexpected fields
  const unexpectedFields = header.filter(field => !expectedFields.includes(field));
  if (unexpectedFields.length > 0) {
    console.warn(`⚠️  Unexpected fields: ${unexpectedFields.join(', ')}`);
  }
  
  // Check missing optional fields
  const missingOptional = expectedFields.filter(field => !header.includes(field) && !requiredFields.includes(field));
  if (missingOptional.length > 0) {
    console.log(`ℹ️  Missing optional fields: ${missingOptional.join(', ')}`);
  }

  // Validate data rows
  let validRows = 0;
  let invalidRows = 0;
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;
    
    try {
      const values = parseCSVRow(row);
      if (values.length !== header.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (${values.length} vs ${header.length})`);
        invalidRows++;
        continue;
      }

      const rowData = {};
      header.forEach((field, index) => {
        rowData[field] = values[index];
      });

      // Validate required fields
      const rowErrors = [];
      requiredFields.forEach(field => {
        if (!rowData[field] || rowData[field].trim() === '') {
          rowErrors.push(`${field} is required`);
        }
      });

      // Validate email format
      if (rowData.email && !isValidEmail(rowData.email)) {
        rowErrors.push(`Invalid email format: ${rowData.email}`);
      }

      // Validate enum values
      Object.keys(VALID_ENUMS).forEach(field => {
        if (rowData[field] && rowData[field].trim() !== '') {
          const value = rowData[field].toLowerCase().trim();
          if (!VALID_ENUMS[field].includes(value)) {
            rowErrors.push(`Invalid ${field}: ${value} (valid: ${VALID_ENUMS[field].join(', ')})`);
          }
        }
      });

      // Validate JSON fields
      const jsonFields = entityType === 'investor' 
        ? ['verification_details', 'risk_factors', 'risk_assessment', 'investment_preferences', 'profile_data']
        : ['address', 'legal_representatives'];
      
      jsonFields.forEach(field => {
        if (rowData[field] && rowData[field].trim() !== '') {
          try {
            JSON.parse(rowData[field]);
          } catch (e) {
            rowErrors.push(`Invalid JSON in ${field}: ${e.message}`);
          }
        }
      });

      // Validate dates
      const dateFields = entityType === 'investor'
        ? ['kyc_verified_at', 'kyc_expiry_date', 'accreditation_verified_at', 'accreditation_expires_at', 'last_compliance_check', 'lastUpdated']
        : ['registration_date'];
      
      dateFields.forEach(field => {
        if (rowData[field] && rowData[field].trim() !== '') {
          if (!isValidDate(rowData[field])) {
            rowErrors.push(`Invalid date format in ${field}: ${rowData[field]} (expected ISO 8601)`);
          }
        }
      });

      // Validate wallet address
      if (rowData.wallet_address && !isValidWalletAddress(rowData.wallet_address)) {
        rowErrors.push(`Invalid wallet address format: ${rowData.wallet_address}`);
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${i + 1} (${rowData.name || rowData.email || 'unknown'}): ${rowErrors.join(', ')}`);
        invalidRows++;
      } else {
        validRows++;
      }

    } catch (e) {
      errors.push(`Row ${i + 1}: Parse error - ${e.message}`);
      invalidRows++;
    }
  }

  // Summary
  console.log(`\n📊 Validation Summary:`);
  console.log(`✅ Valid rows: ${validRows}`);
  console.log(`❌ Invalid rows: ${invalidRows}`);
  console.log(`📄 Total data rows: ${validRows + invalidRows}`);

  if (errors.length > 0) {
    console.log(`\n🚨 Validation Errors (showing first 10):`);
    errors.slice(0, 10).forEach(error => console.log(`   ${error}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`);
    }
  }

  const isValid = invalidRows === 0;
  console.log(`\n${isValid ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED'}`);
  return isValid;
}

function parseCSVRow(row) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current); // Add last value
  return values;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDate(dateString) {
  // Check ISO 8601 format
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

function isValidWalletAddress(address) {
  // Basic Ethereum address validation
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethRegex.test(address);
}

function validateDocuments(docsDir, entityType) {
  console.log(`\n📁 Validating ${entityType} documents in: ${docsDir}`);
  
  if (!fs.existsSync(docsDir)) {
    console.error(`❌ Documents directory not found: ${docsDir}`);
    return false;
  }

  const files = fs.readdirSync(docsDir);
  const documentFiles = files.filter(file => file.endsWith('.pdf'));
  
  console.log(`📄 Document files found: ${documentFiles.length}`);
  
  if (documentFiles.length === 0) {
    console.warn(`⚠️  No PDF documents found in ${docsDir}`);
    return false;
  }

  // Expected document types
  const expectedTypes = entityType === 'investor' 
    ? ['passport', 'drivers_license', 'national_id', 'proof_of_address', 'bank_statement', 'investment_agreement', 'accreditation_letter', 'tax_document']
    : ['articles_of_incorporation', 'bylaws', 'operating_agreement', 'good_standing', 'financial_statements', 'board_resolution', 'legal_opinion', 'prospectus', 'regulatory_filing', 'compliance_certificate'];

  const foundTypes = new Set();
  documentFiles.forEach(file => {
    expectedTypes.forEach(type => {
      if (file.toLowerCase().includes(type.replace('_', ''))) {
        foundTypes.add(type);
      }
    });
  });

  console.log(`✅ Document types covered: ${foundTypes.size}/${expectedTypes.length}`);
  console.log(`📋 Types found: ${Array.from(foundTypes).join(', ')}`);
  
  const missingTypes = expectedTypes.filter(type => !foundTypes.has(type));
  if (missingTypes.length > 0) {
    console.log(`ℹ️  Missing document types: ${missingTypes.join(', ')}`);
  }

  return true;
}

// Main execution
function main() {
  console.log('🧪 Chain Capital Compliance Upload Test Data Validator');
  console.log('====================================================');

  const baseDir = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/test-data/compliance-upload';
  
  let allValid = true;

  // Validate CSV files
  const investorCSV = path.join(baseDir, 'investor-test-data.csv');
  const issuerCSV = path.join(baseDir, 'issuer-test-data.csv');
  
  allValid &= validateCSV(investorCSV, 'investor');
  allValid &= validateCSV(issuerCSV, 'issuer');

  // Validate document directories
  const investorDocs = path.join(baseDir, 'investor-documents');
  const issuerDocs = path.join(baseDir, 'issuer-documents');
  
  allValid &= validateDocuments(investorDocs, 'investor');
  allValid &= validateDocuments(issuerDocs, 'issuer');

  console.log('\n' + '='.repeat(50));
  console.log(`🎯 Overall Result: ${allValid ? '✅ ALL VALIDATION PASSED' : '❌ SOME VALIDATION FAILED'}`);
  console.log('====================================================');

  if (allValid) {
    console.log('\n🚀 Test data is ready for compliance upload testing!');
    console.log('\nNext steps:');
    console.log('1. Start your frontend: npm run dev');
    console.log('2. Navigate to: http://localhost:5173/compliance/upload/investor');
    console.log('3. Upload: investor-test-data.csv');
    console.log('4. Navigate to: http://localhost:5173/compliance/upload/issuer');
    console.log('5. Upload: issuer-test-data.csv');
    console.log('6. Test document uploads with the sample files');
  } else {
    console.log('\n🔧 Please fix the validation errors before testing.');
  }

  process.exit(allValid ? 0 : 1);
}

if (require.main === module) {
  main();
}