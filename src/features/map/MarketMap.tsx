import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { MarketView } from '../../lib/filters';
import { marketState, marketStatus } from '../../lib/schedule/occurs';
import { statusText } from '../../lib/format';
import { TILE_ATTRIBUTION, TILE_URL } from '../../app/config';
import { useJson } from '../../app/data';
import type { LatLng } from '../../lib/geo';

const COLORS = { open: '#24513F', closing_soon: '#B07A10', closed: '#6B7370', unknown: '#8C2D4F' } as const;
const MAINLAND_BOUNDS: L.LatLngBoundsExpression = [
  [24.5, -124.8],
  [49.4, -66.9],
];
const GLYPH = { open: '✓', closing_soon: '!', closed: '–', unknown: '?' } as const;

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

const STATE_KEY = {
  open: 'status.open',
  closing_soon: 'status.closingSoonShort',
  closed: 'status.closed',
  unknown: 'status.unknown',
} as const;

function Markers({ markets, now }: { markets: MarketView[]; now: Date }) {
  const map = useMap();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      chunkedLoading: true,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        const size = n >= 1000 ? 52 : n >= 100 ? 44 : 38;
        return L.divIcon({
          className: '',
          html: `<div class="cluster-bubble" style="width:${size}px;height:${size}px" role="img" aria-label="${n} markets">${n.toLocaleString()}</div>`,
          iconSize: [size, size],
        });
      },
    });
    const markers = markets.map((m) => {
      // Cheap state for the pin color; the full "Opens Saturday 9:00 AM" text is built when a popup opens.
      const state = marketState(m.schedules, m.scheduleParsed, now, m.closures);
      const label = `${m.name}, ${m.city}, ${m.state}: ${t(STATE_KEY[state])}`;
      const icon = L.divIcon({
        className: '',
        html: `<div class="marker-pin" style="background:${COLORS[state]}"><span aria-hidden="true">${GLYPH[state]}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      });
      const marker = L.marker([m.geo.lat, m.geo.lng], { icon, title: label, alt: label, keyboard: true });
      marker.bindPopup(() => {
        const s = marketStatus(m.schedules, m.scheduleParsed, now, m.closures);
        return `<strong>${escapeHtml(m.name)}</strong><br>${escapeHtml(`${m.city}, ${m.state}`)}<br>${escapeHtml(statusText(s, now, t, i18n.language))}<br><a href="#/market/${m.id}">${escapeHtml(t('map.details'))} →</a>`;
      });
      marker.on('keypress', (e) => {
        if ((e.originalEvent as KeyboardEvent).key === 'Enter') navigate(`/market/${m.id}`);
      });
      return marker;
    });
    group.addLayers(markers);
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, markets, now, navigate, t, i18n.language]);
  return null;
}

/** A map button that zooms out to the contiguous US. */
function WholeCountry() {
  const map = useMap();
  const { t } = useTranslation();
  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'leaflet-bar map-us-button');
        btn.type = 'button';
        btn.textContent = t('map.wholeUs');
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', () => map.fitBounds(MAINLAND_BOUNDS));
        return btn;
      },
    });
    const c = new Control({ position: 'topright' });
    c.addTo(map);
    return () => {
      c.remove();
    };
  }, [map, t]);
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
        <WholeCountry />
        <FitTo origin={origin} />
      </MapContainer>
    </div>
  );
}
