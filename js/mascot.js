// js/mascot.js - Lively Animated AI Agent ("Mitra the Diwali Bot")
class DiwaliMascotController {
  constructor() {
    this.speechEl = document.getElementById('mascot-speech');
    this.phrases = [
      "🪔 Jay Swaminarayan & Happy Diwali!",
      "👋 Scan the QR code to play!",
      "🔥 Who can top the leaderboard?",
      "⚡ Akshar-Purushottam quiz masters, step up!",
      "🚀 Test your speed and knowledge!",
      "✨ Click me to launch firecrackers!",
      "🏆 Fast fingers win the Diwali Trophy!"
    ];
    this.index = 0;
    this.init();
  }

  init() {
    // Cycle funny & welcoming invites every 4.5 seconds
    setInterval(() => {
      this.nextPhrase();
    }, 4500);
  }

  nextPhrase() {
    if (!this.speechEl) return;
    this.index = (this.index + 1) % this.phrases.length;
    this.speechEl.style.opacity = '0';
    setTimeout(() => {
      this.speechEl.textContent = this.phrases[this.index];
      this.speechEl.style.opacity = '1';
    }, 250);
  }

  cheer() {
    if (this.speechEl) {
      this.speechEl.textContent = "💥 Shubh Deepavali! Have fun playing! 🪔";
    }
    if (window.firecrackers) {
      window.firecrackers.triggerSalvo(4);
    }
  }
}

let mascotController = null;
window.addEventListener('DOMContentLoaded', () => {
  mascotController = new DiwaliMascotController();
});

function triggerMascotCheer() {
  if (mascotController) {
    mascotController.cheer();
  }
}
