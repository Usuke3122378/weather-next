"use client";

import { useCallback, useEffect, useState } from "react";
import Calendar from "@/components/Calendar";
import { iconToEmoji, type WeatherResponse } from "@/lib/weather";

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}月${d}日（${WEEKDAY[w]}）`;
}

// 自分のサーバーの窓口（/api/weather）から天気を受け取る
async function getWeather(query: string): Promise<WeatherResponse> {
  const res = await fetch(`/api/weather?${query}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export default function Home() {
  const [input, setInput] = useState("東京");
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWeather = useCallback((query: string) => {
    return getWeather(query)
      .then((json) => {
        setData(json);
        setSelected(json.days[0].date);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const load = (query: string) => {
    setLoading(true);
    setError("");
    fetchWeather(query);
  };

  // 最初は東京の天気を表示
  useEffect(() => {
    fetchWeather(`city=${encodeURIComponent("東京")}`);
  }, [fetchWeather]);

  const searchCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) load(`city=${encodeURIComponent(input.trim())}`);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("このブラウザは現在地に対応していません");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setInput("");
        load(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      },
      () => {
        setLoading(false);
        setError("現在地を取得できませんでした（位置情報の許可を確認してください）");
      },
    );
  };

  const day = data?.days.find((d) => d.date === selected);
  const isToday = data && selected === data.today;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">🌤️ お天気カレンダー</h1>

      {/* 検索 */}
      <form onSubmit={searchCity} className="mb-6 flex flex-wrap gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="都市名（例：大阪、札幌、London）"
          className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
        >
          検索
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={loading}
          className="rounded-full border border-sky-500 px-5 py-2 font-semibold text-sky-600 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-300 dark:hover:bg-slate-800"
        >
          📍 現在地
        </button>
      </form>

      {error && (
        <p className="mb-6 rounded-xl bg-rose-100 px-4 py-3 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
          {error}
        </p>
      )}

      {loading && !data && <p className="text-center text-slate-500">読み込み中…</p>}

      {data && day && (
        <div className={`grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_320px] ${loading ? "opacity-50" : ""}`}>
          <section className="min-w-0 space-y-6">
            {/* 選んだ日の天気 */}
            <div className="rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 p-6 text-white shadow">
              <p className="text-sm opacity-90">
                📍 {data.location.name}（{data.location.country}）
              </p>
              <p className="mt-1 text-lg font-bold">
                {formatDate(day.date)}
                {isToday && <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">今日</span>}
              </p>

              <div className="mt-4 flex items-center gap-4">
                <span className="text-6xl">
                  {iconToEmoji(isToday ? data.current.icon : day.icon)}
                </span>
                <div>
                  {isToday ? (
                    <>
                      <p className="text-5xl font-bold">{data.current.temp}℃</p>
                      <p className="text-sm opacity-90">
                        いま：{data.current.description}（体感 {data.current.feelsLike}℃）
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-4xl font-bold">
                        {day.max}℃ <span className="text-2xl opacity-80">/ {day.min}℃</span>
                      </p>
                      <p className="text-sm opacity-90">{day.description}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                <Stat label="最高 / 最低" value={`${day.max}℃ / ${day.min}℃`} />
                <Stat label="湿度" value={`${isToday ? data.current.humidity : day.humidity}%`} />
                <Stat label="降水確率" value={`${day.pop}%`} />
              </div>
            </div>

            {/* 3時間ごと */}
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-800/80">
              <h2 className="mb-3 font-bold">3時間ごとの予報</h2>
              {day.hours.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  今日の3時間ごとの予報はおしまいです。降水確率は、このあと3時間の予報です。
                </p>
              )}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {day.hours.map((h) => (
                  <div
                    key={h.time}
                    className="min-w-[76px] rounded-xl bg-sky-50 p-3 text-center text-sm dark:bg-slate-700"
                  >
                    <p className="font-semibold">{h.time}</p>
                    <p className="my-1 text-2xl" title={h.description}>
                      {iconToEmoji(h.icon)}
                    </p>
                    <p className="font-bold">{h.temp}℃</p>
                    <p className="text-xs text-sky-600 dark:text-sky-300">☔ {h.pop}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">💧 {h.humidity}%</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <Calendar
              key={data.location.name + data.today}
              today={data.today}
              available={data.days.map((d) => d.date)}
              selected={selected}
              onSelect={setSelected}
            />

            {/* 週間のまとめ */}
            <ul className="space-y-1 rounded-2xl bg-white/80 p-3 shadow-sm dark:bg-slate-800/80">
              {data.days.map((d) => (
                <li key={d.date}>
                  <button
                    onClick={() => setSelected(d.date)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      d.date === selected ? "bg-sky-100 dark:bg-sky-900/60" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{formatDate(d.date)}</span>
                    <span>{iconToEmoji(d.icon)}</span>
                    <span>
                      <span className="text-rose-500">{d.max}°</span> /{" "}
                      <span className="text-sky-500">{d.min}°</span>
                    </span>
                    <span className="w-14 whitespace-nowrap text-right text-xs text-slate-500">☔{d.pop}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-slate-400">
        データ提供：OpenWeatherMap
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/20 px-2 py-3">
      <p className="text-xs opacity-90">{label}</p>
      <p className="mt-1 whitespace-nowrap text-sm font-bold sm:text-base">{value}</p>
    </div>
  );
}
