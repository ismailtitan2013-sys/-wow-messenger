import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Heart } from 'lucide-react';

const GiftEffectOverlay = ({ gift, senderName, onClose }) => {
  const canvasRef = useRef(null);

  // Воспроизведение праздничного звукового эффекта через Web Audio API
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        
        // Мажорный праздничный аккорд (C5 - E5 - G5 - C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.85);
        });
      }
    } catch (e) {
      console.log('Audio effect skipped');
    }
  }, []);

  // Анимация конфетти и частичек подарков на Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#fbbf24'];
    const emojis = [gift?.icon || '🎁', '✨', '⭐', '💎', '👑', '🎉', '🌟'];

    // Создаем 60 физических частичек
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 24 + 16,
        color: colors[Math.floor(Math.random() * colors.length)],
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        life: 1
      });
    }

    let animationId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // гравитация
        p.rotation += p.vRot;
        p.life -= 0.008;
        p.opacity = Math.max(0, p.life);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (idx % 2 === 0) {
          ctx.font = `${p.size}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.emoji, 0, 0);
        } else {
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      if (particles.some(p => p.life > 0)) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [gift]);

  return (
    <div className="gift-effect-overlay" onClick={onClose}>
      <canvas ref={canvasRef} className="gift-canvas" />

      <div className="gift-effect-card pop-in" onClick={e => e.stopPropagation()}>
        <button className="gift-effect-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="gift-rays-bg" />

        <div className="gift-icon-bounce">
          <span className="gift-emoji-main">{gift?.icon || '🎁'}</span>
        </div>

        <div className="gift-effect-title">
          <Sparkles color="#f59e0b" size={24} className="sparkle-spin" />
          <span>ЭФФЕКТ ПОДАРКА!</span>
          <Sparkles color="#f59e0b" size={24} className="sparkle-spin" />
        </div>

        <div className="gift-effect-name">{gift?.name || 'Прекрасный Подарок'}</div>

        {senderName && (
          <div className="gift-effect-sender">
            <Heart color="#ec4899" size={16} fill="#ec4899" />
            <span>Преподнес(ла): <strong>@{senderName}</strong></span>
          </div>
        )}

        {gift?.message && (
          <div className="gift-effect-msg">
            "{gift.message}"
          </div>
        )}

        <div className="gift-effect-value">
          🪙 Ценность: <strong>{gift?.coins || gift?.price || 100} Coins</strong>
        </div>

        <button className="btn gift-effect-btn" onClick={onClose}>
          ✨ Принять Подарок ✨
        </button>
      </div>
    </div>
  );
};

export default GiftEffectOverlay;
