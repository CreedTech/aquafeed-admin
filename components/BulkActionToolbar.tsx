import { X } from 'lucide-react';

interface BulkAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'danger' | 'default' | 'outline';
}

interface BulkActionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionToolbar({
  selectedCount,
  onClear,
  actions,
  className = '',
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white shadow-2xl border border-gray-200 p-2 pl-4 rounded-full animate-in slide-in-from-bottom-10 fade-in duration-300 ${className}`}
    >
      <div className="flex items-center gap-3 border-r border-gray-200 pr-4">
        <span className="bg-primary/10 text-primary font-bold text-sm px-2.5 py-0.5 rounded-md">
          {selectedCount}
        </span>
        <span className="text-sm font-medium text-gray-700">Selected</span>
        <button
          onClick={onClear}
          className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              action.variant === 'danger'
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                : action.variant === 'outline'
                ? 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
