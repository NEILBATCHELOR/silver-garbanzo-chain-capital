// ENHANCED TOKENIZATION MANAGER WITH COMPREHENSIVE DUPLICATE PREVENTION
// 
// This is the complete fix for TokenizationManager.tsx duplicate record creation
// Apply this by replacing the handleCreateToken function in the original file
//
// PROTECTION LAYERS:
// 1. Ref-based progress tracking (prevents rapid clicks)
// 2. Time-based minimum interval enforcement
// 3. Pre-insertion duplicate checking
// 4. Database constraint validation
// 5. Enhanced error handling with duplicate detection

import React from 'react';

// Add this near the top of TokenizationManager component after existing useRef declarations:

const MINIMUM_CREATION_INTERVAL_MS = 1000; // Prevent creation within 1 second

// ENHANCED handleCreateToken function - replace the existing one:
const handleCreateToken = async () => {
  if (!selectedPool) return;
  
  // LAYER 1: Check if creation is already in progress
  if (tokenCreationInProgressRef.current) {
    console.warn('⚠️ Token creation already in progress, ignoring request');
    toast({
      title: "Creation In Progress",
      description: "Please wait for the current token creation to complete",
      variant: "destructive",
    });
    return;
  }

  // LAYER 2: Check minimum time interval
  const now = Date.now();
  if (now - lastTokenCreationTimeRef.current < MINIMUM_CREATION_INTERVAL_MS) {
    console.warn('⚠️ Token creation too rapid, enforcing minimum interval');
    toast({
      title: "Too Fast",
      description: "Please wait before creating another token",
      variant: "destructive",
    });
    return;
  }

  // LAYER 3: Atomic state management
  tokenCreationInProgressRef.current = true;
  lastTokenCreationTimeRef.current = now;
  
  try {
    setCreatingToken(true);
    
    // LAYER 4: Pre-insertion duplicate check
    console.log('🔍 Checking for existing tokens with same name/symbol...');
    const { data: existingTokens, error: duplicateCheckError } = await supabase
      .from("tokens")
      .select("id, name, symbol")
      .eq("project_id", projectId)
      .or(`name.eq.${tokenFormData.tokenName},symbol.eq.${tokenFormData.tokenSymbol}`);
    
    if (duplicateCheckError) {
      console.error('Error checking for duplicates:', duplicateCheckError);
      throw new Error('Failed to validate token uniqueness');
    }

    if (existingTokens && existingTokens.length > 0) {
      const duplicateNames = existingTokens.filter(t => t.name === tokenFormData.tokenName);
      const duplicateSymbols = existingTokens.filter(t => t.symbol === tokenFormData.tokenSymbol);
      
      if (duplicateNames.length > 0) {
        throw new Error(`Token with name "${tokenFormData.tokenName}" already exists`);
      }
      if (duplicateSymbols.length > 0) {
        throw new Error(`Token with symbol "${tokenFormData.tokenSymbol}" already exists`);
      }
    }

    // LAYER 5: Calculate token values with validation
    const tokenValue = calculateTokenValue(selectedPool.id, tokenFormData.totalTokens);
    const { faceValue, discountedValue, discountAmount, averageDiscountRate } = getDiscountedPoolValue(selectedPool.id);
    
    if (tokenValue <= 0 || faceValue <= 0) {
      throw new Error('Invalid token calculations - token value or face value is zero');
    }

    // LAYER 6: Prepare insert data with unique identifiers
    const uniqueCorrelationId = `token_create_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const tokenInsertData = {
      name: tokenFormData.tokenName,
      symbol: tokenFormData.tokenSymbol,
      project_id: projectId,
      standard: tokenFormData.tokenStandard || "ERC-1155" as const,
      blocks: {},
      decimals: 18,
      total_supply: String(tokenFormData.totalTokens),
      metadata: {
        factoring: {
          source: 'factoring_tokenization',
          pool_id: parseInt(selectedPool.id),
          total_tokens: tokenFormData.totalTokens,
          token_value: tokenFormData.initialTokenValue,
          total_value: selectedPool.totalValue || 0,
          security_interest_details: tokenFormData.securityInterestDetails,
          status: 'draft' as const,
          average_age: selectedPool.averageAge || 0,
          discounted_value: discountedValue,
          discount_amount: discountAmount,
          average_discount_rate: averageDiscountRate,
          pool_name: selectedPool.poolName,
          correlation_id: uniqueCorrelationId,
          created_by: 'tokenization_manager',
          creation_timestamp: new Date().toISOString()
        }
      },
      status: "DRAFT" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('💾 Inserting token with correlation ID:', uniqueCorrelationId);
    
    // LAYER 7: Database insertion with enhanced error handling
    const { data, error } = await supabase
      .from("tokens")
      .insert(tokenInsertData)
      .select("*")
      .single();
        
    if (error) {
      // LAYER 8: Enhanced error detection for duplicates
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        throw new Error('Token already exists - duplicate creation prevented by database constraints');
      }
      throw error;
    }

    if (!data) {
      throw new Error('Token creation failed - no data returned from database');
    }
    
    console.log('✅ Token created successfully:', data.id);
    
    // LAYER 9: Success handling
    setCreateDialogOpen(false);
    toast({
      title: "Token Created Successfully",
      description: `Created ${tokenFormData.tokenName} token with ${tokenFormData.totalTokens.toLocaleString()} tokens`,
      variant: "default",
    });
    
    // Reset form
    setTokenFormData({
      poolId: "",
      tokenName: "",
      tokenSymbol: "",
      totalTokens: 0,
      initialTokenValue: 0,
      securityInterestDetails: "",
      tokenStandard: "ERC-1155",
    });
    setSelectedPool(null);
    
    // Refresh tokens with delay to ensure database consistency
    setTimeout(() => {
      throttledFetchData();
    }, 500);
    
  } catch (error) {
    console.error("❌ Error creating token:", error);
    
    // LAYER 10: Enhanced error handling with specific duplicate messaging
    let errorMessage = "Failed to create token";
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        errorMessage = error.message;
      } else if (error.message.includes('duplicate')) {
        errorMessage = "Token creation prevented - duplicate detected";
      } else {
        errorMessage = `Failed to create token: ${error.message}`;
      }
    }
    
    toast({
      title: "Token Creation Failed",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    // LAYER 11: Always reset progress tracking
    setCreatingToken(false);
    tokenCreationInProgressRef.current = false;
    
    // Set a minimum delay before next creation attempt
    setTimeout(() => {
      console.log('🔓 Token creation ready for next attempt');
    }, MINIMUM_CREATION_INTERVAL_MS);
  }
};

// ENHANCED button in the create dialog - replace the existing button:
// Find this in the DialogFooter section and replace:

/*
<Button 
  onClick={handleCreateToken}
  disabled={
    creatingToken || 
    tokenCreationInProgressRef.current ||
    !selectedPool || 
    !tokenFormData.tokenName || 
    !tokenFormData.tokenSymbol || 
    tokenFormData.totalTokens <= 0 ||
    (Date.now() - lastTokenCreationTimeRef.current < MINIMUM_CREATION_INTERVAL_MS)
  }
>
  {creatingToken || tokenCreationInProgressRef.current ? (
    <>
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      Creating...
    </>
  ) : (
    <>
      <Coins className="h-4 w-4 mr-2" />
      Create Token
    </>
  )}
</Button>
*/

export default React.memo(TokenizationManager);
