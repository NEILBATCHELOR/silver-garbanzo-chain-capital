import React from 'react';
import StatusChangeDropdown from '../status-change-dropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  DollarSign,
  TrendingDown,
  Upload,
  Download,
  Percent,
  BarChart2,
  RefreshCw,
  Pencil,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { ProductLifecycleEvent, EventStatus, LifecycleEventType } from '@/types/products';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';

interface StablecoinEventCardProps {
  event: ProductLifecycleEvent;
  onEdit?: (event: ProductLifecycleEvent) => void;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, status: EventStatus) => void;
}

/**
 * Specialized event card for stablecoin products
 */
const StablecoinEventCard: React.FC<StablecoinEventCardProps> = ({
  event,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  // Get status color based on event status
  const getStatusColor = (status: EventStatus): string => {
    switch (status) {
      case EventStatus.SUCCESS:
        return 'bg-green-500';
      case EventStatus.PENDING:
        return 'bg-amber-500';
      case EventStatus.PROCESSING:
        return 'bg-blue-500';
      case EventStatus.FAILED:
        return 'bg-red-500';
      case EventStatus.CANCELLED:
        return 'bg-slate-500';
      default:
        return 'bg-slate-500';
    }
  };

  // Get status icon based on event status
  const getStatusIcon = (status: EventStatus) => {
    switch (status) {
      case EventStatus.SUCCESS:
        return <CheckCircle className="w-4 h-4" />;
      case EventStatus.PENDING:
        return <AlertCircle className="w-4 h-4" />;
      case EventStatus.PROCESSING:
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case EventStatus.FAILED:
        return <XCircle className="w-4 h-4" />;
      case EventStatus.CANCELLED:
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Special visualization for mint (issuance) events
  if (event.eventType === LifecycleEventType.ISSUANCE) {
    return (
      <Card className="overflow-hidden relative">
        {/* Status badge at top right */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant="outline" 
            className={`${getStatusColor(event.status)} text-white`}
          >
            <span className="flex items-center">
              {getStatusIcon(event.status)}
              <span className="ml-1">{event.status}</span>
            </span>
          </Badge>
        </div>

        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">Issuance</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{format(event.eventDate, 'PPP h:mm a')}</span>
              </div>
            </div>
            
            {event.details && (
              <div className="text-base">
                {event.details}
              </div>
            )}
            
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium">${formatNumber(event.quantity || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Actor: </span>
                <span className="font-medium">{event.actor || 'System'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
              {onStatusChange && (
                <button
                  onClick={() => {
                    const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Change Status"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button 
                  onClick={() => onEdit(event)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(event.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              {/* Hidden dropdown for status change */}
              {onStatusChange && (
                <div 
                  id={`status-dropdown-${event.id}`} 
                  className="hidden absolute right-0 mt-6 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                  style={{ top: '1.5rem', right: '6rem' }}
                >
                  <div className="py-1">
                    {Object.values(EventStatus).map((status) => (
                      <button
                        key={status}
                        disabled={event.status === status}
                        className={`block w-full text-left px-4 py-2 text-sm ${event.status === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        onClick={async () => {
                          if (onStatusChange) {
                            await onStatusChange(event.id, status);
                            const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                          {status}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Special visualization for burn (redemption) events
  if (event.eventType === LifecycleEventType.REDEMPTION) {
    return (
      <Card className="overflow-hidden relative">
        {/* Status badge at top right */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant="outline" 
            className={`${getStatusColor(event.status)} text-white`}
          >
            <span className="flex items-center">
              {getStatusIcon(event.status)}
              <span className="ml-1">{event.status}</span>
            </span>
          </Badge>
        </div>

        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">Burn</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{format(event.eventDate, 'PPP h:mm a')}</span>
              </div>
            </div>
            
            {event.details && (
              <div className="text-base">
                {event.details}
              </div>
            )}
            
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium">${formatNumber(event.quantity || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Actor: </span>
                <span className="font-medium">{event.actor || 'System'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
              {onStatusChange && (
                <button
                  onClick={() => {
                    const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Change Status"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button 
                  onClick={() => onEdit(event)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(event.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              {/* Hidden dropdown for status change */}
              {onStatusChange && (
                <div 
                  id={`status-dropdown-${event.id}`} 
                  className="hidden absolute right-0 mt-6 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                  style={{ top: '1.5rem', right: '6rem' }}
                >
                  <div className="py-1">
                    {Object.values(EventStatus).map((status) => (
                      <button
                        key={status}
                        disabled={event.status === status}
                        className={`block w-full text-left px-4 py-2 text-sm ${event.status === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        onClick={async () => {
                          if (onStatusChange) {
                            await onStatusChange(event.id, status);
                            const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                          {status}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Special visualization for depeg events
  if (event.eventType === LifecycleEventType.DEPEG) {
    return (
      <Card className="overflow-hidden relative">
        {/* Status badge at top right */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant="outline" 
            className={`${getStatusColor(event.status)} text-white`}
          >
            <span className="flex items-center">
              {getStatusIcon(event.status)}
              <span className="ml-1">{event.status}</span>
            </span>
          </Badge>
        </div>

        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">Depeg</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{format(event.eventDate, 'PPP h:mm a')}</span>
              </div>
            </div>
            
            {event.details && (
              <div className="text-base">
                {event.details}
              </div>
            )}
            
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium">${formatNumber(event.quantity || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Actor: </span>
                <span className="font-medium">{event.actor || 'System'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
              {onStatusChange && (
                <button
                  onClick={() => {
                    const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Change Status"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button 
                  onClick={() => onEdit(event)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(event.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              {/* Hidden dropdown for status change */}
              {onStatusChange && (
                <div 
                  id={`status-dropdown-${event.id}`} 
                  className="hidden absolute right-0 mt-6 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                  style={{ top: '1.5rem', right: '6rem' }}
                >
                  <div className="py-1">
                    {Object.values(EventStatus).map((status) => (
                      <button
                        key={status}
                        disabled={event.status === status}
                        className={`block w-full text-left px-4 py-2 text-sm ${event.status === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        onClick={async () => {
                          if (onStatusChange) {
                            await onStatusChange(event.id, status);
                            const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                          {status}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Special visualization for rebase events
  if (event.eventType === LifecycleEventType.REBASE) {
    return (
      <Card className="overflow-hidden relative">
        {/* Status badge at top right */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant="outline" 
            className={`${getStatusColor(event.status)} text-white`}
          >
            <span className="flex items-center">
              {getStatusIcon(event.status)}
              <span className="ml-1">{event.status}</span>
            </span>
          </Badge>
        </div>

        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">Rebase</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{format(event.eventDate, 'PPP h:mm a')}</span>
              </div>
            </div>
            
            {event.details && (
              <div className="text-base">
                {event.details}
              </div>
            )}
            
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium">${formatNumber(event.quantity || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Actor: </span>
                <span className="font-medium">{event.actor || 'System'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
              {onStatusChange && (
                <button
                  onClick={() => {
                    const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Change Status"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button 
                  onClick={() => onEdit(event)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(event.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              {/* Hidden dropdown for status change */}
              {onStatusChange && (
                <div 
                  id={`status-dropdown-${event.id}`} 
                  className="hidden absolute right-0 mt-6 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                  style={{ top: '1.5rem', right: '6rem' }}
                >
                  <div className="py-1">
                    {Object.values(EventStatus).map((status) => (
                      <button
                        key={status}
                        disabled={event.status === status}
                        className={`block w-full text-left px-4 py-2 text-sm ${event.status === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        onClick={async () => {
                          if (onStatusChange) {
                            await onStatusChange(event.id, status);
                            const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                          {status}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Special visualization for liquidation events
  if (event.eventType === LifecycleEventType.LIQUIDATION) {
    return (
      <Card className="overflow-hidden relative">
        {/* Status badge at top right */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant="outline" 
            className={`${getStatusColor(event.status)} text-white`}
          >
            <span className="flex items-center">
              {getStatusIcon(event.status)}
              <span className="ml-1">{event.status}</span>
            </span>
          </Badge>
        </div>

        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">Liquidation</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{format(event.eventDate, 'PPP h:mm a')}</span>
              </div>
            </div>
            
            {event.details && (
              <div className="text-base">
                {event.details}
              </div>
            )}
            
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium">${formatNumber(event.quantity || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Actor: </span>
                <span className="font-medium">{event.actor || 'System'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
              {onStatusChange && (
                <button
                  onClick={() => {
                    const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Change Status"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button 
                  onClick={() => onEdit(event)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(event.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              {/* Hidden dropdown for status change */}
              {onStatusChange && (
                <div 
                  id={`status-dropdown-${event.id}`} 
                  className="hidden absolute right-0 mt-6 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                  style={{ top: '1.5rem', right: '6rem' }}
                >
                  <div className="py-1">
                    {Object.values(EventStatus).map((status) => (
                      <button
                        key={status}
                        disabled={event.status === status}
                        className={`block w-full text-left px-4 py-2 text-sm ${event.status === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        onClick={async () => {
                          if (onStatusChange) {
                            await onStatusChange(event.id, status);
                            const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                          {status}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Special visualization for audit events
  if (event.eventType === LifecycleEventType.AUDIT) {
    return (
      <Card className="overflow-hidden relative">
        {/* Status badge at top right */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant="outline" 
            className={`${getStatusColor(event.status)} text-white`}
          >
            <span className="flex items-center">
              {getStatusIcon(event.status)}
              <span className="ml-1">{event.status}</span>
            </span>
          </Badge>
        </div>

        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">Audit</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{format(event.eventDate, 'PPP h:mm a')}</span>
              </div>
            </div>
            
            {event.details && (
              <div className="text-base">
                {event.details}
              </div>
            )}
            
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium">${formatNumber(event.quantity || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Actor: </span>
                <span className="font-medium">{event.actor || 'System'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
              {onStatusChange && (
                <button
                  onClick={() => {
                    const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Change Status"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button 
                  onClick={() => onEdit(event)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(event.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              {/* Hidden dropdown for status change */}
              {onStatusChange && (
                <div 
                  id={`status-dropdown-${event.id}`} 
                  className="hidden absolute right-0 mt-6 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                  style={{ top: '1.5rem', right: '6rem' }}
                >
                  <div className="py-1">
                    {Object.values(EventStatus).map((status) => (
                      <button
                        key={status}
                        disabled={event.status === status}
                        className={`block w-full text-left px-4 py-2 text-sm ${event.status === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        onClick={async () => {
                          if (onStatusChange) {
                            await onStatusChange(event.id, status);
                            const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                          {status}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Use standard event card for other event types
  return (
    <Card className="overflow-hidden relative">
      {/* Status badge at top right */}
      <div className="absolute top-3 right-3">
        <Badge 
          variant="outline" 
          className={`${getStatusColor(event.status)} text-white`}
        >
          <span className="flex items-center">
            {getStatusIcon(event.status)}
            <span className="ml-1">{event.status}</span>
          </span>
        </Badge>
      </div>

      <CardContent className="pt-6 pb-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold">
              {event.eventType.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground mt-2">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{format(event.eventDate, 'PPP h:mm a')}</span>
            </div>
          </div>
          
          {event.details && (
            <div className="text-base">
              {event.details}
            </div>
          )}
          
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Amount: </span>
              <span className="font-medium">${formatNumber(event.quantity || 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Actor: </span>
              <span className="font-medium">{event.actor || 'System'}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
            {onStatusChange && (
              <button
                onClick={() => {
                  const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                  if (dropdown) dropdown.classList.toggle('hidden');
                }}
                className="text-blue-600 hover:text-blue-800"
                title="Change Status"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button 
                onClick={() => onEdit(event)}
                className="text-blue-600 hover:text-blue-800"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={() => onDelete(event.id)}
                className="text-red-600 hover:text-red-800"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            {/* Hidden dropdown for status change */}
            {onStatusChange && (
              <div 
                id={`status-dropdown-${event.id}`} 
                className="hidden absolute right-0 mt-6 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                style={{ top: '1.5rem', right: '6rem' }}
              >
                <div className="py-1">
                  {Object.values(EventStatus).map((status) => (
                    <button
                      key={status}
                      disabled={event.status === status}
                      className={`block w-full text-left px-4 py-2 text-sm ${event.status === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                      onClick={async () => {
                        if (onStatusChange) {
                          await onStatusChange(event.id, status);
                          const dropdown = document.getElementById(`status-dropdown-${event.id}`);
                          if (dropdown) dropdown.classList.add('hidden');
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                        {status}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StablecoinEventCard;