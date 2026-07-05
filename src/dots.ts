const side = 3280;
const pixSize = 10;
const halfPix = pixSize / 2;
const dY = Math.sqrt(pixSize * pixSize - Math.pow(pixSize / 2, 2));

export function buildDots() {
  let offsetRow = false;
  const dots = [];
  const flatDots = [];
  for (let j = 0; j < side; j += dY) {
    for (let i = 0; i < side; i += pixSize) {
      const dot = transformPoint(
        i + (offsetRow ? halfPix : 0),
        j,
        -9.0149688720703146e-6,
        -1.73464024066925e-6,
        0.00085002812556922436,
      );
      const dotX = dot.x / side;
      const dotY = 1 - dot.y / side;
      dots.push({
        x: dotX,
        y: dotY,
      });
      flatDots.push(dotX, dotY);
      // TODO: remove side totally
    }
    offsetRow = !offsetRow;
  }
  return { dots, flatDots: new Float32Array(flatDots) };
}

function transformPoint(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
  rotationRadians: number,
) {
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  const translatedX = x + offsetX;
  const translatedY = y + offsetY;
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;
  return { x: rotatedX, y: rotatedY };
}
