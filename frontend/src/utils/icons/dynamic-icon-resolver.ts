// =====================================================
// DYNAMIC ICON RESOLVER
// Dynamically imports and resolves Lucide React icons by name
// Supports all 1500+ Lucide React icons with fallback handling
// =====================================================

import { ComponentType, memo } from 'react';
import * as LucideIcons from 'lucide-react';

// Type for Lucide icon components
type IconComponent = ComponentType<{ className?: string; size?: number | string; strokeWidth?: number | string; [key: string]: any }>;

// Cache for resolved icons to improve performance
const iconCache = new Map<string, IconComponent>();

/**
 * Dynamically resolve a Lucide React icon by name
 * Supports all Lucide React icon names with smart fallbacks
 */
export const resolveIcon = (iconName: string | undefined): IconComponent => {
  // Handle undefined/null icon names
  if (!iconName) {
    return LucideIcons.Layout as IconComponent; // Default fallback icon
  }

  // Check cache first
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!;
  }

  // Try direct lookup in LucideIcons
  const directIcon = (LucideIcons as any)[iconName] as IconComponent;
  if (directIcon && typeof directIcon === 'function') {
    iconCache.set(iconName, directIcon);
    return directIcon;
  }

  // Try common variations and fallbacks
  const variations = [
    iconName, // Try exact name first
    iconName.charAt(0).toUpperCase() + iconName.slice(1), // Capitalize first letter
    iconName.replace(/[-_]/g, ''), // Remove hyphens/underscores
    iconName.toLowerCase(),
    iconName.toUpperCase(),
    // Convert kebab-case to PascalCase
    iconName.replace(/[-_](.)/g, (_, char) => char.toUpperCase()),
    // Convert snake_case to PascalCase  
    iconName.replace(/_(.)/g, (_, char) => char.toUpperCase()),
    // Handle common icon name patterns
    iconName.replace(/([a-z])([A-Z])/g, '$1$2'), // Keep existing camelCase
    iconName.replace(/^([a-z])/g, (_, char) => char.toUpperCase()) // Ensure first char is uppercase
  ];

  // Try each variation
  for (const variation of variations) {
    const icon = (LucideIcons as any)[variation] as IconComponent;
    if (icon && typeof icon === 'function') {
      iconCache.set(iconName, icon);
      return icon;
    }
  }

  // Special mappings for common icon name mismatches
  const specialMappings: Record<string, keyof typeof LucideIcons> = {
    // Common aliases
    'dashboard': 'LayoutDashboard',
    'user': 'User',
    'users': 'Users',
    'settings': 'Settings',
    'home': 'Home',
    'house': 'House',
    'menu': 'Menu',
    'close': 'X',
    'cross': 'X',
    'add': 'Plus',
    'plus': 'Plus',
    'minus': 'Minus',
    'edit': 'Pencil',
    'delete': 'Trash2',
    'remove': 'Trash2',
    'save': 'Save',
    'search': 'Search',
    'filter': 'Filter',
    'sort': 'ArrowUpDown',
    'upload': 'Upload',
    'download': 'Download',
    'file': 'File',
    'folder': 'Folder',
    'document': 'FileText',
    'image': 'Image',
    'video': 'Video',
    'audio': 'Volume2',
    'link': 'ExternalLink',
    'mail': 'Mail',
    'email': 'Mail',
    'phone': 'Phone',
    'calendar': 'Calendar',
    'clock': 'Clock',
    'time': 'Clock',
    'date': 'Calendar',
    'location': 'MapPin',
    'map': 'Map',
    'star': 'Star',
    'heart': 'Heart',
    'like': 'ThumbsUp',
    'dislike': 'ThumbsDown',
    'thumbsup': 'ThumbsUp',
    'thumbsdown': 'ThumbsDown',
    'check': 'Check',
    'checkmark': 'Check',
    'warning': 'AlertTriangle',
    'error': 'AlertCircle',
    'info': 'Info',
    'help': 'HelpCircle',
    'question': 'HelpCircle',
    'lock': 'Lock',
    'unlock': 'Unlock',
    'security': 'Shield',
    'shield': 'Shield',
    'eye': 'Eye',
    'hide': 'EyeOff',
    'show': 'Eye',
    'visible': 'Eye',
    'invisible': 'EyeOff',
    'refresh': 'RefreshCw',
    'reload': 'RefreshCw',
    'sync': 'RefreshCw',
    'loading': 'Loader2',
    'spinner': 'Loader2',
    'chevronup': 'ChevronUp',
    'chevrondown': 'ChevronDown',
    'chevronleft': 'ChevronLeft',
    'chevronright': 'ChevronRight',
    'arrowup': 'ArrowUp',
    'arrowdown': 'ArrowDown',
    'arrowleft': 'ArrowLeft',
    'arrowright': 'ArrowRight',
    'back': 'ArrowLeft',
    'forward': 'ArrowRight',
    'next': 'ArrowRight',
    'previous': 'ArrowLeft',
    'prev': 'ArrowLeft',
    // Specific sidebar icon mappings
    'UserRoundPlus': 'UserRoundPlus',
    'Landmark': 'Landmark',
    'Layers': 'Layers',
    'Blocks': 'Box', // Blocks doesn't exist, use Box
    'Grid2x2Check': 'Grid3x3', // Grid2x2Check doesn't exist, use Grid3x3
    'WalletCards': 'Wallet', // WalletCards doesn't exist, use Wallet
    'LayoutDashboard': 'LayoutDashboard',
    'FileText': 'FileText',
    'Package': 'Package',
    'Combine': 'Merge', // Combine doesn't exist, use Merge
    'Factory': 'Building', // Factory doesn't exist, use Building
    'Zap': 'Zap',
    'Trophy': 'Trophy',
    'Leaf': 'Leaf',
    'Gauge': 'Gauge',
    'TrendingUp': 'TrendingUp',
    'Building': 'Building',
    'FileCog': 'Settings', // FileCog doesn't exist, use Settings
    'Wallet': 'Wallet',
    'Scale': 'Scale',
    'ChartCandlestick': 'BarChart3', // ChartCandlestick doesn't exist, use BarChart3
    'CircleUser': 'UserCircle', // CircleUser doesn't exist, use UserCircle
    'UserRoundCog': 'UserRoundCog',
    'Activity': 'Activity'
  };

  // Try special mappings with both original case and lowercase
  const lowerIconName = iconName.toLowerCase();
  const specialMapping = specialMappings[iconName] || specialMappings[lowerIconName];
  if (specialMapping) {
    const icon = LucideIcons[specialMapping] as IconComponent;
    if (icon) {
      iconCache.set(iconName, icon);
      return icon;
    }
  }

  // Log unresolved icons for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Icon "${iconName}" not found, using fallback.`);
  }

  // Ultimate fallback
  const fallbackIcon = LucideIcons.Layout as IconComponent;
  iconCache.set(iconName, fallbackIcon);
  return fallbackIcon;
};

/**
 * Create a memoized icon component for better performance
 */
export const createIconComponent = (iconName: string | undefined): IconComponent => {
  const IconComponent = resolveIcon(iconName);
  
  // Return a memoized version to prevent unnecessary re-renders
  return memo(IconComponent);
};

/**
 * Get all available Lucide icon names for debugging/development
 */
export const getAvailableIconNames = (): string[] => {
  return Object.keys(LucideIcons).filter(key => {
    const component = (LucideIcons as any)[key];
    return typeof component === 'function';
  });
};

/**
 * Check if an icon name exists in Lucide React
 */
export const isValidIconName = (iconName: string): boolean => {
  if (!iconName) return false;
  
  try {
    const resolved = resolveIcon(iconName);
    return resolved !== LucideIcons.Layout || iconName.toLowerCase() === 'layout';
  } catch {
    return false;
  }
};

/**
 * Clear the icon cache (useful for testing or memory management)
 */
export const clearIconCache = (): void => {
  iconCache.clear();
};

/**
 * Get cache statistics for debugging
 */
export const getIconCacheStats = () => {
  return {
    size: iconCache.size,
    entries: Array.from(iconCache.keys())
  };
};
