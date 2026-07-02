/** Rendu QR déterministe (visuel) à partir d'une chaîne — code de pré-déclaration. */
export function QrVisual({ value, size = 148 }: { value: string; size?: number }) {
  const n = 21;
  const cell = size / n;
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619) >>> 0;
  const bit = (i: number) => {
    let x = (h ^ Math.imul(i + 1, 2654435761)) >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) % 100 > 52;
  };
  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const finderOn = (r: number, c: number) => {
    const lr = r >= n - 7 ? r - (n - 7) : r;
    const lc = c >= n - 7 ? c - (n - 7) : c;
    const ring = lr === 0 || lr === 6 || lc === 0 || lc === 6;
    const core = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
    return ring || core;
  };
  const rects: string[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const on = inFinder(r, c) ? finderOn(r, c) : bit(r * n + c);
      if (on) rects.push(`${c * cell},${r * cell}`);
    }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg border border-line bg-white">
      {rects.map((p, i) => {
        const [x, y] = p.split(",");
        return <rect key={i} x={x} y={y} width={cell + 0.5} height={cell + 0.5} fill="#111113" />;
      })}
    </svg>
  );
}
