import { useEffect, useRef, useState } from "react";

interface Props {
  points: { date: string; value: number }[];
  height: number;
  stroke?: string;
}

/** Minimal SVG line chart that fills its container's width: series line, min/max gridlines, first/last labels. */
export function LineChart({ points, height, stroke = "#10b981" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  // Bottom padding leaves room for the min-value label and the date labels under it.
  const pad = { top: 20, bottom: 42, left: 8, right: 8 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => pad.left + (i / (points.length - 1)) * w;
  const y = (v: number) => pad.top + h - ((v - min) / span) * h;

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");

  const fmt = (v: number) => "$" + Math.round(v).toLocaleString("en-US");

  return (
    <div ref={box} style={{ height }}>
      {width > 0 && points.length >= 2 && (
        <svg width={width} height={height} role="img" aria-label="Net worth over time">
          <line x1={pad.left} y1={y(max)} x2={width - pad.right} y2={y(max)} stroke="#334155" strokeDasharray="4 4" />
          <line x1={pad.left} y1={y(min)} x2={width - pad.right} y2={y(min)} stroke="#334155" strokeDasharray="4 4" />
          <path d={d} stroke={stroke} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <text x={pad.left} y={y(max) - 4} fontSize={11} fill="#64748b">{fmt(max)}</text>
          <text x={pad.left} y={y(min) + 14} fontSize={11} fill="#64748b">{fmt(min)}</text>
          <text x={pad.left} y={height - 6} fontSize={11} fill="#94a3b8">{points[0].date}</text>
          <text x={width - pad.right} y={height - 6} fontSize={11} fill="#94a3b8" textAnchor="end">
            {points[points.length - 1].date}
          </text>
        </svg>
      )}
    </div>
  );
}
