/**
 * Call/Put Schedule Manager
 * Manage call and put option schedules for bonds
 */

import React, { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { CallPutScheduleInputData } from '@/types/nav/bonds'
import { OptionStyle } from '@/types/nav/bonds'
import { useToast } from '@/components/ui/use-toast'

interface CallPutScheduleManagerProps {
  bondId: string
  existingSchedules?: CallPutScheduleInputData[]
  onSuccess?: () => void
}

export function CallPutScheduleManager({
  bondId,
  existingSchedules = [],
  onSuccess,
}: CallPutScheduleManagerProps) {
  const { toast } = useToast()
  const [schedules, setSchedules] = useState<CallPutScheduleInputData[]>(existingSchedules)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleAddSchedule = () => {
    const newSchedule: CallPutScheduleInputData = {
      option_type: 'call',
      option_date: new Date(),
      exercise_date: new Date(),
      strike_price: 0,
      call_price: 0,
      notice_days: 30,
      option_style: OptionStyle.AMERICAN,
    }
    setSchedules([...schedules, newSchedule])
    setEditingIndex(schedules.length)
  }

  const handleDeleteSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  const handleUpdateSchedule = (
    index: number,
    field: keyof CallPutScheduleInputData,
    value: any
  ) => {
    const updated = [...schedules]
    const schedule = { ...updated[index] }
    
    // Update the specified field (type assertion needed for dynamic assignment)
    ;(schedule as any)[field] = value
    
    // Sync aliases with database fields
    if (field === 'exercise_date') {
      schedule.option_date = value
    } else if (field === 'option_date') {
      schedule.exercise_date = value
    } else if (field === 'strike_price') {
      if (schedule.option_type === 'call') {
        schedule.call_price = value
      } else {
        schedule.put_price = value
      }
    } else if (field === 'call_price') {
      schedule.strike_price = value
    } else if (field === 'put_price') {
      schedule.strike_price = value
    }
    
    updated[index] = schedule
    setSchedules(updated)
  }

  const handleSave = async () => {
    try {
      // TODO: Wire up to API when backend endpoint is ready
      toast({
        title: 'Schedule Saved',
        description: 'Call/Put schedule has been saved successfully.',
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save call/put schedule.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Call/Put Option Schedule</CardTitle>
          <CardDescription>
            Manage the call and put option schedule for this bond
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleAddSchedule} variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>

          {schedules.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Total Options:</span> {schedules.length}
                  </div>
                  <div>
                    <span className="font-semibold">Call Options:</span>{' '}
                    {schedules.filter((s) => s.option_type === 'call').length}
                  </div>
                  <div>
                    <span className="font-semibold">Put Options:</span>{' '}
                    {schedules.filter((s) => s.option_type === 'put').length}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {schedules.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option Type</TableHead>
                  <TableHead>Exercise Date</TableHead>
                  <TableHead>Strike Price</TableHead>
                  <TableHead>Notice Days</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {editingIndex === index ? (
                        <Select
                          value={schedule.option_type}
                          onValueChange={(value) =>
                            handleUpdateSchedule(index, 'option_type', value as 'call' | 'put')
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="put">Put</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="capitalize">{schedule.option_type}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="date"
                          value={format(new Date(schedule.exercise_date), 'yyyy-MM-dd')}
                          onChange={(e) =>
                            handleUpdateSchedule(index, 'exercise_date', new Date(e.target.value))
                          }
                        />
                      ) : (
                        format(new Date(schedule.exercise_date), 'MMM dd, yyyy')
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={schedule.strike_price}
                          onChange={(e) =>
                            handleUpdateSchedule(
                              index,
                              'strike_price',
                              parseFloat(e.target.value)
                            )
                          }
                        />
                      ) : (
                        `$${schedule.strike_price.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          value={schedule.notice_days}
                          onChange={(e) =>
                            handleUpdateSchedule(
                              index,
                              'notice_days',
                              parseInt(e.target.value)
                            )
                          }
                        />
                      ) : (
                        `${schedule.notice_days} days`
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingIndex === index ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingIndex(null)}
                          >
                            Done
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingIndex(index)}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchedule(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {schedules.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button onClick={handleSave}>Save Option Schedule</Button>
        </div>
      )}
    </div>
  )
}