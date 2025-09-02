// ERC-1155 URI Mappings Tab - Metadata Mapping
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Link, FileText } from 'lucide-react';
import { TokenERC1155UriMappingsData, ConfigMode } from '../../types';

interface ERC1155UriMappingsTabProps {
  data?: TokenERC1155UriMappingsData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1155UriMappingsTab: React.FC<ERC1155UriMappingsTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const addNewMapping = () => {
    const newMapping: TokenERC1155UriMappingsData = {
      token_type_id: '',
      uri: ''
    };
    onFieldChange('newRecord', newMapping, data.length);
  };

  const removeMapping = (index: number) => {
    if (confirm('Remove this URI mapping?')) {
      onFieldChange('removeRecord', null, index);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              URI Mappings ({data.length})
            </CardTitle>
            <Button onClick={addNewMapping} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((mapping, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Token Type ID</Label>
                      <Input
                        value={mapping.token_type_id || ''}
                        onChange={(e) => handleFieldChange(index, 'token_type_id', e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>URI</Label>
                      <Input
                        value={mapping.uri || ''}
                        onChange={(e) => handleFieldChange(index, 'uri', e.target.value)}
                        placeholder="https://api.example.com/metadata/{id}.json"
                      />
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeMapping(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No URI mappings defined. Map token types to their metadata URIs.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ERC1155UriMappingsTab;