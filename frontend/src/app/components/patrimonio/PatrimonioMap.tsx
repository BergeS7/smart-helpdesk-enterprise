import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import { centroMaranhao, municipiosMaranhao } from "../../data/municipiosMaranhao";
import type { Device } from "../../types/device";

const MARANHAO_BOUNDS: [[number, number], [number, number]] = [[-7.9, -48.8], [-0.7, -41.7]];
const IBGE_MARANHAO_GEOJSON = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/21?formato=application/vnd.geo%2Bjson&qualidade=minima";
const IBGE_CACHE_KEY = "smart-helpdesk:mapa:maranhao:v1";
const IBGE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type GeoJsonCache = { data: GeoJsonObject; expiresAt: number };

function readGeoJsonCache(): GeoJsonObject | null {
  try {
    const cached = JSON.parse(localStorage.getItem(IBGE_CACHE_KEY) || "null") as GeoJsonCache | null;
    return cached?.data && cached.expiresAt > Date.now() ? cached.data : null;
  } catch { return null; }
}

function writeGeoJsonCache(data: GeoJsonObject) {
  try { localStorage.setItem(IBGE_CACHE_KEY, JSON.stringify({ data, expiresAt: Date.now() + IBGE_CACHE_TTL_MS })); } catch { /* armazenamento indisponível */ }
}

function MapFocus({ device, municipio }: { device?: Device | null; municipio?: string }) {
  const map = useMap();
  useEffect(() => {
    if (device && device.latitude != null && device.longitude != null) map.flyTo([device.latitude, device.longitude], 12, { duration: 0.8 });
    else if (municipio) {
      const alvo = municipiosMaranhao.find((item) => item.nome === municipio);
      if (alvo) map.flyTo([alvo.latitude, alvo.longitude], 10, { duration: 0.8 });
    }
  }, [device, map, municipio]);
  return null;
}

function ZoomObserver({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

function FitMaranhao({ data, focused }: { data: GeoJsonObject | null; focused: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!data || focused) return;
    const bounds = L.geoJSON(data).getBounds();
    map.fitBounds(bounds, { padding: [18, 18], animate: false });
    map.setMaxBounds(bounds.pad(0.025));
  }, [data, focused, map]);
  return null;
}

export function PatrimonioMap({ devices, allDevices, selected, municipio, onSelect, onMunicipioSelect }: { devices: Device[]; allDevices: Device[]; selected?: Device | null; municipio?: string; onSelect: (device: Device) => void; onMunicipioSelect: (municipio: string) => void }) {
  const [maranhaoGeoJson, setMaranhaoGeoJson] = useState<GeoJsonObject | null>(() => readGeoJsonCache());
  const [zoom, setZoom] = useState(7);
  useEffect(() => {
    if (maranhaoGeoJson) return;
    const controller = new AbortController();
    fetch(IBGE_MARANHAO_GEOJSON, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<GeoJsonObject> : null)
      .then((data) => { if (data) { writeGeoJsonCache(data); setMaranhaoGeoJson(data); } })
      .catch(() => {});
    return () => controller.abort();
  }, [maranhaoGeoJson]);

  const positionedDevices = useMemo(() => devices.filter((device) => device.latitude != null && device.longitude != null), [devices]);
  const icons = useMemo(() => new Map(positionedDevices.map((device) => {
    const ativo = selected?.id === device.id;
    return [device.id, L.divIcon({ className: "device-marker-wrapper", html: `<span class="device-marker device-marker-${ativo ? "selected" : device.status}"><span></span></span>`, iconSize: [28, 28], iconAnchor: [14, 14] })];
  })), [positionedDevices, selected?.id]);

  const devicesByMunicipio = useMemo(() => {
    const grouped = new Map<string, Device[]>();
    for (const device of allDevices) {
      const group = grouped.get(device.municipio) || [];
      group.push(device);
      grouped.set(device.municipio, group);
    }
    return grouped;
  }, [allDevices]);
  const cidades = useMemo(() => municipiosMaranhao.map((cidade) => {
    const ativos = devicesByMunicipio.get(cidade.nome) || [];
    const alertas = ativos.filter((device) => device.status !== "online").length;
    const icon = L.divIcon({ className: "city-dot-wrapper", html: `<div class="city-dot ${alertas ? "city-dot-alert" : ""}"><span>${ativos.length}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
    return { ...cidade, ativos, icon };
  }).filter((cidade) => cidade.ativos.length > 0), [devicesByMunicipio]);

  return <MapContainer center={centroMaranhao} zoom={7} minZoom={7} maxZoom={15} maxBounds={MARANHAO_BOUNDS} maxBoundsViscosity={1} scrollWheelZoom className="h-full w-full">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" bounds={MARANHAO_BOUNDS} noWrap />
    {zoom <= 9 && cidades.map((cidade) => <Marker key={cidade.nome} position={[cidade.latitude, cidade.longitude]} icon={cidade.icon} eventHandlers={{ click: () => onMunicipioSelect(cidade.nome) }}><Tooltip direction="top" offset={[0, -12]}><b>{cidade.nome}</b><br />{cidade.ativos.length} computador(es)<br /><span className="text-emerald-600">{cidade.ativos.filter((device) => device.status === "online").length} online</span></Tooltip></Marker>)}
    {zoom > 9 && positionedDevices.map((device) => <Marker key={device.id} position={[device.latitude!, device.longitude!]} icon={icons.get(device.id)!} eventHandlers={{ click: () => onSelect(device) }}><Tooltip direction="top" offset={[0, -10]} opacity={1}><div className="min-w-40"><b>{device.hostname}</b><br />{device.patrimonio}<br />{device.municipio}<br /><span className={`device-tooltip-${device.status}`}>{device.status === "online" ? "Online" : device.status === "warning" ? "Atenção" : "Offline"}</span></div></Tooltip></Marker>)}
    <MapFocus device={selected} municipio={municipio} />
    <FitMaranhao data={maranhaoGeoJson} focused={Boolean(selected || municipio)} />
    <ZoomObserver onZoom={setZoom} />
  </MapContainer>;
}
