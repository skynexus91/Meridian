import {ShieldAlert} from 'lucide-react';
import {useApi,ago} from './lib';
import {useTranslation} from './i18n';
export default function Warnings({country}:{country:string}){
 const tr=useTranslation();const result=useApi<any>('/api/warnings',60000);const ro=result.data?.romania;
 return <section className="official-warnings"><div><ShieldAlert size={15}/><strong>ANM · Avertizări meteo</strong></div>{result.error?<p>Starea avertizărilor este necunoscută momentan.</p>:result.loading&&!ro?<p>Se verifică sursa…</p>:ro?.data?.bulletins?.map((b:any,i:number)=><p key={i}>{b.title}</p>)}{ro?.stale&&<p>Copie salvată · verificarea sursei a eșuat.</p>}{ro?.at&&<small>{tr('Retrieved')} {tr(ago(ro.at))}</small>}</section>;
}
