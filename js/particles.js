// ============================================================
//  particles.js — Partículas flutuantes de fundo
// ============================================================

function initParticles() {
  const container = document.getElementById('particles-bg');
  if (!container) return;

  const colors = [
    'rgba(37,99,235,0.6)',
    'rgba(96,165,250,0.5)',
    'rgba(52,211,153,0.5)',
    'rgba(124,58,237,0.4)',
    'rgba(245,158,11,0.3)',
  ];

  const count = 25;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const size   = Math.random() * 4 + 2;
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const left   = Math.random() * 100;
    const delay  = Math.random() * 15;
    const duration = Math.random() * 15 + 10;

    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
      box-shadow: 0 0 ${size * 2}px ${color};
    `;

    container.appendChild(particle);
  }
}

// ============================================================
//  confetti.js — Efeito de confetti ao finalizar
// ============================================================

function launchConfetti() {
  const colors = ['#2563eb','#60a5fa','#34d399','#f59e0b','#a78bfa','#fb923c','#f472b6'];
  const count  = 80;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';

      const size    = Math.random() * 10 + 6;
      const color   = colors[Math.floor(Math.random() * colors.length)];
      const left    = Math.random() * 100;
      const dur     = Math.random() * 2 + 2;
      const delay   = Math.random() * 1;
      const isCircle = Math.random() > 0.5;

      piece.style.cssText = `
        left: ${left}vw;
        width: ${size}px;
        height: ${size * (isCircle ? 1 : 0.4)}px;
        background: ${color};
        border-radius: ${isCircle ? '50%' : '2px'};
        animation-duration: ${dur}s;
        animation-delay: ${delay}s;
      `;

      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), (dur + delay) * 1000 + 500);
    }, i * 15);
  }
}

window.initParticles = initParticles;
window.launchConfetti = launchConfetti;
