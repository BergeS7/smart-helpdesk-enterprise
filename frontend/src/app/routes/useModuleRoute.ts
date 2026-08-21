import { useCallback, useEffect, useRef, useState } from "react";

type RouteValue = string | readonly string[];
type RouteMap<T extends string> = Record<T,RouteValue>;

function paths(value:RouteValue){return typeof value==="string"?[value]:[...value]}
function canonical(value:RouteValue){return paths(value)[0]}

export function useModuleRoute<T extends string>(routes:RouteMap<T>, fallback:T):[T,(next:T)=>void] {
  const fromPath=useCallback(()=>Object.entries(routes).find(([,value])=>paths(value as RouteValue).includes(window.location.pathname))?.[0] as T||fallback,[routes,fallback]);
  const [current,setCurrent]=useState<T>(fromPath);
  const popping=useRef(false);
  useEffect(()=>{const onPop=()=>{popping.current=true;setCurrent(fromPath())};window.addEventListener("popstate",onPop);return()=>window.removeEventListener("popstate",onPop)},[fromPath]);
  useEffect(()=>{const value=routes[current];if(!value)return;const target=canonical(value);const known=paths(value).includes(window.location.pathname);if(window.location.pathname===target){popping.current=false;return}if(known){window.history.replaceState({module:current},"",`${target}${window.location.search}`);popping.current=false;return}if(popping.current){popping.current=false;return}window.history.pushState({module:current},"",`${target}${window.location.search}`)},[current,routes]);
  const navigate=useCallback((next:T)=>setCurrent(next),[]);
  return [current,navigate];
}

export const PORTAL_ROUTES = {
  home:"/portal/inicio", chamados:"/portal/chamados", base:"/portal/conhecimento", avisos:"/portal/notificacoes",
  dashboard:"/portal/dashboard", relatorios:"/portal/relatorios",
} as const;
