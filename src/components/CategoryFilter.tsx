import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CATEGORIES } from '../data/packs';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);

  const offsetRef = useRef(0);
  const singleSetWidthRef = useRef(0);
  const isPointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const isHoveredRef = useRef(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  // Measure width of one set of categories plus track gap for pixel-perfect loop
  const measureSetWidth = useCallback(() => {
    if (firstSetRef.current && trackRef.current) {
      const rect = firstSetRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        const computedStyle = window.getComputedStyle(trackRef.current);
        const gap = parseFloat(computedStyle.gap || computedStyle.columnGap || '10') || 10;
        singleSetWidthRef.current = rect.width + gap;
      }
    }
  }, []);

  useEffect(() => {
    measureSetWidth();

    // Re-measure on window resize
    const handleResize = () => {
      measureSetWidth();
    };
    window.addEventListener('resize', handleResize);

    // Continuous slow rotating animation using requestAnimationFrame and transform3d
    let animId: number;
    let lastTime = performance.now();
    const NORMAL_SPEED = 28; // pixels per second (smooth, relaxed, slow rotation)
    const HOVER_SPEED = 10;  // slower when hovered for easy interaction

    const step = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1); // prevent huge jumps on tab switch
      lastTime = now;

      if (singleSetWidthRef.current <= 0) {
        measureSetWidth();
      }

      // Only advance when not actively dragging with mouse/finger
      if (!isPointerDownRef.current && trackRef.current && singleSetWidthRef.current > 0) {
        const currentSpeed = isHoveredRef.current ? HOVER_SPEED : NORMAL_SPEED;
        offsetRef.current += currentSpeed * delta;

        // Seamless wrap around when reaching the width of one full set
        const setWidth = singleSetWidthRef.current;
        if (offsetRef.current >= setWidth) {
          offsetRef.current -= setWidth;
        } else if (offsetRef.current < 0) {
          offsetRef.current += setWidth;
        }

        trackRef.current.style.transform = `translate3d(-${offsetRef.current.toFixed(2)}px, 0, 0)`;
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [measureSetWidth]);

  // Pointer Down (handles both mouse and touch)
  const handlePointerDown = (clientX: number) => {
    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = clientX;
    startOffsetRef.current = offsetRef.current;
  };

  // Pointer Move
  const handlePointerMove = (clientX: number) => {
    if (!isPointerDownRef.current || !trackRef.current) return;
    const dx = clientX - startXRef.current;

    if (Math.abs(dx) > 5) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsGrabbing(true);
      }
    }

    if (isDraggingRef.current) {
      let newOffset = startOffsetRef.current - dx;
      const setWidth = singleSetWidthRef.current;

      if (setWidth > 0) {
        while (newOffset >= setWidth) newOffset -= setWidth;
        while (newOffset < 0) newOffset += setWidth;
      }

      offsetRef.current = newOffset;
      trackRef.current.style.transform = `translate3d(-${newOffset.toFixed(2)}px, 0, 0)`;
    }
  };

  // Pointer Up
  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    setIsGrabbing(false);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  // Category item click handler
  const handleCategoryClick = (catUpper: string) => {
    if (isDraggingRef.current) return; // Prevent click if user was dragging
    onSelectCategory(catUpper);
  };

  // Helper to render one set of categories
  const renderCategorySet = (setPrefix: string, setRef?: React.RefObject<HTMLDivElement | null>) => (
    <div
      ref={setRef}
      className="flex items-center gap-2 sm:gap-2.5 shrink-0"
    >
      {CATEGORIES.map((category) => {
        const catUpper = category.toUpperCase();
        const isActive =
          selectedCategory.toUpperCase() === catUpper ||
          (catUpper === 'TODOS' &&
            (selectedCategory.toUpperCase() === 'TODOS' || selectedCategory === 'Todos'));

        return (
          <button
            key={`${setPrefix}-${catUpper}`}
            type="button"
            onClick={() => handleCategoryClick(catUpper)}
            className={`whitespace-nowrap text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-full transition-colors duration-150 shrink-0 font-extrabold uppercase tracking-wide border cursor-pointer select-none ${
              isActive
                ? 'bg-[#ea8c00] text-white border-[#ea8c00] shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40'
                : 'bg-black text-white border-neutral-700 hover:border-neutral-400 hover:bg-neutral-900 active:scale-95'
            }`}
          >
            {catUpper}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="w-full my-5 relative px-1 sm:px-4 overflow-hidden select-none"
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
        if (isPointerDownRef.current) {
          handlePointerUp();
        }
      }}
      onMouseDown={(e) => handlePointerDown(e.pageX)}
      onMouseMove={(e) => handlePointerMove(e.pageX)}
      onMouseUp={handlePointerUp}
      onTouchStart={(e) => handlePointerDown(e.touches[0].pageX)}
      onTouchMove={(e) => handlePointerMove(e.touches[0].pageX)}
      onTouchEnd={handlePointerUp}
      style={{
        cursor: isGrabbing ? 'grabbing' : 'grab',
      }}
    >
      {/* Subtle edge gradient fades */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#0b0c0e] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#0b0c0e] to-transparent z-10" />

      {/* Smooth Continuous Infinite Track */}
      <div
        ref={trackRef}
        className="flex items-center gap-2 sm:gap-2.5 py-1.5 will-change-transform"
        style={{
          transform: 'translate3d(0, 0, 0)',
        }}
      >
        {/* Set 1 (measured for width) */}
        {renderCategorySet('set1', firstSetRef)}
        {/* Set 2 (seamless continuation) */}
        {renderCategorySet('set2')}
        {/* Set 3 (ensures seamlessness on ultra-wide screens) */}
        {renderCategorySet('set3')}
        {/* Set 4 (safety for ultra-wide displays) */}
        {renderCategorySet('set4')}
      </div>
    </div>
  );
};
