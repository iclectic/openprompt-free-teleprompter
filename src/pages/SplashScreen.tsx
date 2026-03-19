import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

const SplashScreen = ({ onComplete, minDuration = 2000 }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), minDuration);
    const removeTimer = setTimeout(onComplete, minDuration + 400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete, minDuration]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundColor: '#0f1117',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(16,185,129,0.12) 0%, transparent 60%)',
        }}
      />

      {/* Icon */}
      <div className="relative mb-8">
        <svg
          width="88"
          height="88"
          viewBox="0 0 192 192"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="192" height="192" rx="40" fill="#0f1117" />
          <rect
            x="4" y="4" width="184" height="184" rx="36"
            fill="#0f1117" stroke="#10b981" strokeWidth="2" strokeOpacity="0.3"
          />
          <path d="M72 56 L136 96 L72 136Z" fill="#10b981" />
          <rect x="56" y="148" width="80" height="3" rx="1.5" fill="#10b981" opacity="0.4" />
          <rect x="64" y="156" width="64" height="3" rx="1.5" fill="#10b981" opacity="0.25" />
          <rect x="72" y="164" width="48" height="3" rx="1.5" fill="#10b981" opacity="0.15" />
          <rect x="56" y="28" width="80" height="3" rx="1.5" fill="#10b981" opacity="0.15" />
          <rect x="64" y="36" width="64" height="3" rx="1.5" fill="#10b981" opacity="0.25" />
          <rect x="72" y="44" width="48" height="3" rx="1.5" fill="#10b981" opacity="0.4" />
        </svg>
      </div>

      {/* App name */}
      <h1
        className="text-3xl font-bold tracking-tight"
        style={{ color: '#f0f0f0' }}
      >
        Cuevora
      </h1>

      {/* Tagline */}
      <p
        className="mt-2 text-sm font-medium"
        style={{ color: '#10b981' }}
      >
        Teleprompter features, actually free.
      </p>

      {/* Loading dots */}
      <div className="mt-10 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: '#10b981',
              animation: `splash-dot 1s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
