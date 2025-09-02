/**
 * Enhanced Token Upload Dialog Integration Patch
 * 
 * This patch integrates the EnhancedTokenDetector into the main upload dialog
 * to fix the NCIRF token mapping issue and properly handle hybrid tokens.
 */

import { EnhancedTokenDetector, TokenDetectionResult } from '../utils/enhanced-token-detection';
import { TokenStandard, TokenFormData } from '../types';

// Enhanced processing function to replace the existing processJsonData function
export const processJsonDataWithEnhancedDetection = (jsonData: any): ProcessingResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Use enhanced detection logic
    const detectionResult: TokenDetectionResult = EnhancedTokenDetector.detectTokenStandard(jsonData);
    
    // Log detection results for debugging
    console.log('🔍 Enhanced Token Detection Results:', {
      standard: detectionResult.detectedStandard,
      confidence: detectionResult.confidence,
      isHybrid: detectionResult.isHybrid,
      hybridStandards: detectionResult.hybridStandards,
      reasons: detectionResult.reasons
    });

    // Generate warnings for hybrid tokens
    if (detectionResult.isHybrid) {
      warnings.push(
        `Hybrid token detected: Primary standard is ${detectionResult.detectedStandard}, ` +
        `references ${detectionResult.hybridStandards?.join(', ') || 'other standards'}`
      );
    }

    // Generate warnings for low confidence
    if (detectionResult.confidence < 70) {
      warnings.push(
        `Standard detection confidence is ${detectionResult.confidence}%. ` +
        `Consider verifying the token standard.`
      );
    }

    // Structure analysis
    const structureAnalysis = {
      hasStandardProperties: detectionResult.confidence > 50,
      hasArrayData: Object.values(jsonData).some(value => Array.isArray(value)),
      hasNestedConfig: Object.values(jsonData).some(value => 
        value && typeof value === 'object' && !Array.isArray(value) && 
        Object.keys(value).length > 2
      ),
      estimatedComplexity: detectionResult.isHybrid ? 'complex' as const : 
                          detectionResult.confidence > 80 ? 'medium' as const : 'simple' as const
    };

    // Count detected fields
    const fieldsDetected = Object.keys(detectionResult.mappedData).length;

    return {
      isValid: true,
      errors: [], // Never block uploads with enhanced detection
      warnings,
      mappedData: detectionResult.mappedData,
      detectedStandard: detectionResult.detectedStandard,
      rawData: jsonData,
      fieldsDetected,
      structureAnalysis
    };

  } catch (error) {
    console.error('Enhanced detection failed:', error);
    errors.push(`Enhanced detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Fallback to accepting raw data
    return {
      isValid: true, // Still don't block
      errors,
      warnings: ['Enhanced detection failed, uploading raw JSON data'],
      mappedData: {
        standard: TokenStandard.ERC20, // Default fallback
        ...jsonData // Include all raw data
      },
      detectedStandard: TokenStandard.ERC20,
      rawData: jsonData,
      fieldsDetected: Object.keys(jsonData).length,
      structureAnalysis: {
        hasStandardProperties: false,
        hasArrayData: false,
        hasNestedConfig: true,
        estimatedComplexity: 'complex' as const
      }
    };
  }
};

// Type definition for the processing result
interface ProcessingResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  mappedData?: Partial<TokenFormData>;
  detectedStandard?: TokenStandard;
  rawData?: any;
  fieldsDetected?: number;
  structureAnalysis?: {
    hasStandardProperties: boolean;
    hasArrayData: boolean;
    hasNestedConfig: boolean;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

// Test function specifically for NCIRF token
export const testNCIRFTokenMapping = (ncirfJson: any) => {
  const result = processJsonDataWithEnhancedDetection(ncirfJson);
  
  console.log('🧪 NCIRF Token Test Results:', {
    detectedStandard: result.detectedStandard,
    mappedToERC20Properties: !!result.mappedData?.erc20Properties,
    fieldsDetected: result.fieldsDetected,
    hasComplexObjects: result.structureAnalysis?.hasNestedConfig,
    configMode: result.mappedData?.configMode,
    warnings: result.warnings
  });

  return result;
};

export default processJsonDataWithEnhancedDetection;
