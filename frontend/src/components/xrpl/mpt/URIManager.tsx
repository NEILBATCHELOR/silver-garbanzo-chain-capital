import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export type URICategory = 'website' | 'social' | 'docs' | 'other'

export interface URI {
  uri: string
  category: URICategory
  title: string
}

interface URIManagerProps {
  uris: URI[]
  onChange: (uris: URI[]) => void
  disabled?: boolean
}

const categoryLabels: Record<URICategory, string> = {
  website: 'Website',
  social: 'Social Media',
  docs: 'Documentation',
  other: 'Other'
}

const categoryPlaceholders: Record<URICategory, string> = {
  website: 'https://example.com',
  social: 'https://twitter.com/example',
  docs: 'https://docs.example.com',
  other: 'https://...'
}

export const URIManager: React.FC<URIManagerProps> = ({
  uris,
  onChange,
  disabled = false
}) => {
  const [newURI, setNewURI] = useState<URI>({
    uri: '',
    category: 'website',
    title: ''
  })

  const handleAddURI = () => {
    if (!newURI.uri || !newURI.title) return

    onChange([...uris, newURI])
    setNewURI({
      uri: '',
      category: 'website',
      title: ''
    })
  }

  const handleRemoveURI = (index: number) => {
    onChange(uris.filter((_, i) => i !== index))
  }

  const handleUpdateURI = (index: number, field: keyof URI, value: string) => {
    const updated = [...uris]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Existing URIs */}
      {uris.length > 0 && (
        <div className="space-y-2">
          {uris.map((uri, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={uri.category}
                    onValueChange={(value) => handleUpdateURI(index, 'category', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={uri.uri}
                    onChange={(e) => handleUpdateURI(index, 'uri', e.target.value)}
                    placeholder={categoryPlaceholders[uri.category]}
                    disabled={disabled}
                  />
                </div>

                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={uri.title}
                    onChange={(e) => handleUpdateURI(index, 'title', e.target.value)}
                    placeholder="e.g., Official Website"
                    disabled={disabled}
                  />
                </div>

                <div className="col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveURI(index)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add New URI */}
      <Card className="p-4 bg-muted/50">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Add URI</Label>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3">
              <Select
                value={newURI.category}
                onValueChange={(value) => setNewURI({ ...newURI, category: value as URICategory })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-4">
              <Input
                value={newURI.uri}
                onChange={(e) => setNewURI({ ...newURI, uri: e.target.value })}
                placeholder={categoryPlaceholders[newURI.category]}
                disabled={disabled}
              />
            </div>

            <div className="col-span-4">
              <Input
                value={newURI.title}
                onChange={(e) => setNewURI({ ...newURI, title: e.target.value })}
                placeholder="e.g., Official Website"
                disabled={disabled}
              />
            </div>

            <div className="col-span-1">
              <Button
                type="button"
                size="icon"
                onClick={handleAddURI}
                disabled={disabled || !newURI.uri || !newURI.title}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {uris.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No URIs added yet. Add links to your website, social media, documentation, etc.
        </p>
      )}
    </div>
  )
}
