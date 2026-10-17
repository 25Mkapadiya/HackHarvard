import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_ATTRIBUTION, TILE_URL } from '../../app/config';
import type { LatLng } from '../../lib/geo';

const pin = L.divIcon({
  className: '',
  html: '<div class="marker-pin" style="background:#24513F"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

/** Where a single market is. No routing: just the pin on the map. */
export default function LocationMap({ geo, label }: { geo: LatLng; label: string }) {
  return (
    <div className="h-56 overflow-hidden rounded-lg border border-line" role="img" aria-label={label}>
      <MapContainer center={[geo.lat, geo.lng]} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker position={[geo.lat, geo.lng]} icon={pin} keyboard={false} />
      </MapContainer>
    </div>
  );
}
