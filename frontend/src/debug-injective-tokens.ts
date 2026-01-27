/**
 * Debug script for Injective Token Manager
 * Run this in the browser console to diagnose token loading issues
 */

async function debugInjectiveTokens() {
  console.log('🔍 Starting Injective Token Manager Diagnostics...\n');

  // 1. Check if authToken exists
  console.log('1️⃣ Checking Authentication Token:');
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    console.error('❌ No authToken found in localStorage');
    console.log('   → You need to log in first');
    return;
  }
  console.log('✅ authToken exists:', authToken.substring(0, 20) + '...\n');

  // 2. Check backend server connectivity
  console.log('2️⃣ Checking Backend Server:');
  try {
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Backend server is running');
      console.log('   Status:', health.status);
      console.log('   Services:', health.services?.total_services || 'unknown');
      console.log('   Endpoints:', health.services?.total_endpoints || 'unknown\n');
    } else {
      console.error('❌ Backend server returned error:', healthResponse.status);
      return;
    }
  } catch (error) {
    console.error('❌ Cannot connect to backend server');
    console.error('   Error:', error);
    console.log('   → Make sure backend is running on http://localhost:3001');
    return;
  }

  // 3. Try to fetch tokens from API
  console.log('3️⃣ Fetching Tokens from API:');
  const networks = ['testnet', 'mainnet'];
  
  for (const network of networks) {
    console.log(`\n   Testing ${network}:`);
    try {
      const url = `http://localhost:3001/api/injective/native/tokens?network=${network}`;
      console.log('   URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('   Status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ Response received');
        console.log('   Success:', data.success);
        console.log('   Token Count:', data.tokens?.length || 0);
        
        if (data.tokens && data.tokens.length > 0) {
          console.log('   📋 Tokens found:');
          data.tokens.forEach((token: any, index: number) => {
            console.log(`      ${index + 1}. ${token.symbol} - ${token.name}`);
            console.log(`         Denom: ${token.denom}`);
            console.log(`         Network: ${token.network}`);
            console.log(`         Status: ${token.status}`);
          });
        } else {
          console.log('   ⚠️ No tokens found for', network);
        }
      } else {
        const errorText = await response.text();
        console.error('   ❌ API returned error:', response.status);
        console.error('   Error body:', errorText);
        
        if (response.status === 401) {
          console.log('   → Authentication failed - token may be expired');
        } else if (response.status === 404) {
          console.log('   → API endpoint not found - check backend routes');
        }
      }
    } catch (error) {
      console.error('   ❌ Request failed:', error);
    }
  }

  // 4. Check database directly (if we have Supabase access)
  console.log('\n4️⃣ Database Check:');
  console.log('   Expected table: injective_native_tokens');
  console.log('   Known token: CBOND25 (JPM Gold-Linked Callable Note 2025)');
  console.log('   Denom: factory/inj1rggzhn36vkltjlut40vr68sqa02c363vsdg4dq/bond-2026-q1\n');

  console.log('🎯 Diagnosis Complete!');
  console.log('\nCommon Issues:');
  console.log('1. Backend not running → Start with: cd backend && pnpm run dev:accurate');
  console.log('2. Not logged in → Use the login page first');
  console.log('3. Wrong network selected → Try switching between testnet/mainnet');
  console.log('4. CORS issue → Check backend CORS configuration');
}

// Run diagnostics
debugInjectiveTokens();
