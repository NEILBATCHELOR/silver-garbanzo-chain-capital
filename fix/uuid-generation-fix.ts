  /**
   * Generate unique ID using proper UUID format with collision avoidance
   */
  private generateUniqueId(): string {
    // Use crypto.randomUUID() for proper UUID format
    return crypto.randomUUID();
  }

  // Add counter for ID generation (keeping for backward compatibility)
  private idCounter = 0;