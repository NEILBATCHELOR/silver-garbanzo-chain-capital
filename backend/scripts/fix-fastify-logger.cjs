#!/usr/bin/env node

/**
 * Fix Fastify Logger Calls Codemod (JavaScript version)
 * 
 * Transforms logger.error('message', error) into logger.error({ error }, 'message')
 * to satisfy TypeScript strict typing for Fastify/Pino logger interfaces.
 */

const fs = require('fs').promises;
const path = require('path');

async function findTypeScriptFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subdirFiles = await findTypeScriptFiles(fullPath);
        files.push(...subdirFiles);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Skipping directory ${dir}: ${error}`);
  }
  
  return files;
}

function transformLoggerCalls(content) {
  let changes = 0;
  
  // Pattern 1: logger.error('message', error) - basic 2-argument calls with string first
  const basicLoggerPattern = /(\w+\.log|this\.logger|\w+Service)\.error\(\s*(['"`][^'"`]*['"`]|`[^`]*`)\s*,\s*([^,\)]+)\s*\)/g;
  
  // Pattern 2: logger.warn('message', error) - warn calls  
  const warnLoggerPattern = /(\w+\.log|this\.logger|\w+Service)\.warn\(\s*(['"`][^'"`]*['"`]|`[^`]*`)\s*,\s*([^,\)]+)\s*\)/g;
  
  // Pattern 3: logger.info('message', data) - info calls
  const infoLoggerPattern = /(\w+\.log|this\.logger|\w+Service)\.info\(\s*(['"`][^'"`]*['"`]|`[^`]*`)\s*,\s*([^,\)]+)\s*\)/g;
  
  // Pattern 4: logger.debug('message', data) - debug calls
  const debugLoggerPattern = /(\w+\.log|this\.logger|\w+Service)\.debug\(\s*(['"`][^'"`]*['"`]|`[^`]*`)\s*,\s*([^,\)]+)\s*\)/g;
  
  // Pattern 5: Complex multi-argument calls - simplify to single string argument
  const multiArgPattern = /(\w+\.log|this\.logger|\w+Service)\.(error|warn|info|debug)\(\s*(['"`][^'"`]*['"`]|`[^`]*`)\s*,\s*[^,)]+\s*,\s*[^)]*\)/g;
  
  // Transform multi-argument calls first (convert to single string)
  content = content.replace(multiArgPattern, (match, logger, method, message) => {
    changes++;
    return `${logger}.${method}(${message})`;
  });
  
  // Transform basic error calls
  content = content.replace(basicLoggerPattern, (match, logger, message, errorVar) => {
    changes++;
    return `${logger}.error({ error: ${errorVar.trim()} }, ${message})`;
  });
  
  // Transform warn calls
  content = content.replace(warnLoggerPattern, (match, logger, message, errorVar) => {
    changes++;
    return `${logger}.warn({ error: ${errorVar.trim()} }, ${message})`;
  });
  
  // Transform info calls
  content = content.replace(infoLoggerPattern, (match, logger, message, dataVar) => {
    changes++;
    // For info calls, the second arg might be data, not error
    return `${logger}.info(${message}, ${dataVar.trim()})`;
  });
  
  // Transform debug calls  
  content = content.replace(debugLoggerPattern, (match, logger, message, dataVar) => {
    changes++;
    // For debug calls, the second arg might be data, not error
    return `${logger}.debug(${message}, ${dataVar.trim()})`;
  });
  
  return { content, changes };
}

async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { content: newContent, changes } = transformLoggerCalls(content);
    
    if (changes > 0) {
      await fs.writeFile(filePath, newContent, 'utf-8');
      console.log(`✓ Fixed ${changes} logger calls in ${filePath}`);
    }
    
    return changes;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error);
    return 0;
  }
}

async function main() {
  const backendSrcPath = path.join(__dirname, '..', 'src');
  
  console.log('🔧 Starting Fastify logger fix codemod...');
  console.log(`📁 Searching for TypeScript files in: ${backendSrcPath}`);
  
  const tsFiles = await findTypeScriptFiles(backendSrcPath);
  console.log(`📄 Found ${tsFiles.length} TypeScript files`);
  
  let totalChanges = 0;
  
  for (const file of tsFiles) {
    const changes = await processFile(file);
    totalChanges += changes;
  }
  
  console.log(`\n🎉 Complete! Fixed ${totalChanges} logger calls across ${tsFiles.length} files.`);
  
  if (totalChanges > 0) {
    console.log('\n📋 Next steps:');
    console.log('  1. Run: pnpm -w tsc --noEmit');
    console.log('  2. Review changes and fix any remaining TypeScript errors');
    console.log('  3. Run: pnpm -w eslint backend --fix');
    console.log('  4. Test the backend server');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
