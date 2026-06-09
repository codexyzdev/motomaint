'use client';

interface FABProps {
  onClick: () => void;
}

export default function FAB({ onClick }: FABProps) {
  return (
    <button
      className="fab"
      onClick={onClick}
      aria-label="Registrar mantenimiento"
      type="button"
    >
      <span aria-hidden="true">+</span>
      <span className="fab-text">Registrar mantenimiento</span>
    </button>
  );
}
