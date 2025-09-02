#!/usr/bin/env node

/**
 * TypeScript Error Verification Script
 * Checks for common TypeScript issues in the captable backend services
 */

import fs from 'fs';
import path from 'path';

const BACKEND_PATH = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src';

// Common patterns that indicate potential issues
const ISSUE_PATTERNS = [
  { pattern: /this\.db\.[a-zA-Z]+[A-Z]/, description: 'CamelCase model name (should be snake_case)' },
  { pattern: /\.is_active/, description: 'Reference to is_active field (should use investor_status)' },
  { pattern: /include:\s*{\s*investor:/, description: 'Include using singular "investor" (should be "investors")' },
  { pattern: /projectId(?!:)/, description: 'CamelCase field reference (should be project_id)' },
  { pattern: /investorId(?!:)/, description: 'CamelCase field reference (should be investor_id)' },
  { pattern: /subscriptionAmount/, description: 'CamelCase field reference (should be fiat_amount)' },
  { pattern: /subscriptionDate/, description: 'CamelCase field reference (should be subscription_date)' },
  { pattern: /createdAt/, description: 'CamelCase field reference (should be created_at)' },
  { pattern: /updatedAt/, description: 'CamelCase field reference (should be updated_at)' },
  { pattern: /export type.*KycStatus.*from/, description: 'Duplicate export conflict' },
  { pattern: /export type.*ComplianceStatus.*from/, description: 'Duplicate export conflict' },
  { pattern: /export type.*TokenStandardEnum.*from/, description: 'Duplicate export conflict' }
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    ISSUE_PATTERNS.forEach(({ pattern, description }) => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          issue: description
        });
      }
    });
  });

  return issues;
}

function scanDirectory(dirPath) {
  const issues = [];
  
  function scan(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        const fileIssues = checkFile(fullPath);
        issues.push(...fileIssues);
      }
    });
  }
  
  scan(dirPath);
  return issues;
}

function generateReport() {
  console.log('🔍 Scanning TypeScript files for potential issues...\n');
  
  const serviceDirs = [
    path.join(BACKEND_PATH, 'services/captable'),
    path.join(BACKEND_PATH, 'services/investors'),
    path.join(BACKEND_PATH, 'services/projects'),
    path.join(BACKEND_PATH, 'types')
  ];
  
  let totalIssues = 0;
  
  serviceDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Checking ${dir.replace(BACKEND_PATH, '')}`);
      const issues = scanDirectory(dir);
      
      if (issues.length === 0) {
        console.log('   ✅ No issues found\n');
      } else {
        console.log(`   ⚠️  Found ${issues.length} potential issues:\n`);
        
        issues.forEach(issue => {
          console.log(`     ${path.basename(issue.file)}:${issue.line}`);
          console.log(`     Issue: ${issue.issue}`);
          console.log(`     Code: ${issue.content}`);
          console.log('');
        });
        
        totalIssues += issues.length;
      }
    } else {
      console.log(`📁 Directory not found: ${dir}\n`);
    }
  });
  
  console.log('=' .repeat(60));
  console.log(`🎯 SUMMARY: Found ${totalIssues} potential issues`);
  
  if (totalIssues === 0) {
    console.log('✅ All checks passed! Ready for TypeScript compilation.');
  } else {
    console.log('⚠️  Please review and fix the issues above before compilation.');
  }
  
  console.log('=' .repeat(60));
}

// Run the verification
generateReport();
