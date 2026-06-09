'use client';

import { ICONS } from '@/lib/icons';

interface IconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
}

export default function IconPicker({ selected, onSelect }: IconPickerProps) {
  return (
    <div className="icon-picker">
      {ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          className={`icon-picker-item ${selected === icon ? 'selected' : ''}`}
          onClick={() => onSelect(icon)}
          aria-label={`Seleccionar ${icon}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
