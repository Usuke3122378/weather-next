"use client";

import { useState } from "react";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  today: string; // "YYYY-MM-DD"
  available: string[]; // 予報がある日付
  selected: string;
  onSelect: (date: string) => void;
};

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function Calendar({ today, available, selected, onSelect }: Props) {
  const [year, month] = selected.split("-").map(Number);
  const [view, setView] = useState({ y: year, m: month - 1 });

  // 予報がある月だけ行き来できるようにする
  const months = [...new Set(available.map((d) => d.slice(0, 7)))];
  const viewKey = toKey(view.y, view.m, 1).slice(0, 7);
  const idx = months.indexOf(viewKey);

  const move = (step: number) => {
    const [y, m] = months[idx + step].split("-").map(Number);
    setView({ y, m: m - 1 });
  };

  const firstWeekday = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-800/80">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => move(-1)}
          disabled={idx <= 0}
          className="rounded-full px-3 py-1 text-lg disabled:opacity-20"
          aria-label="前の月"
        >
          ‹
        </button>
        <p className="font-bold">
          {view.y}年{view.m + 1}月
        </p>
        <button
          onClick={() => move(1)}
          disabled={idx < 0 || idx >= months.length - 1}
          className="rounded-full px-3 py-1 text-lg disabled:opacity-20"
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {WEEK.map((w, i) => (
          <div
            key={w}
            className={`pb-1 text-xs font-semibold ${
              i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-slate-500"
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = toKey(view.y, view.m, d);
          const enabled = available.includes(key);
          const isSelected = key === selected;
          const isToday = key === today;
          return (
            <button
              key={key}
              disabled={!enabled}
              onClick={() => onSelect(key)}
              className={`mx-auto aspect-square w-full max-w-11 rounded-full transition ${
                isSelected
                  ? "bg-sky-500 font-bold text-white"
                  : enabled
                    ? "bg-sky-100 font-semibold text-sky-900 hover:bg-sky-200 dark:bg-sky-900/60 dark:text-sky-100"
                    : "text-slate-300 dark:text-slate-600"
              } ${isToday && !isSelected ? "ring-2 ring-sky-400" : ""}`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        色がついた日（今日から約5日分）の予報を見られます
      </p>
    </div>
  );
}
