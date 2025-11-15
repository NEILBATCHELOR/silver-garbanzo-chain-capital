/**
 * Window Validator
 * Validates that redemption request is within an active redemption window
 * and not during a blackout period
 */

import { supabase } from '@/infrastructure/database/client';
import type { RedemptionRequest, ValidatorResult } from '../types';
import { BlackoutPeriodManager } from '../services/BlackoutPeriodManager';

export class WindowValidator {
  private blackoutManager: BlackoutPeriodManager;

  constructor() {
    this.blackoutManager = new BlackoutPeriodManager();
  }

  async validate(request: RedemptionRequest): Promise<ValidatorResult> {
    try {
      // First check for blackout periods (most restrictive)
      const blackoutCheck = await this.blackoutManager.isInBlackoutPeriod(
        request.tokenId,
        'redemption'
      );

      if (blackoutCheck.isInBlackout) {
        return {
          passed: false,
          message: blackoutCheck.message,
          errorCode: 'BLACKOUT_PERIOD',
          metadata: {
            tokenId: request.tokenId,
            blackoutPeriod: blackoutCheck.blackoutPeriod
          }
        };
      }

      // Query active redemption windows for this token
      const { data: windows, error } = await supabase
        .from('redemption_windows')
        .select('*')
        .eq('project_id', request.tokenId)
        .eq('status', 'active')
        .lte('submission_start_date', new Date().toISOString())
        .gte('submission_end_date', new Date().toISOString());

      if (error) {
        return {
          passed: false,
          message: `Error checking redemption windows: ${error.message}`,
          errorCode: 'WINDOW_CHECK_ERROR'
        };
      }

      if (!windows || windows.length === 0) {
        return {
          passed: false,
          message: 'No active redemption window available for this token',
          errorCode: 'NO_ACTIVE_WINDOW',
          metadata: {
            tokenId: request.tokenId
          }
        };
      }

      // Use the first active window
      const window = windows[0];

      return {
        passed: true,
        message: `Active redemption window available until ${window.submission_end_date}`,
        metadata: {
          windowId: window.id,
          windowStart: window.submission_start_date,
          windowEnd: window.submission_end_date,
          windowStatus: window.status
        }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Window validation error: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }
}
