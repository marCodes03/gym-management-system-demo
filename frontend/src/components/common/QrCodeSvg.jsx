import { useMemo } from 'react';
import { generateQrMatrix } from '../../utils/qrCode';

/**
 * Mad Max Gym — Zero-Dependency Crisp SVG QR Code Component
 * Renders an ISO/IEC 18004 scannable QR code with standard 4-module quiet zone.
 */
export default function QrCodeSvg({
  value,
  size = 160,
  fgColor = '#0B0D11',
  bgColor = '#FFFFFF',
  className = '',
  label = 'Member QR Code',
}) {
  const { modules, totalSize } = useMemo(() => {
    const matrix = generateQrMatrix(value || 'MAD-MAX-GYM');
    const quiet = 4;
    return {
      modules: matrix,
      totalSize: matrix.length + quiet * 2,
    };
  }, [value]);

  const quiet = 4;

  // Merge contiguous horizontal dark runs per row into compact SVG path
  const pathData = useMemo(() => {
    let d = '';
    for (let r = 0; r < modules.length; r += 1) {
      let c = 0;
      while (c < modules.length) {
        if (modules[r][c]) {
          const start = c;
          while (c < modules.length && modules[r][c]) c += 1;
          const run = c - start;
          d += `M${start + quiet},${r + quiet}h${run}v1h-${run}z`;
        } else {
          c += 1;
        }
      }
    }
    return d;
  }, [modules]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      className={`inline-block shrink-0 ${className}`}
    >
      <rect width={totalSize} height={totalSize} fill={bgColor} />
      <path d={pathData} fill={fgColor} />
    </svg>
  );
}
