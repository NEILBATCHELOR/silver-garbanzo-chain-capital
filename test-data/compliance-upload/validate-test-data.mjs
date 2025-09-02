#!/usr/bin/env node

/**
 * CSV Test Data Validator (ES Module Version)
 * 
 * Validates the structure and content of test CSV files for compliance upload
 * Run with: node validate-test-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Valid enum values (MATCHING ValidationService.ts)
const VALID_ENUMS = {
  type: ['individual', 'institutional', 'syndicate'],
  kyc_status: ['approved', 'pending', 'failed', 'not_started', 'expired'],
  investor_status: ['pending', 'active', 'rejected', 'suspended'],
  accreditation_status: ['approved', 'pending', 'rejected', 'not_started', 'expired'],
  status: ['pending', 'active', 'rejected', 'suspended'],
  compliance_status: ['compliant', 'non_compliant', 'pending_review']
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
      if (entityType === 'investor' && rowData.email && !isValidEmail(rowData.email)) {
        rowErrors.push(`Invalid email format: ${rowData.email}`);
      }
      if (entityType === 'issuer' && rowData.contact_email && !isValidEmail(rowData.contact_email)) {
        rowErrors.push(`Invalid email format: ${rowData.contact_email}`);
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

      // Validate risk score
      if (rowData.risk_score && rowData.risk_score.trim() !== '') {
        const score = Number(rowData.risk_score);
        if (isNaN(score) || score < 0 || score > 100) {
          rowErrors.push(`Risk score must be between 0 and 100: ${rowData.risk_score}`);
        }
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
    console.log(`\n🚨 Validation Errors (showing first 15):`);
    errors.slice(0, 15).forEach(error => console.log(`   ${error}`));
    if (errors.length > 15) {
      console.log(`   ... and ${errors.length - 15} more errors`);
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

  console.log(`✅ Document validation passed: ${documentFiles.length} PDF files found`);
  return true;
}

// Main execution
function main() {
  console.log('🧪 Chain Capital Compliance Upload Test Data Validator');
  console.log('====================================================');

  const baseDir = path.resolve(__dirname);
  
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
  } else {
    console.log('\n🔧 Please fix the validation errors before testing.');
  }

  process.exit(allValid ? 0 : 1);
}

main();
