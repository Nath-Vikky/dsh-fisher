export function drawCoast(
  ctx: CanvasRenderingContext2D, width: number, height: number, time: number, image?: HTMLImageElement,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f4efdb';
  ctx.fillRect(0, 0, width, height);
  if (!image) return;

  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, (image.naturalWidth - sourceWidth) / 2, (image.naturalHeight - sourceHeight) * 0.6,
    sourceWidth, sourceHeight, 0, 0, width, height);

  // Small stepped highlights keep the water moving without resampling the artwork.
  const step = Math.floor(time * 2) % 4;
  ctx.fillStyle = '#f4efdb';
  for (let i = 0; i < 3; i++) {
    const x = Math.round((width * (0.66 + i * 0.08) + step * 2) / 2) * 2;
    const y = Math.round(height * (0.32 + i * 0.05) / 2) * 2;
    ctx.fillRect(x, y, 8 + (i % 2) * 4, 2);
  }
}
