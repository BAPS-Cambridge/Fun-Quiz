// js/fireworks.js - Realistic Diwali Firecracker Simulation (Canvas)
class FireworkEngine {
  constructor() {
    this.canvas = document.getElementById('fireworks-canvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'fireworks-canvas';
      document.body.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.rockets = [];
    this.isRunning = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  launchRocket(targetX, targetY) {
    const startX = Math.random() * (this.canvas.width * 0.8) + (this.canvas.width * 0.1);
    const startY = this.canvas.height;
    const destX = targetX || (Math.random() * (this.canvas.width * 0.7) + (this.canvas.width * 0.15));
    const destY = targetY || (Math.random() * (this.canvas.height * 0.4) + 80);
    const angle = Math.atan2(destY - startY, destX - startX);
    const speed = 12 + Math.random() * 4;

    this.rockets.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      destY: destY,
      color: `hsl(${Math.floor(Math.random() * 60 + 15)}, 100%, 70%)`, // Golden / fiery Diwali hues
      trail: []
    });

    if (!this.isRunning) {
      this.isRunning = true;
      this.animate();
    }
  }

  explode(x, y) {
    const colors = ['#ffd700', '#ff3d00', '#00f0b5', '#ff007f', '#ff9900', '#ffffff'];
    const count = 75 + Math.floor(Math.random() * 40);
    const baseColor = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 1.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.3 ? baseColor : '#ffffff',
        alpha: 1,
        decay: Math.random() * 0.02 + 0.012,
        gravity: 0.12,
        sparkle: Math.random() > 0.5
      });
    }
  }

  triggerSalvo(salvoCount = 6) {
    for (let i = 0; i < salvoCount; i++) {
      setTimeout(() => {
        this.launchRocket();
      }, i * 350);
    }
  }

  animate() {
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'lighter';

    // Update & draw rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 5) r.trail.shift();

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = r.color;
      this.ctx.fill();

      // Draw fiery trail
      this.ctx.beginPath();
      for (const t of r.trail) {
        this.ctx.lineTo(t.x, t.y);
      }
      this.ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      r.x += r.vx;
      r.y += r.vy;

      if (r.y <= r.destY || r.vy >= 0) {
        this.explode(r.x, r.y);
        this.rockets.splice(i, 1);
      }
    }

    // Update & draw explosive sparks
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.sparkle && Math.random() > 0.5 ? 2.5 : 1.8, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.fill();
      this.ctx.restore();
    }

    if (this.rockets.length > 0 || this.particles.length > 0) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.isRunning = false;
    }
  }
}

const firecrackers = new FireworkEngine();
