/**
 * APY Calculator Utilities
 * Calculate and display APY for commodity rewards
 */

interface APYCalculation {
  baseAPY: number;
  rewardsAPY: number;
  totalAPY: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  yearlyProjection: bigint;
}

interface CompoundProjection {
  daily: bigint;
  weekly: bigint;
  monthly: bigint;
  yearly: bigint;
}

/**
 * Calculate APY from emission rate and total supply
 */
export function calculateAPY(
  emissionPerSecond: bigint,
  totalSupply: bigint,
  rewardTokenPrice: number = 1,
  assetPrice: number = 1
): APYCalculation {
  if (totalSupply === BigInt(0)) {
    return {
      baseAPY: 0,
      rewardsAPY: 0,
      totalAPY: 0,
      dailyRate: 0,
      weeklyRate: 0,
      monthlyRate: 0,
      yearlyProjection: BigInt(0)
    };
  }

  // Calculate rewards per year (emission per second * seconds in year)
  const secondsPerYear = BigInt(365 * 24 * 60 * 60);
  const rewardsPerYear = emissionPerSecond * secondsPerYear;
  
  // Convert to number for percentage calculations
  const rewardsPerYearNum = Number(rewardsPerYear) / 1e18;
  const totalSupplyNum = Number(totalSupply) / 1e18;
  
  // Calculate rewards APY considering token prices
  const rewardsValue = rewardsPerYearNum * rewardTokenPrice;
  const totalValue = totalSupplyNum * assetPrice;
  const rewardsAPY = (rewardsValue / totalValue) * 100;
  
  // Base APY (from lending interest) - would need to be passed in or calculated separately
  const baseAPY = 0; // Placeholder - would be calculated from lending pool
  
  const totalAPY = baseAPY + rewardsAPY;
  
  // Calculate time-based rates
  const dailyRate = totalAPY / 365;
  const weeklyRate = totalAPY / 52;
  const monthlyRate = totalAPY / 12;
  
  return {
    baseAPY,
    rewardsAPY,
    totalAPY,
    dailyRate,
    weeklyRate,
    monthlyRate,
    yearlyProjection: rewardsPerYear
  };
}

/**
 * Calculate compound vs simple interest projections
 */
export function calculateCompoundProjection(
  principal: bigint,
  apy: number,
  compoundFrequency: 'daily' | 'weekly' | 'monthly' = 'daily'
): CompoundProjection {
  const principalNum = Number(principal) / 1e18;
  const rate = apy / 100;
  
  // Compound interest formula: A = P(1 + r/n)^(nt)
  // where n = compound frequency, t = time periods
  
  let n: number;
  switch (compoundFrequency) {
    case 'daily':
      n = 365;
      break;
    case 'weekly':
      n = 52;
      break;
    case 'monthly':
      n = 12;
      break;
  }
  
  // Calculate for different time periods
  const daily = principalNum * Math.pow(1 + rate / n, n / 365) - principalNum;
  const weekly = principalNum * Math.pow(1 + rate / n, n / 52) - principalNum;
  const monthly = principalNum * Math.pow(1 + rate / n, n / 12) - principalNum;
  const yearly = principalNum * Math.pow(1 + rate / n, n) - principalNum;
  
  return {
    daily: BigInt(Math.floor(daily * 1e18)),
    weekly: BigInt(Math.floor(weekly * 1e18)),
    monthly: BigInt(Math.floor(monthly * 1e18)),
    yearly: BigInt(Math.floor(yearly * 1e18))
  };
}

/**
 * Calculate optimal claim frequency based on gas costs
 */
export function calculateOptimalClaimFrequency(
  rewardRate: bigint, // Rewards per second
  rewardTokenPrice: number,
  gasCost: bigint, // Gas cost in Wei
  ethPrice: number
): {
  optimalDays: number;
  breakEvenAmount: bigint;
  recommendation: 'claim' | 'compound' | 'wait';
} {
  const rewardRateNum = Number(rewardRate) / 1e18;
  const gasCostUSD = (Number(gasCost) / 1e18) * ethPrice;
  
  // Calculate break-even: how much rewards needed to justify gas cost
  const breakEvenAmount = BigInt(Math.floor((gasCostUSD / rewardTokenPrice) * 1e18));
  
  // Calculate days to reach break-even
  const secondsToBreakEven = Number(breakEvenAmount) / (rewardRateNum * 1e18);
  const optimalDays = Math.ceil(secondsToBreakEven / (24 * 60 * 60));
  
  // Recommendation based on optimal frequency
  let recommendation: 'claim' | 'compound' | 'wait';
  if (optimalDays <= 1) {
    recommendation = 'compound'; // Claim frequently and auto-compound
  } else if (optimalDays <= 7) {
    recommendation = 'claim'; // Claim weekly
  } else {
    recommendation = 'wait'; // Wait for more rewards to accumulate
  }
  
  return {
    optimalDays,
    breakEvenAmount,
    recommendation
  };
}

/**
 * Calculate gas cost for claiming rewards
 */
export function estimateClaimGasCost(
  rewardCount: number,
  gasPrice: bigint,
  baseGasLimit: number = 100000
): bigint {
  // Base gas + additional gas per reward token
  const estimatedGas = baseGasLimit + (rewardCount * 50000);
  return gasPrice * BigInt(estimatedGas);
}

/**
 * Compare compound vs claim strategies
 */
export function compareStrategies(
  currentRewards: bigint,
  apy: number,
  gasCost: bigint,
  ethPrice: number,
  rewardTokenPrice: number,
  daysToCompare: number = 365
): {
  claimNow: {
    netAmount: bigint;
    fees: bigint;
  };
  compound: {
    estimatedAmount: bigint;
    gasSavings: bigint;
  };
  recommendation: string;
} {
  const gasCostUSD = (Number(gasCost) / 1e18) * ethPrice;
  const gasCostInRewardTokens = BigInt(Math.floor((gasCostUSD / rewardTokenPrice) * 1e18));
  
  // Claim now strategy
  const claimNowNet = currentRewards - gasCostInRewardTokens;
  
  // Compound strategy - estimate future value with compound interest
  const compoundProjection = calculateCompoundProjection(currentRewards, apy, 'daily');
  const futureValue = currentRewards + compoundProjection.yearly;
  
  // Gas savings from not claiming frequently
  const estimatedClaims = Math.floor(daysToCompare / 7); // Weekly claims
  const totalGasSaved = gasCostInRewardTokens * BigInt(estimatedClaims - 1);
  
  // Recommendation
  const claimNowValue = Number(claimNowNet);
  const compoundValue = Number(futureValue);
  
  let recommendation: string;
  if (compoundValue > claimNowValue * 1.1) {
    recommendation = 'Compound for better returns';
  } else if (currentRewards < gasCostInRewardTokens * BigInt(2)) {
    recommendation = 'Wait for more rewards to accumulate';
  } else {
    recommendation = 'Either strategy is viable';
  }
  
  return {
    claimNow: {
      netAmount: claimNowNet,
      fees: gasCostInRewardTokens
    },
    compound: {
      estimatedAmount: futureValue,
      gasSavings: totalGasSaved
    },
    recommendation
  };
}
