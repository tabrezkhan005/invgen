'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  disabled?: boolean;
}

export default function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  disabled = false
}: DateRangeSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDateChange = (field: keyof DateRange, value: string) => {
    onDateRangeChange({
      ...dateRange,
      [field]: value
    });
  };


  const getDateRangeText = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
    }
    return 'Select date range';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-heading-3 mb-1">Analytics Period</h3>
          <p className="text-body-sm text-neutral-600">
            {getDateRangeText()}
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-secondary"
          disabled={disabled}
        >
          {isExpanded ? 'Done' : 'Change Dates'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="start-date" className="block text-body-sm font-medium text-neutral-700 mb-3">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="input"
                disabled={disabled}
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-body-sm font-medium text-neutral-700 mb-3">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="input"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="mt-4 text-caption text-neutral-500">
            💡 Data will be filtered to show only invoices within this date range
          </div>
        </div>
      )}
    </div>
  );
}
