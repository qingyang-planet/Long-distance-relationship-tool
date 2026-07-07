export const CITY_COORDS: Record<string, [number, number]> = {
  北京: [39.9, 116.4],
  上海: [31.2, 121.5],
  广州: [23.1, 113.3],
  深圳: [22.5, 114.1],
  杭州: [30.3, 120.2],
  成都: [30.6, 104.1],
  重庆: [29.6, 106.6],
  西安: [34.3, 108.9],
  南京: [32.1, 118.8],
  武汉: [30.6, 114.3],
  天津: [39.1, 117.2],
  苏州: [31.3, 120.6],
  伦敦: [51.5, -0.1],
  london: [51.5, -0.1],
  纽约: [40.7, -74.0],
  'new york': [40.7, -74.0],
  巴黎: [48.9, 2.3],
  paris: [48.9, 2.3],
  东京: [35.7, 139.7],
  tokyo: [35.7, 139.7],
  悉尼: [-33.9, 151.2],
  sydney: [-33.9, 151.2],
  新加坡: [1.3, 103.8],
  singapore: [1.3, 103.8],
  洛杉矶: [34.1, -118.2],
  'los angeles': [34.1, -118.2],
  旧金山: [37.8, -122.4],
  'san francisco': [37.8, -122.4],
  温哥华: [49.3, -123.1],
  vancouver: [49.3, -123.1],
  多伦多: [43.7, -79.4],
  toronto: [43.7, -79.4],
  墨尔本: [-37.8, 145.0],
  melbourne: [-37.8, 145.0],
  波士顿: [42.4, -71.1],
  boston: [42.4, -71.1],
  香港: [22.3, 114.2],
  台北: [25.0, 121.6],
  首尔: [37.6, 127.0],
  seoul: [37.6, 127.0],
  日内瓦: [46.2, 6.1],
  geneva: [46.2, 6.1],
  genève: [46.2, 6.1],
  苏黎世: [47.4, 8.5],
  zurich: [47.4, 8.5],
  伯尔尼: [46.9, 7.4],
  bern: [46.9, 7.4],
  洛桑: [46.5, 6.6],
  lausanne: [46.5, 6.6],
  柏林: [52.5, 13.4],
  berlin: [52.5, 13.4],
  慕尼黑: [48.1, 11.6],
  munich: [48.1, 11.6],
  阿姆斯特丹: [52.4, 4.9],
  amsterdam: [52.4, 4.9],
  布鲁塞尔: [50.8, 4.4],
  brussels: [50.8, 4.4],
  马德里: [40.4, -3.7],
  madrid: [40.4, -3.7],
  罗马: [41.9, 12.5],
  rome: [41.9, 12.5],
  米兰: [45.5, 9.2],
  milan: [45.5, 9.2],
  莫斯科: [55.8, 37.6],
  moscow: [55.8, 37.6],
  迪拜: [25.2, 55.3],
  dubai: [25.2, 55.3],
  曼谷: [13.8, 100.5],
  bangkok: [13.8, 100.5],
  吉隆坡: [3.1, 101.7],
  'kuala lumpur': [3.1, 101.7],
  芝加哥: [41.9, -87.6],
  chicago: [41.9, -87.6],
  西雅图: [47.6, -122.3],
  seattle: [47.6, -122.3],
  华盛顿: [38.9, -77.0],
  washington: [38.9, -77.0],
};

export function resolveCityCoordLocal(city: string): [number, number] | null {
  const input = city.trim().toLowerCase();
  if (!input) return null;

  for (const key in CITY_COORDS) {
    const normalizedKey = key.toLowerCase();
    if (input.includes(normalizedKey) || normalizedKey.includes(input)) {
      return CITY_COORDS[key];
    }
  }

  return null;
}

export function calculateHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
