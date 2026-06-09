'use client';

import { Registro } from '@/lib/types';
import { formatDate, formatNumber } from '@/lib/helpers';

interface HistoryItemProps {
  record: Registro;
  onDelete: (id: string) => void;
}

export default function HistoryItem({ record, onDelete }: HistoryItemProps) {
  return (
    <div className="history-item">
      <div className="history-icon">{record.serviceIcon}</div>
      <div className="history-info">
        <div className="history-title">{record.serviceName}</div>
        <div className="history-meta">
          {formatNumber(record.km)} km · {formatDate(record.date)}
        </div>
        {record.notes && (
          <div className="history-notes">{record.notes}</div>
        )}
      </div>
      <button
        className="history-delete"
        onClick={() => onDelete(record.id)}
        aria-label="Eliminar registro"
      >
        🗑️
      </button>
    </div>
  );
}
