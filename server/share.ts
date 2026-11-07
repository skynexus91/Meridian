import type {NewsEvent} from '../src/types.js';
export const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function socialHtml(html:string,event?:NewsEvent){
 const title=event?`${event.title} — Meridian`:'Meridian — România în direct';
 const description=event?`${event.articles.length} linked report(s). ${event.place?.name??event.country} · Updated ${event.updatedAt}. Read the original sources and timeline.`:'Explore source-linked news, weather, satellite imagery, public traffic data and radio in Romania.';
 const tags=`<meta property="og:type" content="${event?'article':'website'}"/><meta property="og:site_name" content="Meridian"/><meta property="og:title" content="${escapeHtml(title)}"/><meta property="og:description" content="${escapeHtml(description)}"/><meta name="twitter:card" content="summary"/>`;
 return html.replace(/<title>.*?<\/title>/,`<title>${escapeHtml(title)}</title>`).replace('</head>',`${tags}</head>`);
}
