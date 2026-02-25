import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({ data, size = 200, className = '' }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).catch(err => {
        console.error('Error generating QR code:', err);
      });
    }
  }, [data, size]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`border rounded ${className}`}
      data-testid="qr-code-canvas"
    />
  );
}