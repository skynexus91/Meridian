import Parser from 'rss-parser';
import {cached} from './providers.js';
import {fetchText} from './feeds.js';
const parser=new Parser();
export function warningText(value:unknown):string{if(typeof value==='string')return value.replace(/<[^>]*>/g,'').trim();if(Array.isArray(value))return value.map(warningText).join(' ');if(value&&typeof value==='object')return Object.entries(value).filter(([k])=>k!=='$').map(([,v])=>warningText(v)).join(' ');return '';}
export async function getWarnings(){
 const romania=await cached('anm-warnings',60000,async()=>{
  const feed=await parser.parseString((await fetchText('https://www.meteoromania.ro/avertizari-rss.php')).body);
  if(!feed.items.length)throw Error('Warning feed contains no status');
  return {country:'RO',provider:'ANM',url:'https://www.meteoromania.ro/vremea/avertizari/',bulletins:feed.items.map(i=>({title:warningText(i.title)||'Buletin meteo',description:warningText(i.contentSnippet??i.content),publishedAt:i.isoDate,url:i.link}))};
 });
 return {romania};
}
