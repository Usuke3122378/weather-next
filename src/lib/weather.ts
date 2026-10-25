// 画面とサーバーで共通して使うデータの形

export type HourForecast = {
  time: string; // "15:00"
  temp: number;
  humidity: number;
  pop: number; // 降水確率（0〜100）
  icon: string;
  description: string;
};

export type DayForecast = {
  date: string; // "2026-10-25"（その都市の現地日付）
  min: number;
  max: number;
  humidity: number; // その日の平均
  pop: number; // その日の最大
  icon: string;
  description: string;
  hours: HourForecast[];
};

export type CurrentWeather = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  icon: string;
  description: string;
};

export type WeatherResponse = {
  location: { name: string; country: string };
  today: string;
  current: CurrentWeather;
  days: DayForecast[];
};

// OpenWeatherMap のアイコンコード（例: "10d"）を絵文字に変換
export function iconToEmoji(icon: string): string {
  const code = icon.slice(0, 2);
  const night = icon.endsWith("n");
  switch (code) {
    case "01":
      return night ? "🌙" : "☀️";
    case "02":
      return night ? "☁️" : "🌤️";
    case "03":
      return "⛅";
    case "04":
      return "☁️";
    case "09":
      return "🌧️";
    case "10":
      return night ? "🌧️" : "🌦️";
    case "11":
      return "⛈️";
    case "13":
      return "❄️";
    case "50":
      return "🌫️";
    default:
      return "🌡️";
  }
}

// 気温（℃）から服装のアドバイスを返す
export function clothingAdvice(temp: number): { emoji: string; text: string } {
  if (temp >= 25) return { emoji: "👕", text: "半袖でOK" };
  if (temp >= 20) return { emoji: "👔", text: "長袖1枚がちょうどいい" };
  if (temp >= 16) return { emoji: "🧥", text: "薄手の上着があると安心" };
  if (temp >= 12) return { emoji: "🧶", text: "セーターやジャケットを" };
  if (temp >= 8) return { emoji: "🧥", text: "コートが必要" };
  return { emoji: "🧣", text: "厚手のコートとマフラーを" };
}

// 降水確率（%）から傘が必要かを返す
export function umbrellaAdvice(pop: number): { emoji: string; text: string } {
  if (pop >= 50) return { emoji: "☂️", text: "傘を持っていこう" };
  if (pop >= 30) return { emoji: "🌂", text: "折りたたみ傘があると安心" };
  return { emoji: "😊", text: "傘はいらなそう" };
}

// 天気アイコンに合わせた背景色（Tailwind のクラス）
export function weatherGradient(icon: string): string {
  const code = icon.slice(0, 2);
  const night = icon.endsWith("n");
  if (night) return "from-indigo-800 to-slate-900";
  switch (code) {
    case "01":
      return "from-sky-400 to-amber-300";
    case "02":
    case "03":
    case "04":
      return "from-slate-400 to-sky-500";
    case "09":
    case "10":
      return "from-slate-500 to-blue-700";
    case "11":
      return "from-slate-700 to-purple-800";
    case "13":
      return "from-sky-300 to-slate-500";
    case "50":
      return "from-slate-300 to-slate-500";
    default:
      return "from-sky-400 to-indigo-500";
  }
}
