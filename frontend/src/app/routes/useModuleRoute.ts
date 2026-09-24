/**
 * Responsabilidade: Rotas de use module route; associa endpoints aos middlewares e controladores autorizados.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type RouteValue = string | readonly string[];
type RouteMap<T extends string> = Record<T,RouteValue>;

function paths(value:RouteValue){return typeof value==="string"?[value]:[...value]}
function canonical(value:RouteValue){return paths(value)[0]}
const APP_BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
function logicalPathname(){
  const pathname=window.location.pathname;
  if(pathname===APP_BASE_PATH||pathname===`${APP_BASE_PATH}/`)return "/";
  return pathname.startsWith(`${APP_BASE_PATH}/`)?pathname.slice(APP_BASE_PATH.length):pathname;
}
function publicPath(pathname:string){return `${APP_BASE_PATH}${pathname}`||"/"}

export function useModuleRoute<T extends string>(routes:RouteMap<T>, fallback:T):[T,(next:T)=>void] {
  const fromPath=useCallback(()=>Object.entries(routes).find(([,value])=>paths(value as RouteValue).includes(logicalPathname()))?.[0] as T||fallback,[routes,fallback]);
  const [current,setCurrent]=useState<T>(fromPath);
  const popping=useRef(false);
  useEffect(()=>{const onPop=()=>{popping.current=true;setCurrent(fromPath())};window.addEventListener("popstate",onPop);return()=>window.removeEventListener("popstate",onPop)},[fromPath]);
  useEffect(()=>{const value=routes[current];if(!value)return;const target=canonical(value);const currentPath=logicalPathname();const known=paths(value).includes(currentPath);if(currentPath===target){popping.current=false;return}if(known){window.history.replaceState({module:current},"",`${publicPath(target)}${window.location.search}`);popping.current=false;return}if(popping.current){popping.current=false;return}window.history.pushState({module:current},"",`${publicPath(target)}${window.location.search}`)},[current,routes]);
  const navigate=useCallback((next:T)=>setCurrent(next),[]);
  return [current,navigate];
}

export const PORTAL_ROUTES = {
  home:"/portal/inicio", chamados:"/portal/chamados", base:"/portal/conhecimento", avisos:"/portal/notificacoes",
  acessos:"/portal/acessos", ranking:"/portal/ranking-satisfacao", dashboard:"/portal/dashboard", patrimonio:"/portal/patrimonio", relatorios:"/portal/relatorios",
} as const;
