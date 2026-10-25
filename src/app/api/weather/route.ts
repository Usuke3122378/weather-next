import type { NextRequest } from "next/server";
import type {
  DayForecast,
  HourForecast,
  WeatherResponse,
} from "@/lib/weather";

// ブラウザからはこの窓口（/api/weather）だけを呼ぶ。
// API キーはサーバーの中でだけ使うので、利用者からは見えない。
const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE = "https://api.openweathermap.org";

type OwmItem = {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: { icon: string; description: string }[];
  pop: number;
};

type OwmCurrent = {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: { icon: string; description: string }[];
  wind: { speed: number };
  sys: { country: string };
};

type GeoPlace = {
  name: string;
  local_names?: Record<string, string>;
  country: string;
  lat: number;
  lon: number;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function owm<T>(path: string, params: Record<string, string>) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("appid", API_KEY!);
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`OpenWeatherMap error ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

// 秒単位の UNIX 時刻 + 時差（秒）から、現地の "YYYY-MM-DD" と "HH:MM" を作る
function localParts(dt: number, tzOffset: number) {
  const iso = new Date((dt + tzOffset) * 1000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return jsonError(
      "API キーが設定されていません（OPENWEATHER_API_KEY）",
      500,
    );
  }

  const params = request.nextUrl.searchParams;
  const city = params.get("city")?.trim();
  let lat = params.get("lat");
  let lon = params.get("lon");

  try {
    // 都市名 → 緯度・経度（日本語の都市名も使える）
    let place: GeoPlace | undefined;
    if (city) {
      const found = await owm<GeoPlace[]>("/geo/1.0/direct", {
        q: city,
        limit: "1",
      });
      place = found[0];
      if (!place) return jsonError(`「${city}」が見つかりませんでした`, 404);
      lat = String(place.lat);
      lon = String(place.lon);
    } else if (lat && lon) {
      // 現在地 → 地名
      const found = await owm<GeoPlace[]>("/geo/1.0/reverse", {
        lat,
        lon,
        limit: "1",
      });
      place = found[0];
    } else {
      return jsonError("都市名か現在地を指定してください", 400);
    }

    const common = { lat: lat!, lon: lon!, units: "metric", lang: "ja" };
    const [now, forecast] = await Promise.all([
      owm<OwmCurrent>("/data/2.5/weather", common),
      owm<{ list: OwmItem[]; city: { timezone: number } }>(
        "/data/2.5/forecast",
        common,
      ),
    ]);

    const tz = forecast.city.timezone;

    // 3時間ごとの予報を日付ごとにまとめる
    const byDate = new Map<string, { item: OwmItem; time: string }[]>();
    for (const item of forecast.list) {
      const { date, time } = localParts(item.dt, tz);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push({ item, time });
    }

    const days: DayForecast[] = [...byDate.entries()].map(([date, entries]) => {
      const hours: HourForecast[] = entries.map(({ item, time }) => ({
        time,
        temp: Math.round(item.main.temp),
        humidity: item.main.humidity,
        pop: Math.round(item.pop * 100),
        icon: item.weather[0].icon,
        description: item.weather[0].description,
      }));
      // その日の代表の天気は、お昼（12時）に一番近い時間のもの
      const noon = entries.reduce((best, e) =>
        Math.abs(Number(e.time.slice(0, 2)) - 12) <
        Math.abs(Number(best.time.slice(0, 2)) - 12)
          ? e
          : best,
      );
      return {
        date,
        min: Math.round(Math.min(...entries.map((e) => e.item.main.temp_min))),
        max: Math.round(Math.max(...entries.map((e) => e.item.main.temp_max))),
        humidity: Math.round(
          hours.reduce((sum, h) => sum + h.humidity, 0) / hours.length,
        ),
        pop: Math.max(...hours.map((h) => h.pop)),
        icon: noon.item.weather[0].icon,
        description: noon.item.weather[0].description,
        hours,
      };
    });

    // 夜は今日の3時間ごとの予報が残っていないので、いまの天気から今日の分を作る
    const today = localParts(Math.floor(Date.now() / 1000), tz).date;
    if (days[0]?.date !== today) {
      days.unshift({
        date: today,
        min: Math.round(now.main.temp_min),
        max: Math.round(now.main.temp_max),
        humidity: now.main.humidity,
        pop: Math.round((forecast.list[0]?.pop ?? 0) * 100),
        icon: now.weather[0].icon,
        description: now.weather[0].description,
        hours: [],
      });
    }

    const body: WeatherResponse = {
      location: {
        name: place?.local_names?.ja ?? place?.name ?? now.name,
        country: place?.country ?? now.sys.country,
      },
      today,
      current: {
        temp: Math.round(now.main.temp),
        feelsLike: Math.round(now.main.feels_like),
        humidity: now.main.humidity,
        windSpeed: Math.round(now.wind.speed * 10) / 10,
        icon: now.weather[0].icon,
        description: now.weather[0].description,
      },
      days,
    };
    return Response.json(body);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) {
      return jsonError(
        "API キーが無効です。作ったばかりのキーは使えるまで最大2時間ほどかかります",
        401,
      );
    }
    return jsonError("天気の取得に失敗しました。時間をおいて試してください", 502);
  }
}
