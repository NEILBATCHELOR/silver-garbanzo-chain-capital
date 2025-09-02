/**
 * File Handling Domain Types
 * Types specific to file upload, processing, and management
 */

/**
 * File upload interface for multipart form data
 */
export interface FileUpload {
  filename: string
  mimetype: string
  encoding: string
  file: NodeJS.ReadableStream
}

/**
 * Processed file result structure
 */
export interface ProcessedFile {
  originalName: string
  fileName: string
  path: string
  size: number
  mimeType: string
  checksum: string
}
