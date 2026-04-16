import { useRef, useState, useEffect, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

type PullToRefreshProps = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const scrollTop = useRef(0);

  const PULL_THRESHOLD = 80; // Trigger refresh when pulled past 80px
  const MAX_PULL = 120; // Maximum pull distance

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Touch event handlers for iOS compatibility
    const handleTouchStart = (e: TouchEvent) => {
      // Only start tracking if we're at the top of the scroll container
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        scrollTop.current = container.scrollTop;
        setIsDragging(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Only allow pull down when at top
      if (container.scrollTop === 0 && diff > 0) {
        // Prevent default scrolling behavior when pulling down
        e.preventDefault();

        // Apply resistance (rubber band effect)
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, MAX_PULL);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging) return;

      setIsDragging(false);

      // Trigger refresh if pulled past threshold
      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Reset if not past threshold
        setPullDistance(0);
      }
    };

    // Mouse event handlers for desktop testing
    const handleMouseDown = (e: MouseEvent) => {
      if (container.scrollTop === 0) {
        startY.current = e.clientY;
        scrollTop.current = container.scrollTop;
        setIsDragging(true);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || isRefreshing) return;

      currentY.current = e.clientY;
      const diff = currentY.current - startY.current;

      if (container.scrollTop === 0 && diff > 0) {
        e.preventDefault();
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, MAX_PULL);
        setPullDistance(distance);
      }
    };

    const handleMouseUp = async () => {
      if (!isDragging) return;

      setIsDragging(false);

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    // Add touch event listeners (iOS)
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    // Add mouse event listeners (desktop)
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isRefreshing, pullDistance, onRefresh]);

  // Calculate indicator opacity and rotation
  const opacity = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = (pullDistance / MAX_PULL) * 360;
  const scale = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-32 relative">
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <div
          className="bg-purple-500 text-white rounded-full p-2 shadow-lg"
          style={{
            opacity,
            transform: `scale(${scale}) rotate(${isRefreshing ? 0 : rotation}deg)`,
            transition: isRefreshing ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <RefreshCw
            size={20}
            className={isRefreshing ? 'animate-spin' : ''}
          />
        </div>
      </div>

      {/* Content wrapper with pull distance offset */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
