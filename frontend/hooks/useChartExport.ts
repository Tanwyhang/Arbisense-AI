'use client';

import { useCallback, RefObject } from 'react';

interface UseChartExportOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  filename?: string;
}

export default function useChartExport({
  containerRef,
  filename = 'chart',
}: UseChartExportOptions) {
  
  const exportPNG = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    const clonedSvg = svg.cloneNode(true) as SVGElement;
    const bbox = svg.getBoundingClientRect();
    clonedSvg.setAttribute('width', String(bbox.width * 2));
    clonedSvg.setAttribute('height', String(bbox.height * 2));
    
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    canvas.width = bbox.width * 2;
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${filename}.png`);
      }, 'image/png');
    };
    img.src = url;
  }, [containerRef, filename]);

  const exportSVG = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    downloadBlob(blob, `${filename}.svg`);
  }, [containerRef, filename]);

  return { exportPNG, exportSVG };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
