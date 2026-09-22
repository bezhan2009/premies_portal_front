import {useEffect, useState} from 'react';
import {resolveClientDocumentUrl} from '../utils/clientDocuments.js';

// Portal files require the same JWT and client scope as their metadata. Never
// send a portal token to an application-server or external document URL.
export default function useClientDocumentUrl(document, enabled=true) {
 const source=enabled ? resolveClientDocumentUrl(document) : '';
 const [file,setFile]=useState({source:'',url:''});
 let protectedFile=false;
 try { const u=new URL(source); protectedFile=u.origin===new URL(import.meta.env.VITE_BACKEND_URL).origin && u.pathname.startsWith('/uploads/client_documents/'); } catch {}
 useEffect(()=>{
  if(!protectedFile || !source) return;
  const controller=new AbortController(); let objectUrl='';
  setFile({source:'',url:''});
  fetch(source,{headers:{Authorization:`Bearer ${localStorage.getItem('access_token')}`},signal:controller.signal,cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('Документ недоступен');return r.blob();})
   .then(blob=>{if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setFile({source,url:objectUrl});})
   .catch(()=>{});
  return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[source,protectedFile]);
 return protectedFile ? (file.source===source ? file.url : '') : source;
}
