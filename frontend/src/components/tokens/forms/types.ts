export interface EditFormProps {
  tokenId: string;
  mode: 'basic' | 'advanced';
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
  enableDebug?: boolean;
}

export interface TabConfig {
  id: string;
  label: string;
  table: string;
  description: string;
  isRelational: boolean;
  fields: string[];
}

export interface TokenEditFormState {
  activeTab: string;
  tokenData: any;
  propertiesData: any;
  relatedData: Record<string, any[]>;
  isLoading: boolean;
  errors: Record<string, string[]>;
  isDirty: boolean;
}

export interface FieldConfig {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'array';
  label: string;
  description?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  showInBasic?: boolean;
  showInAdvanced?: boolean;
}
