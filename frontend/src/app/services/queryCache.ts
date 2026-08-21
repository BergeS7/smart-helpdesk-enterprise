import { useCallback, useEffect, useState } from "react";

type Entry<T>={data:T;expires:number};
const cache=new Map<string,Entry<unknown>>();
const pending=new Map<string,Promise<unknown>>();

export async function cachedQuery<T>(key:string,loader:()=>Promise<T>,ttlMs=15000,force=false):Promise<T>{
  const current=cache.get(key) as Entry<T>|undefined;
  if(!force&&current&&current.expires>Date.now())return current.data;
  if(!force&&pending.has(key))return pending.get(key) as Promise<T>;
  const request=loader().then(data=>{cache.set(key,{data,expires:Date.now()+ttlMs});return data}).finally(()=>pending.delete(key));
  pending.set(key,request);return request;
}

export function invalidateQuery(prefix:string){for(const key of cache.keys())if(key.startsWith(prefix))cache.delete(key)}

export function useAutoQuery<T>(key:string,loader:()=>Promise<T>,options:{intervalMs?:number;ttlMs?:number}={}){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState<Error|null>(null),[loading,setLoading]=useState(true);
  const refresh=useCallback(async(force=false)=>{setLoading(!data);setError(null);try{setData(await cachedQuery(key,loader,options.ttlMs,force))}catch(e){setError(e instanceof Error?e:new Error(String(e)))}finally{setLoading(false)}},[data,key,loader,options.ttlMs]);
  useEffect(()=>{void refresh();if(!options.intervalMs)return;const timer=window.setInterval(()=>void refresh(true),options.intervalMs);return()=>window.clearInterval(timer)},[options.intervalMs,refresh]);
  return {data,error,loading,refresh};
}
