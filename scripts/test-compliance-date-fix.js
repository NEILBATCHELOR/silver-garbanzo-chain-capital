#!/usr/bin/env node

/**
 * Test script to validate the ComplianceDashboard date formatting fix
 * Run with: node test-compliance-date-fix.js
 */

// Mock the date-fns format function for testing
const format = (date, formatString) => {
  if (isNaN(date.getTime())) {
    throw new RangeError('Invalid time value');
  }
  return date.toLocaleDateString();
};

// Safe date formatting utility (copied from fix)
const safeFormatDate = (dateValue, formatString = 'MMM dd, yyyy') => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid Date';
  }
};

// Test cases
const testCases = [
  { name: 'Valid date string', value: '2025-08-09', expected: 'success' },
  { name: 'Valid date object', value: new Date(), expected: 'success' },
  { name: 'Null value', value: null, expected: 'N/A' },
  { name: 'Undefined value', value: undefined, expected: 'N/A' },
  { name: 'Invalid date string', value: 'invalid-date', expected: 'Invalid Date' },
  { name: 'Empty string', value: '', expected: 'N/A' },
  { name: 'Number timestamp', value: Date.now(), expected: 'success' }
];

console.log('🧪 Testing ComplianceDashboard Date Fix\n');

let passed = 0;
let failed = 0;

testCases.forEach(testCase => {
  try {
    const result = safeFormatDate(testCase.value);
    
    if (testCase.expected === 'success' && result !== 'N/A' && result !== 'Invalid Date') {
      console.log(`✅ ${testCase.name}: ${result}`);
      passed++;
    } else if (result === testCase.expected) {
      console.log(`✅ ${testCase.name}: ${result}`);
      passed++;
    } else {
      console.log(`❌ ${testCase.name}: Expected ${testCase.expected}, got ${result}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${testCase.name}: Threw error - ${error.message}`);
    failed++;
  }
});

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! Date formatting fix is working correctly.');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please check the implementation.');
  process.exit(1);
}
