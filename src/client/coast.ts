export function drawCoast(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#e7eee4'); sky.addColorStop(0.5, '#b9deda'); sky.addColorStop(1, '#6daeb0');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff9df'; ctx.beginPath(); ctx.arc(width * 0.78, height * 0.23, 26, 0, Math.PI * 2); ctx.fill();

  const ridge = (color: string, y: number, shift: number) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, height * y);
    ctx.bezierCurveTo(width * 0.2, height * (y - 0.19), width * 0.34, height * (y + shift), width * 0.53, height * y);
    ctx.bezierCurveTo(width * 0.77, height * (y - 0.22), width * 0.85, height * (y - 0.06), width, height * (y - 0.12));
    ctx.lineTo(width, height * 0.58); ctx.lineTo(0, height * 0.58); ctx.closePath(); ctx.fill();
  };
  ridge('#a9cdc4', 0.44, 0.08); ridge('#80ada5', 0.49, 0.12);
  ctx.fillStyle = '#88bfbb'; ctx.fillRect(0, height * 0.52, width, height * 0.48);
  ctx.strokeStyle = '#d0e8dc'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 15; i++) {
    const y = height * (0.56 + i * 0.029);
    const x = (i * 67 % (width + 30)) - 25 + Math.sin(time * 0.32 + i) * 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 18, y + Math.sin(time * 0.5 + i) * 2, x + 39, y); ctx.stroke();
  }
  ctx.fillStyle = '#dfd6b4'; ctx.beginPath(); ctx.moveTo(0, height * 0.71);
  ctx.quadraticCurveTo(width * 0.16, height * 0.77, width * 0.24, height);
  ctx.lineTo(0, height); ctx.closePath(); ctx.fill();

  // Keep the coast geometry in the deferred scene module.
  ctx.fillStyle = '#ad9874'; ctx.beginPath(); ctx.moveTo(width * 0.08, height * 0.83);
  ctx.lineTo(width * 0.53, height * 0.71); ctx.lineTo(width * 0.69, height * 0.78);
  ctx.lineTo(width * 0.17, height * 0.96); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a7b60'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    ctx.beginPath(); ctx.moveTo(width * (0.08 + 0.45 * t), height * (0.83 - 0.12 * t));
    ctx.lineTo(width * (0.17 + 0.52 * t), height * (0.96 - 0.18 * t)); ctx.stroke();
  }
  ctx.fillStyle = '#596e51';
  for (let i = 0; i < 8; i++) {
    const x = width * (0.025 + (i % 3) * 0.032);
    const y = height * (0.76 + i * 0.026);
    ctx.beginPath(); ctx.ellipse(x, y, 7, 17, -0.7 + i * 0.22, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#6d8b89'; ctx.lineWidth = 1.6;
  const birdX = width * 0.56;
  const birdY = height * 0.25;
  ctx.beginPath(); ctx.moveTo(birdX - 9, birdY); ctx.quadraticCurveTo(birdX - 3, birdY - 6, birdX, birdY);
  ctx.quadraticCurveTo(birdX + 4, birdY - 6, birdX + 10, birdY - 2); ctx.stroke();
}
