'use client';

interface ExportControlsProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  exporting: string | null;
  disabled?: boolean;
}

export default function ExportControls({
  onExportPDF,
  onExportExcel,
  onExportCSV,
  exporting,
  disabled = false
}: ExportControlsProps) {
  return (
    <div className="card bg-neutral-50 border-neutral-200">
      <h4 className="text-body font-semibold text-neutral-800 mb-4">
        Export Data
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onExportPDF}
          disabled={disabled || exporting === 'pdf'}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {exporting === 'pdf' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Exporting...
            </>
          ) : (
            <>
              <span>📄</span>
              PDF Report
            </>
          )}
        </button>

        <button
          onClick={onExportExcel}
          disabled={disabled || exporting === 'excel'}
          className="btn-success flex items-center justify-center gap-2"
        >
          {exporting === 'excel' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Exporting...
            </>
          ) : (
            <>
              <span>📊</span>
              Excel Report
            </>
          )}
        </button>

        <button
          onClick={onExportCSV}
          disabled={disabled || exporting === 'csv'}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          {exporting === 'csv' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Exporting...
            </>
          ) : (
            <>
              <span>📋</span>
              CSV Ledger
            </>
          )}
        </button>
      </div>

      <p className="text-caption text-neutral-500 mt-4">
        💡 Exports data for the selected date range (CSV includes all-time customer data)
      </p>
    </div>
  );
}













