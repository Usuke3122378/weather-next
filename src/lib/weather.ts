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
