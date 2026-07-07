import {useCallback, useState} from 'react';

const HEART_EMOJIS = ['💖', '💕', '🌸', '☁️', '🐱', '🐶'];

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

export function useHeartParticles() {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  const spawnHeart = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random();
    const emoji = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
    setHearts((prev) => [...prev, {id, x, y, emoji}]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1200);
  }, []);

  const celebrate = useCallback(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        spawnHeart(cx + (Math.random() * 200 - 100), cy + (Math.random() * 200 - 100));
      }, i * 60);
    }
  }, [spawnHeart]);

  const overlay = (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="heart-float text-xl select-none absolute"
          style={{left: h.x - 10, top: h.y - 12}}
        >
          {h.emoji}
        </div>
      ))}
    </div>
  );

  return {spawnHeart, celebrate, overlay};
}
