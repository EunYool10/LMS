import React, { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;

      setScrollProgress(progress);
      setIsVisible(scrollTop > 380);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          id="btn-back-to-top"
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={scrollToTop}
          aria-label="맨 위로 이동"
          title={`맨 위로 이동 (${scrollProgress}%)`}
          className="fixed right-[calc(1rem+env(safe-area-inset-right,0px))] sm:right-6 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] sm:bottom-6 z-50 p-3 rounded-full bg-white/95 backdrop-blur-md text-slate-700 hover:text-indigo-600 shadow-lg hover:shadow-xl border border-slate-200/80 transition-all duration-200 hover:-translate-y-1 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 group flex items-center justify-center cursor-pointer select-none touch-manipulation"
        >
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              className="text-slate-100"
              strokeWidth="2.5"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              className="text-indigo-600 transition-all duration-150"
              strokeWidth="2.5"
              strokeDasharray={125.6}
              strokeDashoffset={125.6 - (125.6 * scrollProgress) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          <ChevronUp className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 relative z-10" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
