import {useEffect,useMemo,useState} from 'react';
import {Button,Card,Typography} from 'antd';
import {Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {proxyDirectionChartData} from './proxyLedgerUtils.js';

const storageKey='proxy-pay-direction-chart-collapsed';
const amountLabel=value=>`${Number(value||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})} TJS`;

export default function ProxyPayDirectionChart({metrics=[]}){
 const [collapsed,setCollapsed]=useState(()=>localStorage.getItem(storageKey)==='1');
 const data=useMemo(()=>proxyDirectionChartData(metrics),[metrics]);
 useEffect(()=>localStorage.setItem(storageKey,collapsed?'1':'0'),[collapsed]);
 return <Card className="proxy-chart-card" title="Переводы по направлениям" extra={<Button type="link" onClick={()=>setCollapsed(value=>!value)}>{collapsed?'Показать':'Скрыть график'}</Button>}>
  {collapsed?<Typography.Text type="secondary">График скрыт. Настройка сохранена для этого браузера.</Typography.Text>:<div className="proxy-chart-wrap">
   <ResponsiveContainer width="100%" height={310}>
    <BarChart data={data} margin={{top:10,right:24,left:12,bottom:8}}>
     <CartesianGrid strokeDasharray="3 3" vertical={false}/>
     <XAxis dataKey="name"/>
     <YAxis yAxisId="amount" tickFormatter={value=>Number(value).toLocaleString('ru-RU')}/>
     <YAxis yAxisId="count" orientation="right" allowDecimals={false}/>
     <Tooltip formatter={(value,name)=>name==='Сумма ПЦ'?amountLabel(value):Number(value).toLocaleString('ru-RU')}/>
     <Legend/>
     <Bar yAxisId="amount" dataKey="amount" name="Сумма ПЦ" fill="#c8102e" radius={[6,6,0,0]}/>
     <Bar yAxisId="count" dataKey="count" name="Количество" fill="#607d8b" radius={[6,6,0,0]}/>
    </BarChart>
   </ResponsiveContainer>
  </div>}
 </Card>;
}
