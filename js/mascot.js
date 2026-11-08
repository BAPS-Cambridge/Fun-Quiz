// js/mascot.js - Smooth Roving AI Mascot ("Mitra" / AI Bot)
class DiwaliMascot {
  constructor() {
    this.el = document.getElementById('ai-mascot');
    if (!this.el) return;

    this.speechEl = this.el.querySelector('.mascot-speech-bubble');
    this.messages = [
      "🪔 Happy Diwali!",
      "👋 Scan the QR to play!",
      "🔥 Who can top the chart?",
      "⚡ Test your knowledge!",
      "✨ Win the Diwali Trophy!",
      "🚀 Challenge your friends!"
    ];
    this.msgIndex = 0;
    this.currentX = window.innerWidth - 180;
    this.currentY = window.innerHeight - 200;
    this.targetX = this.currentX;
    this.targetY = this.currentY;

    this.init();
  }

  init() {
    this.updatePosition(this.currentX, this.currentY);

    // Roam every 6-9 seconds
    setInterval(() => {
      this.pickNewSpot();
    }, 7000);

    // Change gesture message every 4.5 seconds
    setInterval(() => {
      this.cycleMessage();
    }, 4500);

    // Interactive click: Mascot waves and fires mini firecrackers!
    this.el.addEventListener('click', () => {
      if (this.speechEl) this.speechEl.textContent = "💥 Shubh Deepavali! 🪔";
      if (window.firecrackers) {
        window.firecrackers.launchRocket(this.currentX + 60, this.currentY - 20);
      }
    });
  }

  pickNewSpot() {
    // Keep mascot visible and safe around screen margins (not covering leaderboard table)
    const margin = 80;
    const maxX = window.innerWidth - 170;
    const maxY = window.innerHeight - 180;

    // Favor edges: bottom-right, bottom-left, top-right, center-bottom
    const waypoints = [
      { x: maxX - 20, y: maxY - 30 },
      { x: margin + 380, y: maxY - 20 },
      { x: maxX - 40, y: 120 },
      { x: maxX - 20, y: maxY * 0.55 },
      { x: margin + 420, y: maxY * 0.4 }
    ];

    const target = waypoints[Math.floor(Math.random() * waypoints.length)];
    this.currentX = target.x;
    this.currentY = target.y;
    this.updatePosition(this.currentX, this.currentY);
  }

  updatePosition(x, y) {
    this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  cycleMessage() {
    if (!this.speechEl) return;
    this.msgIndex = (this.msgIndex + 1) % this.messages.length;
    this.speechEl.textContent = this.messages[this.msgIndex];
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new DiwaliMascot();
});
