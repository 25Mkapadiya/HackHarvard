import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LatLng } from '../../lib/geo';
import type { LocalDay } from '../../lib/schedule/occurs';
import { isoDay } from '../../lib/schedule/occurs';

type Period = {
  startTime: string;
  isDaytime: boolean;
  name: string;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  probabilityOfPrecipitation?: { value: number | null };
};

// National Weather Service API (CORS-enabled, no key). Forecasts cover about 7 days.
const forecastCache = new Map<string, Promise<Period[]>>();
function forecast(g: LatLng): Promise<Period[]> {
  const key = `${g.lat.toFixed(3)},${g.lng.toFixed(3)}`;
  if (!forecastCache.has(key)) {
    const p = fetch(`https://api.weather.gov/points/${key}`, { headers: { Accept: 'application/geo+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => fetch(j.properties.forecast))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => j.properties.periods as Period[]);
    p.catch(() => forecastCache.delete(key));
    forecastCache.set(key, p);
  }
  return forecastCache.get(key)!;
}

export function Weather({ geo, day }: { geo: LatLng; day: LocalDay }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    forecast(geo).then(
      (ps) =>
        live &&
        setPeriod(
          ps.find((p) => p.isDaytime && p.startTime.slice(0, 10) === isoDay(day)) ??
            ps.find((p) => p.startTime.slice(0, 10) === isoDay(day)) ??
            null,
        ),
      () => live && setPeriod(null),
    );
    return () => {
      live = false;
    };
  }, [geo, day]);
  if (period === undefined) return <p className="text-ink-soft">{t('common.loading')}</p>;
  if (period === null) return <p className="text-ink-soft">{t('market.weatherUnavailable')}</p>;
  const rain = period.probabilityOfPrecipitation?.value;
  return (
    <p>
      <span className="font-bold">{period.name}:</span> {period.shortForecast}, {period.temperature}°
      {period.temperatureUnit}
      {rain ? ` · ${rain}% rain` : ''}{' '}
      <span className="text-sm text-ink-soft">(National Weather Service)</span>
    </p>
  );
}
