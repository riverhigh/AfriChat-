import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

/**
 * AGC Splash Screen — shown once per session on first app load.
 * Auto-dismisses after 2.2s with a fade-out animation.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    // Fade-in complete → hold
    const holdTimer = setTimeout(() => setPhase('hold'), 500);
    // Begin fade-out
    const outTimer = setTimeout(() => setPhase('out'), 1800);
    // Notify parent after fade-out finishes
    const doneTimer = setTimeout(() => onDone(), 2300);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(outTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #06020d 0%, #0d0520 60%, #12063a 100%)',
        opacity: phase === 'in' ? 0 : phase === 'hold' ? 1 : 0,
        transition: phase === 'in'
          ? 'opacity 0.5s ease-out'
          : phase === 'out'
          ? 'opacity 0.5s ease-in'
          : 'none',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* Logo */}
      <div
        style={{
          width: 128,
          height: 128,
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)',
          marginBottom: 24,
          transform: phase === 'in' ? 'scale(0.75)' : 'scale(1)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <img
          src="/icon-512.png"
          alt="AGC Logo"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* App name */}
      <h1
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          margin: 0,
          lineHeight: 1,
        }}
      >
        AGC
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 13,
          fontWeight: 400,
          color: 'rgba(167, 139, 250, 0.85)',
          marginTop: 8,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Africa's Super App
      </p>

      {/* Subtle pulse ring */}
      <div
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          animation: 'agc-splash-ring 1.6s ease-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: '50%',
          border: '1px solid rgba(139, 92, 246, 0.1)',
          animation: 'agc-splash-ring 1.6s ease-out 0.4s infinite',
        }}
      />

      <style>{`
        @keyframes agc-splash-ring {
          0% { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
