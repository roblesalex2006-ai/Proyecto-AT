/**
 * Starfield Canvas Renderer
 * Interactive 3D space starfield with hyperdrive warp mode.
 */

export class Starfield {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.numStars = 450;
    this.speedMultiplier = 1.0;
    this.hyperdrive = false;
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Generate stars
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * this.width * 2,
        y: (Math.random() - 0.5) * this.height * 2,
        z: Math.random() * this.width,
        pz: 0,
        size: Math.random() * 1.8 + 0.4,
        color: this.getRandomStarColor(),
        twinkleSpeed: Math.random() * 0.05 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2
      });
      this.stars[i].pz = this.stars[i].z;
    }

    this.animate();
  }

  getRandomStarColor() {
    const colors = [
      '#FFFFFF', '#FFFFFF', '#FFFFFF', 
      '#FFE81F', '#4BD5EE', '#B1D4E0', 
      '#FFD1DC'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  setSpeed(speed) {
    this.speedMultiplier = speed;
    this.hyperdrive = speed > 2.2;
  }

  animate() {
    this.ctx.fillStyle = 'rgba(2, 2, 8, 0.4)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;
    const speed = (this.hyperdrive ? 25 : 1.2) * this.speedMultiplier;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];

      star.pz = star.z;
      star.z -= speed;

      // Reset star if it moves past screen
      if (star.z <= 0) {
        star.z = this.width;
        star.pz = star.z;
        star.x = (Math.random() - 0.5) * this.width * 2;
        star.y = (Math.random() - 0.5) * this.height * 2;
      }

      // 3D projection
      const k = 250 / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      if (px >= 0 && px <= this.width && py >= 0 && py <= this.height) {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;

        if (this.hyperdrive) {
          // Draw streak effect for hyperdrive
          const pk = 250 / star.pz;
          const ppx = star.x * pk + cx;
          const ppy = star.y * pk + cy;

          this.ctx.beginPath();
          this.ctx.strokeStyle = star.color;
          this.ctx.lineWidth = star.size * k * 1.5;
          this.ctx.moveTo(ppx, ppy);
          this.ctx.lineTo(px, py);
          this.ctx.stroke();
        } else {
          // Normal star rendering
          const size = star.size * k;
          this.ctx.beginPath();
          this.ctx.fillStyle = star.color;
          this.ctx.globalAlpha = twinkle * Math.min(1, (this.width - star.z) / 200);
          this.ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.globalAlpha = 1.0;
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}
