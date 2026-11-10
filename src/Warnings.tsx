import {ShieldAlert} from 'lucide-react';
import {useApi,ago} from './lib';
import {useTranslation} from './i18n';
export default function Warnings({country}:{country:string}){
 const tr=useTranslation();const result=useApi<any>('/api/warnings',60000);const ro=result.data?.romania;
 return <section className="official-warnings"><div><ShieldAlert size={15}/><strong>{tr("ANM weather warnings")}</strong></div>{result.error?<p>{tr("Warning status is currently unknown.")}</p>:result.loading&&!ro?<p>{tr("Verifying source…")}</p>:ro?.data?.bulletins?.map((b:any,i:number)=><p key={i}>{b.title}</p>)}{ro?.stale&&<p>{tr("Saved copy · source verification failed.")}</p>}{ro?.at&&<small>{tr("Retrieved")} {tr(ago(ro.at))}</small>}</section>;
}
