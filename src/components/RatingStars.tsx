import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface RatingStarsProps {
  value: number;
  onRate?: (stars: number) => void;
  size?: number;
  readOnly?: boolean;
}

export default function RatingStars({ value, onRate, size = 20, readOnly = false }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onRate?.(n)}
          className={cn(
            'transition-transform',
            !readOnly && 'hover:scale-110 cursor-pointer',
            readOnly && 'cursor-default'
          )}
        >
          <Star
            size={size}
            className={cn(n <= Math.round(value) ? 'fill-current text-yellow-400' : 'text-slate-600')}
          />
        </button>
      ))}
    </div>
  );
}
