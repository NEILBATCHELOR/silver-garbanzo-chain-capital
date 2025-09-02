#!/usr/bin/env node

/**
 * Script to fix checkbox initialization in all product form components
 * This helps prevent the React warning about switching from uncontrolled to controlled components
 */

const fs = require('fs');
const path = require('path');

// Forms directory path
const formsDir = path.join(__dirname, '..', 'frontend', 'src', 'components', 'products', 'product-forms');

// Get all form files
const formFiles = fs.readdirSync(formsDir).filter(file => file.endsWith('.tsx'));

// Counter for modified files
let modifiedCount = 0;

// Process each file
formFiles.forEach(file => {
  const filePath = path.join(formsDir, file);
  
  // Read file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip files that don't have checkbox components
  if (!content.includes('<Checkbox') && !content.includes('checked={')) {
    console.log(`Skipping ${file} - no checkbox components found`);
    return;
  }
  
  // Look for the default values formatting section
  const defaultValuesRegex = /const\s+formattedDefaultValues\s*=\s*{[^}]*}/s;
  const match = content.match(defaultValuesRegex);
  
  if (!match) {
    console.log(`Skipping ${file} - default values formatting not found`);
    return;
  }
  
  // Check for checkbox field usages in form fields
  const checkboxFieldRegex = /<FormField[\s\S]+?name="([^"]+)"[\s\S]+?<Checkbox[\s\S]+?checked={([^}]+)}/g;
  const checkboxFields = [];
  let checkboxMatch;
  
  while ((checkboxMatch = checkboxFieldRegex.exec(content)) !== null) {
    checkboxFields.push(checkboxMatch[1]);
  }
  
  if (checkboxFields.length === 0) {
    console.log(`Skipping ${file} - no checkbox field names found`);
    return;
  }
  
  // Construct new default values with checkbox initializations
  let newDefaultValues = match[0];
  let modified = false;
  
  for (const fieldName of checkboxFields) {
    // Check if the field is already initialized
    if (!newDefaultValues.includes(`${fieldName}:`)) {
      // Add initialization for the checkbox field
      newDefaultValues = newDefaultValues.replace(
        /({[^}]*)(})/s,
        `$1,\n    ${fieldName}: defaultValues?.${fieldName} ?? false$2`
      );
      modified = true;
    }
  }
  
  if (!modified) {
    console.log(`Skipping ${file} - checkbox fields already initialized`);
    return;
  }
  
  // Replace the old default values with the new one
  const newContent = content.replace(defaultValuesRegex, newDefaultValues);
  
  // Save the modified file
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  console.log(`Updated ${file} - initialized ${checkboxFields.join(', ')}`);
  modifiedCount++;
});

console.log(`\nComplete! Modified ${modifiedCount} files.`);
