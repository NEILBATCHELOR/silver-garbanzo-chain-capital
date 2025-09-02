import { supabase, executeWithRetry } from '@/infrastructure/database/client';
import { 
  NotificationSettings,
  CreateNotificationSettingsRequest,
  UpdateNotificationSettingsRequest
} from '@/types/notifications';
import { LifecycleEventType } from '@/types/products';
import { NotificationChannel, EmailTemplate } from '@/types/notifications';

/**
 * Service for managing notification settings
 */
class NotificationSettingsService {
  /**
   * Validate if a project ID exists in the projects table
   * @param projectId Project ID to validate
   * @returns boolean indicating if project exists
   */
  private async validateProjectId(projectId: string): Promise<boolean> {
    try {
      const { data, error } = await executeWithRetry(() => supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single());
        
      if (error && error.code !== 'PGRST116') {
        console.warn('Error validating project ID:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.warn('Error in validateProjectId:', error);
      return false;
    }
  }

  /**
   * Get notification settings for a user
   * @param userId User ID
   * @param projectId Optional project ID for project-specific settings
   * @returns NotificationSettings or null if not found
   */
  public async getNotificationSettings(
    userId: string,
    projectId?: string
  ): Promise<NotificationSettings | null> {
    try {
      let query = supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId);
        
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        query = query.is('project_id', null);
      }
      
      const { data, error } = await executeWithRetry(() => query.single());
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        console.error('Error fetching notification settings:', error);
        throw error;
      }
      
      if (!data) return null;
      
      return this.transformSettingsFromDB(data);
    } catch (error) {
      console.error('Error in getNotificationSettings:', error);
      throw error;
    }
  }
  
  /**
   * Create notification settings
   * @param settings Notification settings to create
   * @returns Created notification settings
   */
  public async createNotificationSettings(
    settings: CreateNotificationSettingsRequest
  ): Promise<NotificationSettings> {
    try {
      // Validate project ID if provided
      if (settings.projectId) {
        const projectExists = await this.validateProjectId(settings.projectId);
        if (!projectExists) {
          console.warn(`Project ID ${settings.projectId} does not exist. Creating settings without project_id.`);
          // Create settings without project_id to avoid foreign key constraint violation
          const settingsWithoutProject = { ...settings, projectId: undefined };
          const { data, error } = await executeWithRetry(() => supabase
            .from('notification_settings')
            .insert(this.transformSettingsToDB(settingsWithoutProject))
            .select()
            .single());
            
          if (error) {
            console.error('Error creating notification settings without project_id:', error);
            throw error;
          }
          
          return this.transformSettingsFromDB(data);
        }
      }

      const { data, error } = await executeWithRetry(() => supabase
        .from('notification_settings')
        .insert(this.transformSettingsToDB(settings))
        .select()
        .single());
        
      if (error) {
        console.error('Error creating notification settings:', error);
        
        // If it's a foreign key constraint error, try again without project_id
        if (error.code === '23503' && error.message.includes('project_id')) {
          console.warn('Foreign key constraint error detected. Retrying without project_id.');
          const settingsWithoutProject = { ...settings, projectId: undefined };
          const { data: retryData, error: retryError } = await executeWithRetry(() => supabase
            .from('notification_settings')
            .insert(this.transformSettingsToDB(settingsWithoutProject))
            .select()
            .single());
            
          if (retryError) {
            console.error('Error creating notification settings on retry:', retryError);
            throw retryError;
          }
          
          return this.transformSettingsFromDB(retryData);
        }
        
        throw error;
      }
      
      return this.transformSettingsFromDB(data);
    } catch (error) {
      console.error('Error in createNotificationSettings:', error);
      throw error;
    }
  }
  
  /**
   * Update notification settings
   * @param id Notification settings ID
   * @param settings Settings to update
   * @returns Updated notification settings
   */
  public async updateNotificationSettings(
    id: string,
    settings: UpdateNotificationSettingsRequest
  ): Promise<NotificationSettings> {
    try {
      const { data, error } = await executeWithRetry(() => supabase
        .from('notification_settings')
        .update(this.transformSettingsToDB(settings))
        .eq('id', id)
        .select()
        .single());
        
      if (error) {
        console.error('Error updating notification settings:', error);
        throw error;
      }
      
      return this.transformSettingsFromDB(data);
    } catch (error) {
      console.error('Error in updateNotificationSettings:', error);
      throw error;
    }
  }
  
  /**
   * Delete notification settings
   * @param id Notification settings ID
   * @returns Success status
   */
  public async deleteNotificationSettings(id: string): Promise<boolean> {
    try {
      const { error } = await executeWithRetry(() => supabase
        .from('notification_settings')
        .delete()
        .eq('id', id));
        
      if (error) {
        console.error('Error deleting notification settings:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteNotificationSettings:', error);
      throw error;
    }
  }
  
  /**
   * Get or create default notification settings for a user
   * @param userId User ID
   * @param projectId Optional project ID
   * @returns Notification settings
   */
  public async getOrCreateDefaultSettings(
    userId: string,
    projectId?: string
  ): Promise<NotificationSettings> {
    try {
      const existingSettings = await this.getNotificationSettings(userId, projectId);
      
      if (existingSettings) {
        return existingSettings;
      }
      
      // Validate project ID before creating settings
      let validatedProjectId = projectId;
      if (projectId) {
        const projectExists = await this.validateProjectId(projectId);
        if (!projectExists) {
          console.warn(`Project ID ${projectId} does not exist. Creating default settings without project_id.`);
          validatedProjectId = undefined;
        }
      }
      
      // Create default settings
      const defaultSettings: CreateNotificationSettingsRequest = {
        userId,
        projectId: validatedProjectId,
        eventTypes: [], // Empty array means all event types
        notificationChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        emailRecipients: [],
        emailTemplate: EmailTemplate.DEFAULT,
        advanceNoticeDays: [1, 7, 30],
        disabled: false
      };
      
      return await this.createNotificationSettings(defaultSettings);
    } catch (error) {
      console.error('Error in getOrCreateDefaultSettings:', error);
      
      // Return default settings object without creating in database if there's an error
      return {
        id: 'default', // Temporary ID
        userId,
        projectId: undefined, // Don't include invalid project_id in fallback
        eventTypes: [],
        notificationChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        emailRecipients: [],
        emailTemplate: EmailTemplate.DEFAULT,
        advanceNoticeDays: [1, 7, 30],
        disabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }
  
  /**
   * Transform settings from database format to application format
   * @param data Database format
   * @returns Application format
   */
  private transformSettingsFromDB(data: any): NotificationSettings {
    return {
      id: data.id,
      userId: data.user_id,
      projectId: data.project_id,
      eventTypes: data.event_types as LifecycleEventType[] || [],
      notificationChannels: data.notification_channels as NotificationChannel[] || 
        [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      emailRecipients: data.email_recipients || [],
      emailTemplate: data.email_template as EmailTemplate || EmailTemplate.DEFAULT,
      advanceNoticeDays: data.advance_notice_days || [1, 7, 30],
      disabled: data.disabled || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Transform settings from application format to database format
   * @param settings Application format
   * @returns Database format
   */
  private transformSettingsToDB(settings: CreateNotificationSettingsRequest | UpdateNotificationSettingsRequest): any {
    const dbSettings: any = {};
    
    if ('userId' in settings) {
      dbSettings.user_id = settings.userId;
    }
    
    if ('projectId' in settings && settings.projectId !== undefined) {
      dbSettings.project_id = settings.projectId;
    }
    
    if (settings.eventTypes !== undefined) {
      dbSettings.event_types = settings.eventTypes;
    }
    
    if (settings.notificationChannels !== undefined) {
      dbSettings.notification_channels = settings.notificationChannels;
    }
    
    if (settings.emailRecipients !== undefined) {
      dbSettings.email_recipients = settings.emailRecipients;
    }
    
    if (settings.emailTemplate !== undefined) {
      dbSettings.email_template = settings.emailTemplate;
    }
    
    if (settings.advanceNoticeDays !== undefined) {
      dbSettings.advance_notice_days = settings.advanceNoticeDays;
    }
    
    if (settings.disabled !== undefined) {
      dbSettings.disabled = settings.disabled;
    }
    
    // Add updated_at
    dbSettings.updated_at = new Date().toISOString();
    
    return dbSettings;
  }
}

export const notificationSettingsService = new NotificationSettingsService();
