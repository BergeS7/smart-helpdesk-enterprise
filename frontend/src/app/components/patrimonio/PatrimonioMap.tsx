import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import { centroMaranhao, municipiosMaranhao } from "../../data/municipiosMaranhao";
import type { Device } from "../../types/device";

const MARANHAO_BOUNDS: [[number, number], [number, number]] = [[-7.9, -48.8], [-0.7, -41.7]];
const IBGE_MARANHAO_GEOJSON = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/21?formato=application/vnd.geo%2Bjson&qualidade=minima";
function MapFocus({ device, municipio }: { device?: Device | null; municipio?: string }) {
  const map = useMap();
  useEffect(() => {
    if (device) map.flyTo([device.latitude, device.longitude], 12, { duration: 0.8 });
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

export function PatrimonioMap({ devices, allDevices, selected, municipio, onSelect, onMunicipioSelect }: { devices: Device[]; allDevices: Device[]; selected?: Device | null; municipio?: string; onSelect: (device: Device) => void; onMunicipioSelect: (municipio: string) => void }) {
  const [maranhaoGeoJson, setMaranhaoGeoJson] = useState<GeoJsonObject | null>(null);
  const [zoom, setZoom] = useState(7);
  useEffect(() => {
    fetch(IBGE_MARANHAO_GEOJSON).then((response) => response.ok ? response.json() : null).then(setMaranhaoGeoJson).catch(() => setMaranhaoGeoJson(null));
  }, []);
  const icons = useMemo(() => new Map(devices.map((device) => {
    const ativo = selected?.id === device.id;
    return [device.id, L.divIcon({
      className: "device-marker-wrapper",
      html: `<span class="device-marker device-marker-${ativo ? "selected" : device.status}"><span></span></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })];
  })), [devices, selected?.id]);

  const cidades = useMemo(() => municipiosMaranhao.map((cidade) => {
    const ativos = allDevices.filter((device) => device.municipio === cidade.nome);
    const alertas = ativos.filter((device) => device.status !== "online").length;
    const icon = L.divIcon({ className: "city-dot-wrapper", html: `<div class="city-dot ${alertas ? "city-dot-alert" : ""}"><span>${ativos.length}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
    return { ...cidade, ativos, icon };
  }).filter((cidade) => cidade.ativos.length > 0), [allDevices]);

  return (
    <MapContainer center={centroMaranhao} zoom={7} minZoom={7} maxZoom={15} maxBounds={MARANHAO_BOUNDS} maxBoundsViscosity={1} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" bounds={MARANHAO_BOUNDS} noWrap />
      {maranhaoGeoJson && <GeoJSON data={maranhaoGeoJson} style={{ color: "#2563eb", weight: 3, opacity: .88, fillColor: "#2563eb", fillOpacity: .035 }} />}
      {zoom <= 9 && cidades.map((cidade) => <Marker key={cidade.nome} position={[cidade.latitude, cidade.longitude]} icon={cidade.icon} eventHandlers={{ click: () => onMunicipioSelect(cidade.nome) }}><Tooltip direction="top" offset={[0, -12]}><b>{cidade.nome}</b><br />{cidade.ativos.length} computador(es)<br /><span className="text-emerald-600">{cidade.ativos.filter((device) => device.status === "online").length} online</span></Tooltip></Marker>)}
      {zoom > 9 && devices.map((device) => (
        <Marker key={device.id} position={[device.latitude, device.longitude]} icon={icons.get(device.id)!} eventHandlers={{ click: () => onSelect(device) }}>
          <Tooltip direction="top" offset={[0, -10]} opacity={1}><div className="min-w-40"><b>{device.hostname}</b><br />{device.patrimonio}<br />{device.municipio}<br /><span className={`device-tooltip-${device.status}`}>{device.status === "online" ? "Online" : device.status === "warning" ? "Atenção" : "Offline"}</span></div></Tooltip>
        </Marker>
      ))}
      <MapFocus device={selected} municipio={municipio} />
      <ZoomObserver onZoom={setZoom} />
    </MapContainer>
  );
}
