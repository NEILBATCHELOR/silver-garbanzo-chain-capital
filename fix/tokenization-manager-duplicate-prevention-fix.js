// TokenizationManager.tsx - Enhanced handleCreateToken with Duplicate Prevention
// Fix for double record creation issue
// Date: August 21, 2025

// Add this state variable at the top of the component (around line 77)
const [createInProgress, setCreateInProgress] = useState<Set<string>>(new Set());

// Replace the existing handleCreateToken function (lines 545-616) with this enhanced version:
const handleCreateToken = async () => {
  if (!selectedPool) return;
  
  // Create unique identifier for this creation attempt
  const createKey = `${selectedPool.id}-${tokenFormData.tokenName}-${tokenFormData.tokenSymbol}`;
  
  // Prevent duplicate creation attempts
  if (createInProgress.has(createKey) || creatingToken) {
    toast({
      title: "Creation In Progress",
      description: "Please wait for the current token creation to complete.",
      variant: "destructive",
    });
    return;
  }
  
  try {
    setCreatingToken(true);
    setCreateInProgress(prev => new Set(prev).add(createKey));
    
    // Check for existing token with same name and symbol in this project
    const { data: existingTokens, error: checkError } = await supabase
      .from("tokens")
      .select("id, name, symbol")
      .eq("project_id", projectId)
      .eq("name", tokenFormData.tokenName)
      .eq("symbol", tokenFormData.tokenSymbol);
      
    if (checkError) throw checkError;
    
    if (existingTokens && existingTokens.length > 0) {
      toast({
        title: "Duplicate Token",
        description: `A token with name "${tokenFormData.tokenName}" and symbol "${tokenFormData.tokenSymbol}" already exists in this project.`,
        variant: "destructive",
      });
      return;
    }
    
    // Calculate the token value based on pool value and total tokens
    const tokenValue = calculateTokenValue(selectedPool.id, tokenFormData.totalTokens);
    const { faceValue, discountedValue, discountAmount, averageDiscountRate } = getDiscountedPoolValue(selectedPool.id);
    
    // Ensure our data meets the database requirements
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
          creation_timestamp: new Date().toISOString(),
          creation_key: createKey // Add unique creation identifier
        }
      },
      status: "DRAFT" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Create the token in the database with error handling for unique constraint
    const { data, error } = await supabase
      .from("tokens")
      .insert(tokenInsertData)
      .select("*")
      .single();
        
    if (error) {
      // Handle unique constraint violation specifically
      if (error.code === '23505' && error.message.includes('unique_token_per_project')) {
        toast({
          title: "Duplicate Token",
          description: `A token with this name and symbol already exists in this project.`,
          variant: "destructive",
        });
        return;
      }
      throw error;
    }
    
    setCreateDialogOpen(false);
    toast({
      title: "Token Created Successfully",
      description: `Created "${tokenFormData.tokenName}" token with ${tokenFormData.totalTokens.toLocaleString()} tokens`,
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
    
    // Refresh tokens
    throttledFetchData();
    
  } catch (error) {
    console.error("Error creating token:", error);
    toast({
      title: "Token Creation Failed",
      description: "Failed to create token: " + (error instanceof Error ? error.message : String(error)),
      variant: "destructive",
    });
  } finally {
    setCreatingToken(false);
    setCreateInProgress(prev => {
      const newSet = new Set(prev);
      newSet.delete(createKey);
      return newSet;
    });
  }
};

// Update the Create Token button to show better loading state (around line 1475):
<Button 
  onClick={handleCreateToken}
  disabled={
    creatingToken || 
    !selectedPool || 
    !tokenFormData.tokenName.trim() || 
    !tokenFormData.tokenSymbol.trim() || 
    tokenFormData.totalTokens <= 0 ||
    createInProgress.size > 0
  }
>
  {creatingToken ? (
    <>
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      Creating Token...
    </>
  ) : createInProgress.size > 0 ? (
    <>
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      Please Wait...
    </>
  ) : (
    <>
      <Coins className="h-4 w-4 mr-2" />
      Create Token
    </>
  )}
</Button>
