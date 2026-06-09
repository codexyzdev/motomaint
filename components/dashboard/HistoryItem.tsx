'use client';

import { Registro } from '@/lib/types';
import { formatDate, formatNumber } from '@/lib/helpers';

interface HistoryItemProps {
  record: Registro;
  onDelete: (id: string) => void;
}

export default function HistoryItem({ record, onDelete }: HistoryItemProps) {
  return (
    <article className="history-item">
      <div className="history-icon">{record.serviceIcon}</div>
      <div className="history-info">
        <h3 className="history-title">{record.serviceName}</h3>
        <div className="history-meta">
          <span>{formatNumber(record.km)} km</span>
          <span className="dot" aria-hidden="true" />
          <span>{formatDate(record.date)}</span>
        </div>
        {record.notes && (
          <p className="history-notes">{record.notes}</p>
        )}
      </div>
      <button
        className="history-delete"
        onClick={() => onDelete(record.id)}
        aria-label="Eliminar registro"
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </article>
  );
}
