import {resolveCityCoordLocal} from './cityCoords';

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export async function geocodeCity(city: string): Promise<[number, number] | null> {
  const trimmed = city.trim();
  if (!trimmed) return null;

  const local = resolveCityCoordLocal(trimmed);
  if (local) return local;

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'zh');

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = (await response.json()) as {results?: GeocodeResult[]};
    const match = data.results?.[0];
    if (!match) return null;

    return [match.latitude, match.longitude];
  } catch {
    return null;
  }
}
