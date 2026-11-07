import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('../server/providers',()=>({cached:async(_key:string,_ttl:number,load:()=>Promise<unknown>)=>({data:await load(),stale:false})}));
vi.mock('../server/store',()=>({put:vi.fn(),get:vi.fn(),readArticles:vi.fn()}));
vi.mock('node:dns/promises',()=>({resolveSrv:vi.fn(async()=>[{name:'de1.api.radio-browser.info'},{name:'de2.api.radio-browser.info'}])}));
vi.mock('../server/feeds',()=>({fetchText:vi.fn()}));
import {readArticles} from '../server/store';
import {fetchText} from '../server/feeds';
import {headlineIsLocal,worldNews,worldRadio} from '../server/world';
beforeEach(()=>{vi.resetAllMocks();vi.mocked(readArticles).mockReturnValue([]);});afterEach(()=>vi.unstubAllGlobals());
describe('worldwide information sources',()=>{
 it('fetches location-specific headlines and keeps publisher links',async()=>{
  vi.mocked(fetchText).mockResolvedValueOnce({body:'<rss version="2.0"><channel><title>News</title><item><title>London road update</title><link>https://example.com/story</link><guid>one</guid></item></channel></rss>',response:new Response(),notModified:false});
  const result=await worldNews('London',true,'en');expect(result.data!.stories).toHaveLength(1);expect(result.data!.stories[0].url).toBe('https://example.com/story');const url=new URL(vi.mocked(fetchText).mock.calls[0][0]);expect(url.searchParams.get('q')).toContain('London');expect(url.searchParams.get('q')).toContain('OR');
 });
 it('falls back to another radio directory server and filters insecure audio',async()=>{
  const fetch=vi.fn().mockRejectedValueOnce(Error('First host offline')).mockResolvedValueOnce(Response.json([{stationuuid:'uk-1',name:'London Radio',countrycode:'GB',url_resolved:'https://example.com/live',homepage:'https://example.com'},{stationuuid:'bad',url_resolved:'http://example.com/insecure'}]));vi.stubGlobal('fetch',fetch);
  const result=await worldRadio('GB','London');expect(result.data!.stations).toHaveLength(1);expect(result.data!.stations[0].country).toBe('GB');expect(fetch).toHaveBeenCalledTimes(2);expect(String(fetch.mock.calls[1][0])).toContain('countrycode=GB');
 });
});

describe('local news boundaries',()=>{
 it('keeps locality matches and drops unrelated national headlines',()=>{expect(headlineIsLocal('Accident în Slatina','', 'Slatina')).toBe(true);expect(headlineIsLocal('Traffic in New York today','','New York')).toBe(true);expect(headlineIsLocal('World economy today','National summary','Slatina')).toBe(false);expect(headlineIsLocal('Slatinaville update','','Slatina')).toBe(false);});
 it('matches locality names independently of diacritics',()=>{expect(headlineIsLocal('Știri despre București','','Bucuresti')).toBe(true);});
 it('requires an area instead of returning an unfiltered world feed',async()=>{const result=await worldNews('',false,'en');expect(result.data?.stories).toEqual([]);expect(fetchText).not.toHaveBeenCalled();});
});
