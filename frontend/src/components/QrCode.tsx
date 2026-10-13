import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a QR code locally (no third-party service, works offline). */
export function QrCode({ value, size = 240, color = '#0E1A3B', className = '' }: { value: string; size?: number; color?: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    setError(false);
    QRCode.toCanvas(canvas.current, value, {
      width: size * 2, // drawn at 2x so it stays sharp on retina and when printed
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: color, light: '#FFFFFF' }
    })
      .then(() => {
        // node-qrcode writes its own pixel size onto the canvas; restore ours.
        if (canvas.current) {
          canvas.current.style.width = `${size}px`;
          canvas.current.style.height = `${size}px`;
        }
      })
      .catch(() => setError(true));
  }, [value, size, color]);

  if (error) return <div className="muted">Could not draw the QR code.</div>;
  return <canvas ref={canvas} className={className} style={{ width: size, height: size }} role="img" aria-label={`QR code linking to ${value}`} />;
}

export async function qrPngDataUrl(value: string, size = 1024): Promise<string> {
  return QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0E1A3B', light: '#FFFFFF' } });
}

export async function qrSvg(value: string): Promise<string> {
  return QRCode.toString(value, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0E1A3B', light: '#FFFFFF' } });
}

export function download(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
