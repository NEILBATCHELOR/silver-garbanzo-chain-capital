// Document Upload Utilities
// Reusable functions to prevent duplicate uploads across all document upload components
// Created: August 11, 2025

import { supabase } from "@/infrastructure/database/client";

export interface DocumentUploadConfig {
  entityId: string;
  documentType: string;
  documentName: string;
  file: File;
  filePath: string;
  bucketName: string;
  tableName: string;
  entityIdField: string; // 'issuer_id', 'investor_id', 'project_id', etc.
  additionalData?: Record<string, any>;
}

export interface DocumentUploadResult {
  success: boolean;
  error?: string;
  documentId?: string;
  fileUrl?: string;
}

/**
 * Comprehensive document upload function with duplicate prevention
 * Works with any document table and storage bucket
 */
export async function uploadDocumentSafely(config: DocumentUploadConfig): Promise<DocumentUploadResult> {
  const {
    entityId,
    documentType,
    documentName,
    file,
    filePath,
    bucketName,
    tableName,
    entityIdField,
    additionalData = {}
  } = config;

  try {
    // Step 1: Verify user authentication
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      return {
        success: false,
        error: 'Authentication required. Please sign in and try again.'
      };
    }

    // Step 2: Check for existing documents to prevent duplicates
    const { data: existingDocs, error: checkError } = await supabase
      .from(tableName)
      .select('id')
      .eq(entityIdField, entityId)
      .eq('document_type', documentType)
      .eq('document_name', documentName)
      .in('status', ['active', 'pending_review', 'pending']);

    if (checkError) {
      return {
        success: false,
        error: `Duplicate check failed: ${checkError.message}`
      };
    }

    if (existingDocs && existingDocs.length > 0) {
      return {
        success: false,
        error: `A document with the name "${documentName}" and type "${documentType}" already exists. Please use a different name or delete the existing document first.`
      };
    }

    // Step 3: Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (uploadError) {
      // Enhanced error handling for RLS issues
      if (uploadError.message?.includes('row-level security policy') || uploadError.message?.includes('policy')) {
        return {
          success: false,
          error: 'Upload blocked by security policy. This usually means missing storage permissions. Please contact your administrator to configure storage RLS policies for document uploads.'
        };
      }
      return {
        success: false,
        error: uploadError.message
      };
    }

    // Step 4: Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // Step 5: Create database record
    const documentRecord = {
      [entityIdField]: entityId,
      document_type: documentType,
      document_name: documentName,
      file_url: urlData.publicUrl,
      status: additionalData.status || 'active',
      created_by: currentUser.id,
      updated_by: currentUser.id,
      metadata: {
        original_filename: file.name,
        file_size: file.size,
        file_type: file.type,
        upload_path: filePath
      },
      ...additionalData
    };

    const { data: dbData, error: dbError } = await supabase
      .from(tableName)
      .insert(documentRecord)
      .select('id')
      .single();

    if (dbError) {
      // Clean up uploaded file if database operation fails
      await supabase.storage.from(bucketName).remove([filePath]);
      return {
        success: false,
        error: `Database insert failed: ${dbError.message}`
      };
    }

    return {
      success: true,
      documentId: dbData?.id,
      fileUrl: urlData.publicUrl
    };

  } catch (error: any) {
    // Clean up any uploaded file on unexpected error
    try {
      await supabase.storage.from(bucketName).remove([filePath]);
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded file:', cleanupError);
    }

    return {
      success: false,
      error: error.message || 'An unexpected error occurred during upload'
    };
  }
}

/**
 * Enhanced form submission handler that prevents multiple submissions
 */
export function createUploadSubmissionHandler<T>(
  uploadFn: (formData: T) => Promise<void>,
  isUploading: boolean
) {
  return async (formData: T) => {
    // Prevent multiple submissions
    if (isUploading) {
      console.warn('Upload already in progress, ignoring duplicate submission');
      return;
    }

    await uploadFn(formData);
  };
}

/**
 * Enhanced button click handler that prevents multiple clicks during upload
 */
export function preventMultipleClicks(isUploading: boolean) {
  return (e: React.MouseEvent) => {
    if (isUploading) {
      e.preventDefault();
      return false;
    }
  };
}

/**
 * Generate unique file path for document upload
 */
export function generateDocumentFilePath(
  entityType: string, // 'issuers', 'investors', 'projects'
  entityId: string,
  documentType: string,
  fileName: string
): string {
  const fileExt = fileName.split('.').pop();
  const timestamp = Date.now();
  const uniqueFileName = `${entityId}_${documentType}_${timestamp}.${fileExt}`;
  return `${entityType}/${entityId}/documents/${uniqueFileName}`;
}

/**
 * Standard form reset configuration
 */
export function getStandardFormReset(documentType?: string) {
  return {
    documentName: "",
    documentType: documentType || "",
    isPublic: false,
  };
}

/**
 * Enhanced error messages for common upload failures
 */
export function getEnhancedErrorMessage(error: string): string {
  if (error.includes('security policy')) {
    return `${error}\n\nAdministrator Fix Required:\nStorage RLS policies need to be configured. Execute the SQL script in scripts/immediate-storage-fix.sql in your Supabase dashboard.`;
  }
  
  if (error.includes('already exists')) {
    return `${error}\n\nTo resolve: Either choose a different document name or delete the existing document first.`;
  }
  
  if (error.includes('Authentication required')) {
    return `${error}\n\nPlease refresh the page and sign in again.`;
  }
  
  return error;
}
