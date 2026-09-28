/**
 * Responsabilidade: Componente de interface de patrimonio map; apresenta dados e interações do usuário.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useLocalidades } from "../../hooks/useLocalidades";
import { VISAO_BRASIL, areaDaEmpresa, type Area } from "../../domain/mapaArea";
import type { Device } from "../../types/device";

type Coordenada = { latitude: number; longitude: number };

function media(pontos: Coordenada[]): Coordenada | null {
  if (!pontos.length) return null;
  return {
    latitude: pontos.reduce((soma, p) => soma + p.latitude, 0) / pontos.length,
    longitude: pontos.reduce((soma, p) => soma + p.longitude, 0) / pontos.length,
  };
}

function MapFocus({ device, municipio, coordenadasCidades }: { device?: Device | null; municipio?: string; coordenadasCidades: Map<string, Coordenada> }) {
  const map = useMap();
  useEffect(() => {
    if (device && device.latitude != null && device.longitude != null) map.flyTo([device.latitude, device.longitude], 12, { duration: 0.8 });
    else if (municipio) {
      const alvo = coordenadasCidades.get(municipio);
      if (alvo) map.flyTo([alvo.latitude, alvo.longitude], 10, { duration: 0.8 });
    }
  }, [coordenadasCidades, device, map, municipio]);
  return null;
}

function ZoomObserver({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

// Enquadra a região da empresa ao abrir e quando as unidades mudam; depois que a pessoa mexe no mapa, não interfere mais.
function EnquadrarEmpresa({ area, focused }: { area: Area | null; focused: boolean }) {
  const map = useMap();
  const mexeu = useRef(false);
  const ultimaArea = useRef("");
  useMapEvents({ dragstart: () => { mexeu.current = true; } });
  useEffect(() => {
    const chave = JSON.stringify(area);
    if (!area || focused || chave === ultimaArea.current || (mexeu.current && ultimaArea.current)) return;
    ultimaArea.current = chave;
    map.fitBounds(area, { padding: [24, 24], maxZoom: 11, animate: false });
  }, [area, focused, map]);
  return null;
}

export function PatrimonioMap({ devices, allDevices, selected, municipio, onSelect, onMunicipioSelect }: { devices: Device[]; allDevices: Device[]; selected?: Device | null; municipio?: string; onSelect: (device: Device) => void; onMunicipioSelect: (municipio: string) => void }) {
  const [zoom, setZoom] = useState(VISAO_BRASIL.zoom);

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
  // As bolinhas das cidades surgem em sequência só na primeira vez; a atualização a cada 30 s
  // recria os ícones e não deve repetir a entrada.
  const citiesShown = useRef(false);
  const { unidades } = useLocalidades();
  // Posição de cada cidade: média das unidades da empresa com coordenada; sem elas, a dos computadores dali.
  const coordenadasCidades = useMemo(() => {
    const resultado = new Map<string, Coordenada>();
    for (const municipio of new Set([...unidades.map((u) => u.municipio), ...devicesByMunicipio.keys()])) {
      const daUnidade = media(unidades.filter((u) => u.municipio === municipio && u.latitude != null && u.longitude != null) as Coordenada[]);
      const dosAtivos = media((devicesByMunicipio.get(municipio) || []).filter((d) => d.latitude != null && d.longitude != null) as Coordenada[]);
      const coordenada = daUnidade || dosAtivos;
      if (coordenada) resultado.set(municipio, coordenada);
    }
    return resultado;
  }, [devicesByMunicipio, unidades]);
  const cidades = useMemo(() => [...coordenadasCidades.entries()].map(([nome, coordenada], index) => {
    const cidade = { nome, ...coordenada };
    const ativos = devicesByMunicipio.get(cidade.nome) || [];
    const alertas = ativos.filter((device) => device.status !== "online").length;
    const icon = L.divIcon({ className: "city-dot-wrapper", html: `<div class="city-dot ${alertas ? "city-dot-alert" : ""}${citiesShown.current ? "" : " city-dot-intro"}" style="animation-delay:${Math.min(index, 30) * 35}ms"><span>${ativos.length}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
    return { ...cidade, ativos, icon };
  }).filter((cidade) => cidade.ativos.length > 0), [coordenadasCidades, devicesByMunicipio]);
  useEffect(() => { if (cidades.length) citiesShown.current = true; }, [cidades]);
  const area = useMemo(() => areaDaEmpresa(unidades, allDevices), [allDevices, unidades]);

  return <MapContainer center={VISAO_BRASIL.centro} zoom={VISAO_BRASIL.zoom} minZoom={3} maxZoom={15} scrollWheelZoom className="h-full w-full">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" noWrap />
    {zoom <= 9 && cidades.map((cidade) => <Marker key={cidade.nome} position={[cidade.latitude, cidade.longitude]} icon={cidade.icon} eventHandlers={{ click: () => onMunicipioSelect(cidade.nome) }}><Tooltip direction="top" offset={[0, -12]}><b>{cidade.nome}</b><br />{cidade.ativos.length} computador(es)<br /><span className="text-emerald-600">{cidade.ativos.filter((device) => device.status === "online").length} online</span></Tooltip></Marker>)}
    {zoom > 9 && positionedDevices.map((device) => <Marker key={device.id} position={[device.latitude!, device.longitude!]} icon={icons.get(device.id)!} eventHandlers={{ click: () => onSelect(device) }}><Tooltip direction="top" offset={[0, -10]} opacity={1}><div className="min-w-40"><b>{device.hostname}</b><br />{device.patrimonio}<br />{device.municipio}<br /><span className={`device-tooltip-${device.status}`}>{device.status === "online" ? "Online" : device.status === "warning" ? "Atenção" : "Offline"}</span></div></Tooltip></Marker>)}
    <MapFocus device={selected} municipio={municipio} coordenadasCidades={coordenadasCidades} />
    <EnquadrarEmpresa area={area} focused={Boolean(selected || municipio)} />
    <ZoomObserver onZoom={setZoom} />
  </MapContainer>;
}
