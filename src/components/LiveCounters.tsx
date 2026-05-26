
"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n-context';

function Counter({ value, label, isCountdown = false }: { value: number, label: string, isCountdown?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const increment = value / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="text-center p-8 border-r border-white/5 last:border-r-0 group hover:bg-primary/5 transition-all duration-500">
      <div className="text-4xl md:text-6xl font-headline font-black text-white mb-2 tracking-tighter">
        {displayValue}{!isCountdown && '+'}
      </div>
      <div className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-primary font-bold">
        {label}
      </div>
    </div>
  );
}

export function LiveCounters() {
  const { t } = useLanguage();

  return (
    <section className="relative z-20 -mt-20 max-w-7xl mx-auto px-6">
      <div className="bg-card/80 backdrop-blur-xl border border-white/10 shadow-2xl grid grid-cols-2 lg:grid-cols-4">
        <Counter value={450} label={t('counter_members')} />
        <Counter value={24} label={t('counter_events')} />
        <Counter value={85} label={t('counter_works')} />
        <Counter value={12} label={t('counter_countdown')} isCountdown />
      </div>
    </section>
  );
}
