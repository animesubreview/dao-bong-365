import { cn } from '../lib/utils';

const REACTIONS = [
  { value: 1, emoji: '🤢', label: 'Tệ' },
  { value: 2, emoji: '😕', label: 'Tạm' },
  { value: 3, emoji: '😊', label: 'Hay' },
  { value: 4, emoji: '😘', label: 'Thích' },
  { value: 5, emoji: '🥰', label: 'Tuyệt' },
];

interface EmojiRatingProps {
  value: number;
  onRate?: (stars: number) => void;
  readOnly?: boolean;
}

export default function EmojiRating({ value, onRate, readOnly = false }: EmojiRatingProps) {
  return (
    <div className="flex items-center justify-between sm:justify-start sm:gap-6 gap-1.5 w-full sm:w-auto">
      {REACTIONS.map(r => (
        <button
          key={r.value}
          type="button"
          disabled={readOnly}
          onClick={() => onRate?.(r.value)}
          className={cn(
            'flex flex-col items-center gap-1 transition-transform shrink-0',
            !readOnly && 'hover:scale-110 cursor-pointer'
          )}
        >
          <span className={cn('text-2xl', value === r.value ? 'opacity-100' : 'opacity-50')}>{r.emoji}</span>
          <span className={cn('text-[10px] font-bold', value === r.value ? 'text-yellow-400' : 'text-slate-500')}>
            {r.label}
          </span>
        </button>
      ))}
    </div>
  );
}
