import {describe,it,expect,vi,afterEach} from 'vitest';
import {extractArticle} from '../server/articles';
import {matchingHeadline} from '../server/world-reader';
import {photonPois} from '../server/open-pois';
afterEach(()=>vi.unstubAllGlobals());
describe('complete public news text',()=>{
 it('reads every paragraph of public structured article text',()=>{const body=['First public paragraph '.repeat(8),'Last public paragraph '.repeat(8)].join('\n\n');const html='<script type="application/ld+json">'+JSON.stringify({'@type':'NewsArticle',articleBody:body,isAccessibleForFree:true})+'</script>';const article=extractArticle(html,'https://example.com/news');expect(article.blocks).toHaveLength(2);expect(article.blocks[1].text).toContain('Last public paragraph');});
 it('does not expose restricted structured article text',()=>{const html='<script type="application/ld+json">'+JSON.stringify({'@type':'NewsArticle',articleBody:'Private text '.repeat(50),isAccessibleForFree:false})+'</script>';expect(extractArticle(html,'https://example.com/').blocks).toHaveLength(0);});
 it('matches exact publisher headlines and source suffixes, not unrelated stories',()=>{expect(matchingHeadline('Un nou parc public deschis în Câmpia Turzii','Un nou parc public deschis în Câmpia Turzii - Ziar local')).toBe(true);expect(matchingHeadline('Accident în centru','Alt accident în centru')).toBe(false);});
});
describe('reliable nearby category POIs',()=>{it('uses reverse category search and retains real location/name metadata',async()=>{const request=vi.fn().mockResolvedValue(Response.json({features:[{properties:{osm_type:'N',osm_id:3,osm_key:'amenity',osm_value:'fuel',name:'Petrom',city:'Câmpia Turzii',countrycode:'RO'},geometry:{coordinates:[23.89,46.55]}}]}));vi.stubGlobal('fetch',request);const pois=await photonPois([[23.88,46.55]],3000,'fuel');expect(pois[0]).toMatchObject({name:'Petrom',type:'fuel',lat:46.55,lon:23.89,country:'RO'});const url=new URL(request.mock.calls[0][0]);expect(url.pathname).toBe('/reverse');expect(url.searchParams.getAll('osm_tag')).toEqual(['amenity:fuel']);expect(url.searchParams.get('radius')).toBe('3');});});
