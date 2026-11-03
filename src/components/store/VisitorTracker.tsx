"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
export function VisitorTracker(){
 const pathname=usePathname(); const search=useSearchParams();
 useEffect(()=>{
  try {
   let sessionId=sessionStorage.getItem("50500_analytics_session");
   if(!sessionId){sessionId=typeof crypto!="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;sessionStorage.setItem("50500_analytics_session",sessionId);}
   const url=`${window.location.pathname}${window.location.search}`;
   void fetch("/api/track",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({sessionId,path:pathname||"/",referrer:document.referrer||"",url,language:navigator.language||""})}).catch(()=>{});
  } catch { /* tracking must not affect shopping */ }
 },[pathname,search]);
 return null;
}
