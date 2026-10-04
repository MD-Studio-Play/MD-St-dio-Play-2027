import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-10 border-t border-white/[0.06] mt-8 text-neutral-400 text-sm">
      {/* Left count string: Página 1 de 6 (78 pacotes) */}
      <div className="font-medium text-neutral-400 select-none">
        Página {currentPage} de {totalPages} ({totalItems} pacotes)
      </div>

      {/* Right controls: «  < Anterior  Próximo >  » */}
      <div className="flex items-center gap-2">
        {/* First Page button « */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Primeira página"
          className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-white/10 bg-black/40 text-neutral-300 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Anterior button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 sm:px-3.5 py-1.5 rounded-lg border border-white/10 bg-black/40 text-neutral-300 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer text-xs sm:text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        {/* Numeric Indicators on mobile/desktop */}
        <div className="hidden md:flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentPage === pageNum
                  ? 'bg-white/15 text-white border border-white/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        {/* Próximo button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 sm:px-3.5 py-1.5 rounded-lg border border-white/10 bg-black/40 text-neutral-300 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer text-xs sm:text-sm font-medium"
        >
          <span>Próximo</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page button » */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Última página"
          className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-white/10 bg-black/40 text-neutral-300 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
