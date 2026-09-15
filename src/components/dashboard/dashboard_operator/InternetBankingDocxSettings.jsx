import React from "react";
import { FileText, Download, Printer } from "lucide-react";
import { IB_DOCX_PLACEMENTS, initialBankingDocx } from "../../../utils/internetBankingDocx";

export default function InternetBankingDocxSettings({template,onChange}) {
 const config={...initialBankingDocx(),...template.internetBanking};
 const update=patch=>onChange({...template,internetBanking:{...config,...patch},page:"InternetBanking",section:patch.placement||config.placement,conditions:[],mobileEnabled:false,mobileDocumentType:""});
 const icons={file:FileText,download:Download,print:Printer};const Icon=icons[config.icon];
 const colors={primary:{background:"#d80d29",color:"white",borderColor:"#d80d29"},secondary:{background:"#f1f3f6",color:"#252a35",borderColor:"#f1f3f6"},outline:{background:"white",color:"#252a35",borderColor:"#cbd0d9"},link:{background:"transparent",color:"#b40b25",borderColor:"transparent"}};
 return <section className="docx-editor-card">
  <h2>Кнопка в интернет-банкинге</h2>
  <p>Доступ проверяется по правам ИБ. Документ формируется для выбранной компании и принадлежащего ей продукта.</p>
  <label><input type="checkbox" checked={config.enabled} onChange={e=>update({enabled:e.target.checked})}/> Показывать клиентам интернет-банка</label>
  <div className="docx-placement-grid" style={{marginTop:16}}>{IB_DOCX_PLACEMENTS.map(place=><button type="button" key={place.id} className={`docx-placement-option ${config.placement===place.id?"is-active":""}`} onClick={()=>update({placement:place.id,requiresPeriod:false})}><strong>{place.title}</strong><small>{place.hint}</small><small>{place.scope}</small></button>)}</div>
  <div className="docx-form-grid" style={{marginTop:16}}>
   <label className="docx-field">Текст кнопки<input maxLength={80} value={config.label} placeholder={template.name||"Сформировать документ"} onChange={e=>update({label:e.target.value})}/></label>
   <label className="docx-field">Подсказка<input maxLength={240} value={config.tooltip} onChange={e=>update({tooltip:e.target.value})}/></label>
   {[["style","Вид кнопки",[["primary","Основная"],["secondary","Второстепенная"],["outline","С обводкой"],["link","Ссылка"]]],["size","Размер",[["small","Компактный"],["medium","Обычный"],["large","Крупный"]]],["icon","Значок",[["file","Документ"],["download","Скачать"],["print","Печать"],["none","Без значка"]]]].map(([key,label,options])=><label className="docx-field" key={key}>{label}<select value={config[key]} onChange={e=>update({[key]:e.target.value})}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>)}
   <label className="docx-field">Порядок кнопки<input type="number" min={0} max={999} value={config.order} onChange={e=>update({order:Number(e.target.value)})}/></label>
   <div className="docx-field"><span>Доступные форматы</span>{["pdf","docx"].map(format=><label key={format}><input type="checkbox" checked={config.formats.includes(format)} onChange={e=>{const formats=e.target.checked?[...config.formats,format]:config.formats.filter(item=>item!==format);if(formats.length)update({formats,defaultFormat:formats.includes(config.defaultFormat)?config.defaultFormat:formats[0]});}}/> {format.toUpperCase()}</label>)}</div>
   <label className="docx-field">Формат по умолчанию<select value={config.defaultFormat} onChange={e=>update({defaultFormat:e.target.value})}>{config.formats.map(format=><option key={format} value={format}>{format.toUpperCase()}</option>)}</select></label>
   {config.placement==="account"&&<label><input type="checkbox" checked={config.requiresPeriod} onChange={e=>update({requiresPeriod:e.target.checked})}/> Запрашивать период выписки (до 31 дня)</label>}
  </div>
  <div style={{padding:24,marginTop:16,background:"#fafafa",borderRadius:12}}><small>Предпросмотр кнопки</small><div style={{marginTop:12}}><button type="button" title={config.tooltip} style={{...colors[config.style],display:"inline-flex",alignItems:"center",gap:8,borderWidth:1,borderStyle:"solid",borderRadius:10,padding:config.size==="small"?"7px 12px":config.size==="large"?"14px 22px":"10px 16px",fontWeight:600}}>{Icon&&<Icon size={18}/>} {config.label||template.name||"Сформировать документ"}</button></div></div>
 </section>;
}
