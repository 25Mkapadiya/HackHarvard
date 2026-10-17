import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { MarketView } from '../../lib/filters';
import { marketStatus } from '../../lib/schedule/occurs';
import { statusText } from '../../lib/format';
import { TILE_ATTRIBUTION, TILE_URL } from '../../app/config';
import { useJson } from '../../app/data';
import type { LatLng } from '../../lib/geo';

const COLORS = { open: '#24513F', closing_soon: '#B07A10', closed: '#6B7370', unknown: '#8C2D4F' } as const;
const GLYPH = { open: '✓', closing_soon: '!', closed: '–', unknown: '?' } as const;

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function Markers({ markets, now }: { markets: MarketView[]; now: Date }) {
  const map = useMap();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        return L.divIcon({
          className: '',
          html: `<div class="cluster-bubble" role="img" aria-label="${n} markets">${n}</div>`,
          iconSize: [38, 38],
        });
      },
    });
    for (const m of markets) {
      const s = marketStatus(m.schedules, m.scheduleParsed, now, m.closures);
      const label = `${m.name}: ${statusText(s, now, t, i18n.language)}`;
      const icon = L.divIcon({
        className: '',
        html: `<div class="marker-pin" style="background:${COLORS[s.state]}"><span aria-hidden="true">${GLYPH[s.state]}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      });
      const marker = L.marker([m.geo.lat, m.geo.lng], { icon, title: label, alt: label, keyboard: true });
      const href = `#/market/${m.id}`;
      marker.bindPopup(
        `<strong>${escapeHtml(m.name)}</strong><br>${escapeHtml(m.city)}<br>${escapeHtml(statusText(s, now, t, i18n.language))}<br><a href="${href}">Details →</a>`,
      );
      marker.on('keypress', (e) => {
        if ((e.originalEvent as KeyboardEvent).key === 'Enter') navigate(`/market/${m.id}`);
      });
      group.addLayer(marker);
    }
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, markets, now, navigate, t, i18n.language]);
  return null;
}

function FitTo({ origin }: { origin: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([origin.lat, origin.lng], Math.max(map.getZoom(), 11));
  }, [map, origin]);
  return null;
}

function TractLayer() {
  const tracts = useJson<GeoJSON.FeatureCollection>('tracts-lila.geojson');
  const style = useMemo(
    () => (f?: GeoJSON.Feature) => {
      const p = (f?.properties ?? {}) as { lowIncome: boolean; lowAccess: boolean; lila: boolean };
      const both = p.lila || (p.lowIncome && p.lowAccess);
      return { color: '#8C2D4F', weight: 0.5, fillColor: '#8C2D4F', fillOpacity: both ? 0.35 : 0.12 };
    },
    [],
  );
  if (!tracts.data) return null;
  return <GeoJSON data={tracts.data} style={style} interactive={false} />;
}

export default function MarketMap({
  markets,
  now,
  origin,
  showTracts,
}: {
  markets: MarketView[];
  now: Date;
  origin: LatLng;
  showTracts: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="h-full min-h-[420px] w-full" role="region" aria-label={t('explore.mapLabel')}>
      <MapContainer
        center={[origin.lat, origin.lng]}
        zoom={11}
        className="h-full min-h-[420px] w-full"
        scrollWheelZoom
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {showTracts && <TractLayer />}
        <Markers markets={markets} now={now} />
        <FitTo origin={origin} />
      </MapContainer>
    </div>
  );
}
