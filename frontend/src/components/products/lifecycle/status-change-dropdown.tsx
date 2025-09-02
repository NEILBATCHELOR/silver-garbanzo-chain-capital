import React, { useState } from 'react';
import { EventStatus } from '@/types/products';
import { Loader2 } from 'lucide-react';

interface StatusChangeDropdownProps {
  eventId: string;
  currentStatus: EventStatus;
  onStatusChange: (eventId: string, newStatus: EventStatus) => Promise<void>;
}

/**
 * Reusable dropdown component for changing event status
 */
const StatusChangeDropdown: React.FC<StatusChangeDropdownProps> = ({
  eventId,
  currentStatus,
  onStatusChange
}) => {
  const [isChangingStatus, setIsChangingStatus] = useState(false);

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

  return (
    <div className="relative inline-block">
      <button
        onClick={() => {
          const dropdown = document.getElementById(`status-dropdown-${eventId}`);
          if (dropdown) {
            dropdown.classList.toggle('hidden');
          }
        }}
        className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
        disabled={isChangingStatus}
      >
        {isChangingStatus ? (
          <span className="flex items-center">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Updating...
          </span>
        ) : (
          <span className="flex items-center">
            Status
          </span>
        )}
      </button>
      <div 
        id={`status-dropdown-${eventId}`} 
        className="hidden absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
      >
        <div className="py-1">
          {Object.values(EventStatus).map((status) => (
            <button
              key={status}
              disabled={currentStatus === status || isChangingStatus}
              className={`block w-full text-left px-4 py-2 text-sm ${currentStatus === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
              onClick={async () => {
                setIsChangingStatus(true);
                try {
                  await onStatusChange(eventId, status);
                } finally {
                  setIsChangingStatus(false);
                  const dropdown = document.getElementById(`status-dropdown-${eventId}`);
                  if (dropdown) {
                    dropdown.classList.add('hidden');
                  }
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
    </div>
  );
};

export default StatusChangeDropdown;