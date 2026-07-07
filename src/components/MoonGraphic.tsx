import {useEffect, useState} from 'react';
import {calculateMoonPhaseInfo} from '../lib/moonPhase';

export function MoonGraphic() {
  const [phase, setPhase] = useState(() => calculateMoonPhaseInfo(new Date()));

  useEffect(() => {
    setPhase(calculateMoonPhaseInfo(new Date()));
    const timer = setInterval(() => {
      setPhase(calculateMoonPhaseInfo(new Date()));
    }, 3600000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cream-200 to-cream-50 flex items-center justify-center moon-glow relative">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          className="text-cream-900 drop-shadow-sm transition-all duration-700"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#E6DCC3"
            strokeWidth="0.5"
            fill="#FDFCF7"
            fillOpacity="0.25"
          />
          <path
            d={phase.pathD}
            fill={phase.isFullMoon ? '#F59E0B' : '#D97706'}
          />
        </svg>
      </div>
      <p className="text-[0.68rem] font-serif text-charcoal-600 mt-2">
        {phase.lunarDayLabel} {phase.name}
      </p>
    </div>
  );
}
