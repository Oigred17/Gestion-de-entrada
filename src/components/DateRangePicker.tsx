import { useEffect, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, X } from 'lucide-react';
import 'react-day-picker/style.css';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #CAC6C7',
  background: '#FFFFFF',
  fontSize: 14,
  color: '#1C1819',
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const fmt = (iso: string) =>
  iso ? format(parseISO(iso), "d 'de' MMM yyyy", { locale: es }) : '';

export default function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected: DateRange | undefined =
    startDate || endDate
      ? {
          from: startDate ? parseISO(startDate) : undefined,
          to: endDate ? parseISO(endDate) : undefined,
        }
      : undefined;

  const handleSelect = (range?: DateRange) => {
    if (range?.from) {
      onRangeChange(
        format(range.from, 'yyyy-MM-dd'),
        range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd'),
      );
      if (range.from && range.to) setOpen(false);
    }
  };

  const handleClear = () => {
    onRangeChange('', '');
    setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'flex-end' }}
    >
      <div style={{ minWidth: 150 }}>
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#5F5657',
            marginBottom: 6,
          }}
        >
          <Calendar size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Desde
        </label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOpen(true);
          }}
          style={FIELD_STYLE}
        >
          <span style={{ color: startDate ? '#1C1819' : '#85787A' }}>
            {startDate ? fmt(startDate) : 'Seleccionar'}
          </span>
          <Calendar size={15} color="#85787A" />
        </div>
      </div>

      <div style={{ minWidth: 150 }}>
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#5F5657',
            marginBottom: 6,
          }}
        >
          <Calendar size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Hasta
        </label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOpen(true);
          }}
          style={FIELD_STYLE}
        >
          <span style={{ color: endDate ? '#1C1819' : '#85787A' }}>
            {endDate ? fmt(endDate) : 'Seleccionar'}
          </span>
          <Calendar size={15} color="#85787A" />
        </div>
      </div>

      {open && (
        <div className="cobao-range-popover">
          <DayPicker
            className="cobao-range"
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={1}
            defaultMonth={startDate ? parseISO(startDate) : new Date()}
            locale={es}
            weekStartsOn={1}
          />
          <div className="cobao-range-footer">
            <span style={{ fontSize: 12, color: '#85787A' }}>
              Selecciona el inicio y el fin del periodo
            </span>
            <button
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                border: 'none',
                background: '#F0EFEF',
                color: '#5F5657',
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <X size={13} />
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
