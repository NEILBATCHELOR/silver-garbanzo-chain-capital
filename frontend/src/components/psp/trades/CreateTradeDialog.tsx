/**
 * Create Trade Dialog Component
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CreateTradeRequest } from '@/types/psp'

interface CreateTradeDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateTradeRequest) => Promise<void>
  projectId: string
}

export function CreateTradeDialog({ open, onClose, onSubmit, projectId }: CreateTradeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Partial<CreateTradeRequest>>({
    project_id: projectId,
    source_symbol: 'USD',
    destination_symbol: 'USDC',
    destination_network: 'ethereum'
  })

  const handleSubmit = async () => {
    if (!data.source_symbol || !data.source_amount || !data.destination_symbol) return
    setLoading(true)
    try {
      await onSubmit(data as CreateTradeRequest)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Trade</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Currency</Label>
              <Select value={data.source_symbol} onValueChange={(v) => setData({ ...data, source_symbol: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={data.source_amount || ''} onChange={(e) => setData({ ...data, source_amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>To Currency</Label>
              <Select value={data.destination_symbol} onValueChange={(v) => setData({ ...data, destination_symbol: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {data.destination_symbol !== 'USD' && (
              <div className="space-y-2">
                <Label>Network</Label>
                <Select value={data.destination_network} onValueChange={(v) => setData({ ...data, destination_network: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Creating...' : 'Create Trade'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
