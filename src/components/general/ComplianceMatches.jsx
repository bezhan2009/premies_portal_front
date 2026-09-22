import { complianceMatches, complianceMatchFields } from "../../utils/complianceRequests.js";
import {useEffect, useRef, useState} from "react";

export default function ComplianceMatches({ value, requestId }) {
  const [details,setDetails]=useState(null),[loading,setLoading]=useState(false),[warning,setWarning]=useState(''),[enriched,setEnriched]=useState(false);
  const requested=useRef(false);
  const generation=useRef(0), controller=useRef(null);
  useEffect(()=>{setDetails(null);setWarning('');setEnriched(false);setLoading(false);requested.current=false;generation.current+=1;return ()=>{generation.current+=1;controller.current?.abort();};},[value,requestId]);
  const matches = complianceMatches(details || value);
  const loadDetails=async()=>{
    if (!requestId || requested.current || !matches.some(match=>match.source==='DROPPERS_LIST' && !match.data?.org_name)) return;
    requested.current=true;setLoading(true);setWarning('');
    const currentGeneration=generation.current;
    controller.current=new AbortController();
    try {
      const response=await fetch(`${import.meta.env.VITE_BACKEND_URL}/compliance/requests/${encodeURIComponent(requestId)}/match-details`,{signal:controller.current.signal,headers:{Authorization:`Bearer ${localStorage.getItem('access_token')||''}`}});
      if(!response.ok)throw new Error('Не удалось загрузить дополнительные сведения');
      const result=await response.json();if(currentGeneration!==generation.current)return;setDetails(result.matches);setEnriched(Boolean(result.details_enriched));setWarning(result.warning||'');
    } catch(error){if(currentGeneration===generation.current && error.name!=='AbortError')setWarning(error.message);}finally{if(currentGeneration===generation.current)setLoading(false);}
  };
  if (!matches.length) return <span>Нет совпадений</span>;
  return <div className="compliance-matches">{loading && <small role="status">Загрузка подробностей…</small>}{warning && <p role="status">{warning} <button type="button" onClick={()=>{requested.current=false;loadDetails();}}>Повторить</button></p>}{enriched && <small>Дополнительные поля — из актуального списка. Решение и процент совпадения в заявке не изменены.</small>}{matches.map((match, index) => <details onToggle={event=>{if(event.currentTarget.open)loadDetails();}} key={`${match.source}-${match.data?.id ?? index}-${index}`} style={{ marginBottom: 8 }}>
    <summary style={{ cursor: "pointer", fontWeight: 600 }}>{match.source || "Неизвестный список"} · {(Number(match.similarity || 0) * 100).toFixed(1)}%</summary>
    <dl style={{ display: "grid", gridTemplateColumns: "minmax(100px, 1fr) minmax(0, 2fr)", gap: "6px 12px", margin: "10px 0", overflowWrap: "anywhere" }}>{complianceMatchFields(match).map(([label, content],fieldIndex) => <div key={`${label}-${fieldIndex}`} style={{ display: "contents" }}><dt>{label}</dt><dd style={{ margin: 0 }}>{content}</dd></div>)}</dl>
  </details>)}</div>;
}
