/**
 * Anti-Flickering Configuration for Token Forms
 * Provides settings to minimize UI flickering and improve performance
 */

export interface AntiFlickerConfig {
  // Input field optimizations
  inputDebounceMs: number;
  validationDebounceMs: number;
  autoFormatOnBlurOnly: boolean;
  
  // Validation optimizations
  minFieldsBeforeValidation: number;
  skipValidationDuringTyping: boolean;
  adaptiveDebouncing: boolean;
  
  // Debug tracking optimizations
  conditionalDebugTracking: boolean;
  debugTrackingThrottle: number;
  
  // Performance optimizations
  batchStateUpdates: boolean;
  memoizeValidationResults: boolean;
}

export const ANTI_FLICKER_CONFIGS = {
  // Optimized for smooth typing experience
  SMOOTH_TYPING: {
    inputDebounceMs: 50,
    validationDebounceMs: 3000,
    autoFormatOnBlurOnly: true,
    minFieldsBeforeValidation: 2,
    skipValidationDuringTyping: true,
    adaptiveDebouncing: true,
    conditionalDebugTracking: true,
    debugTrackingThrottle: 2000,
    batchStateUpdates: true,
    memoizeValidationResults: true
  } as AntiFlickerConfig,
  
  // Balanced between responsiveness and performance
  BALANCED: {
    inputDebounceMs: 300,
    validationDebounceMs: 1000,
    autoFormatOnBlurOnly: false,
    minFieldsBeforeValidation: 1,
    skipValidationDuringTyping: false,
    adaptiveDebouncing: true,
    conditionalDebugTracking: true,
    debugTrackingThrottle: 300,
    batchStateUpdates: true,
    memoizeValidationResults: false
  } as AntiFlickerConfig,
  
  // Aggressive validation (may cause more flickering)
  AGGRESSIVE: {
    inputDebounceMs: 100,
    validationDebounceMs: 500,
    autoFormatOnBlurOnly: false,
    minFieldsBeforeValidation: 0,
    skipValidationDuringTyping: false,
    adaptiveDebouncing: false,
    conditionalDebugTracking: false,
    debugTrackingThrottle: 100,
    batchStateUpdates: false,
    memoizeValidationResults: false
  } as AntiFlickerConfig
};

export const DEFAULT_ANTI_FLICKER_CONFIG = ANTI_FLICKER_CONFIGS.SMOOTH_TYPING;

/**
 * Hook to get current anti-flicker configuration
 */
export const useAntiFlickerConfig = (mode: keyof typeof ANTI_FLICKER_CONFIGS = 'SMOOTH_TYPING') => {
  return ANTI_FLICKER_CONFIGS[mode];
};

/**
 * Utility to check if debug tracking should be throttled
 */
export const shouldThrottleDebugTracking = (
  lastTrackTime: number,
  config: AntiFlickerConfig
): boolean => {
  if (!config.conditionalDebugTracking) return false;
  
  const now = Date.now();
  return (now - lastTrackTime) < config.debugTrackingThrottle;
};