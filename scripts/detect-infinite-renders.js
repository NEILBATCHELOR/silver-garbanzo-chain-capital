#!/usr/bin/env node

/**
 * React Infinite Re-render Detection Utility
 * 
 * This script scans TypeScript/React files for common patterns that cause infinite re-renders
 */

import fs from 'fs';
import path from 'path';

const PROBLEMATIC_PATTERNS = [
  {
    name: 'Object literal in dependency array',
    pattern: /useEffect\([^}]*,\s*\[[^[\]]*\{[^}]*\}[^[\]]*\]/g,
    severity: 'high',
    description: 'Objects created inline will cause re-renders on every cycle'
  },
  {
    name: 'Array literal in dependency array', 
    pattern: /useEffect\([^}]*,\s*\[[^[\]]*\[[^\]]*\][^[\]]*\]/g,
    severity: 'high',
    description: 'Arrays created inline will cause re-renders on every cycle'
  },
  {
    name: 'Function call in dependency array',
    pattern: /useEffect\([^}]*,\s*\[[^[\]]*\w+\([^)]*\)[^[\]]*\]/g,
    severity: 'medium',
    description: 'Function calls in dependencies may return new values each time'
  },
  {
    name: 'Empty dependency array with external dependencies',
    pattern: /useEffect\([^,]*\b(?:props|state|\w+\.\w+)[^,]*,\s*\[\s*\]/g,
    severity: 'high', 
    description: 'useEffect uses external values but has empty dependency array'
  },
  {
    name: 'setState inside useEffect without dependencies',
    pattern: /useEffect\([^}]*set\w+\([^)]*\)[^}]*,\s*\[\s*\]/g,
    severity: 'high',
    description: 'State updates without proper dependencies can cause infinite loops'
  }
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = [];
    
    PROBLEMATIC_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern.pattern);
      if (matches) {
        matches.forEach(match => {
          const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
          results.push({
            file: filePath,
            line: lineNumber,
            pattern: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            code: match.trim()
          });
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dir, extensions = ['.ts', '.tsx']) {
  let results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        results = results.concat(scanDirectory(fullPath, extensions));
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        results = results.concat(scanFile(fullPath));
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  
  return results;
}

function generateReport(results) {
  console.log('\n🔍 React Infinite Re-render Detection Report\n');
  console.log('='.repeat(60));
  
  if (results.length === 0) {
    console.log('✅ No problematic patterns detected!');
    return;
  }
  
  // Group by severity
  const grouped = results.reduce((acc, result) => {
    if (!acc[result.severity]) acc[result.severity] = [];
    acc[result.severity].push(result);
    return acc;
  }, {});
  
  ['high', 'medium', 'low'].forEach(severity => {
    if (!grouped[severity]) return;
    
    console.log(`\n🚨 ${severity.toUpperCase()} SEVERITY (${grouped[severity].length} issues)\n`);
    
    grouped[severity].forEach((result, index) => {
      console.log(`${index + 1}. ${result.pattern}`);
      console.log(`   File: ${result.file}:${result.line}`);
      console.log(`   Issue: ${result.description}`);
      console.log(`   Code: ${result.code}`);
      console.log('');
    });
  });
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('='.repeat(30));
  console.log(`Total issues found: ${results.length}`);
  console.log(`High severity: ${grouped.high?.length || 0}`);
  console.log(`Medium severity: ${grouped.medium?.length || 0}`);
  console.log(`Low severity: ${grouped.low?.length || 0}`);
  
  console.log('\n💡 RECOMMENDATIONS');
  console.log('='.repeat(30));
  console.log('1. Fix high severity issues first');
  console.log('2. Use useCallback for function dependencies');
  console.log('3. Use useMemo for object/array dependencies');
  console.log('4. Include all dependencies in useEffect arrays');
  console.log('5. Consider splitting complex effects into smaller ones');
  console.log('6. Run ESLint with react-hooks/exhaustive-deps rule');
}

// Main execution
function main() {
  const srcPath = process.argv[2] || './src';
  
  if (!fs.existsSync(srcPath)) {
    console.error(`❌ Directory not found: ${srcPath}`);
    console.log('Usage: node detect-infinite-renders.js <src-directory>');
    process.exit(1);
  }
  
  console.log(`🔍 Scanning ${srcPath} for infinite re-render patterns...`);
  
  const results = scanDirectory(srcPath);
  generateReport(results);
}

// Check if this is the main module being executed
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scanFile, scanDirectory, generateReport };
