import { useRef, useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}

const SWIPE_THRESHOLD = 84;
const MAX_SWIPE = 112;

export function SwipeableRow({
  children,
  onDelete,
  deleteLabel = 'Eliminar',
}: SwipeableRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const horizontalLockRef = useRef<boolean | null>(null);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 1) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    horizontalLockRef.current = null;
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!dragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    if (horizontalLockRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      horizontalLockRef.current = Math.abs(dx) > Math.abs(dy) * 1.4 && dx < 0;
    }

    if (horizontalLockRef.current) {
      const clamped = Math.max(-MAX_SWIPE, Math.min(0, dx));
      setOffsetX(clamped);
    }
  }

  function handleTouchEnd() {
    setDragging(false);
    if (offsetX <= -SWIPE_THRESHOLD) {
      setOffsetX(0);
      onDelete();
    } else {
      setOffsetX(0);
    }
    horizontalLockRef.current = null;
  }

  const triggered = offsetX <= -SWIPE_THRESHOLD;

  return (
    <div className="relative overflow-hidden rounded-md">
      {/* Fondo de acción destructiva al deslizar */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-end px-gutter-lg rounded-md transition-colors duration-100 ${
          triggered ? 'bg-error text-on-error' : 'bg-error-container text-error'
        }`}
      >
        <div className="flex items-center gap-gutter-xs font-label text-label-md">
          <Trash2 className="w-4 h-4" />
          <span>{deleteLabel}</span>
        </div>
      </div>

      {/* Contenido deslizable */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: `translate3d(${offsetX}px, 0, 0)`,
          transition: dragging ? 'none' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
        }}
        className="relative z-10"
      >
        {children}
      </div>
    </div>
  );
}
