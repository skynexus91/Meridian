import {describe,it,expect} from 'vitest';
import {radioStations} from '../server/radio';
import {speechChunks} from '../src/speech';
describe('station directory normalization',()=>{
 it('collapses duplicate stream URLs rather than showing six copies',()=>{const stations=radioStations([{stationuuid:'a',name:'Europa FM Romania',countrycode:'RO',url_resolved:'https://example.com/live'},{stationuuid:'b',name:'EUROPA FM',countrycode:'RO',url_resolved:'https://example.com/live'}]);expect(stations).toHaveLength(1);expect(stations[0].stream).toBe('https://example.com/live');});
 it('retains alternative streams for one station and keeps country filtering identity',()=>{const result=radioStations([{stationuuid:'a',name:'Radio One',countrycode:'RO',url:'https://example.com/a.mp3'},{stationuuid:'b',name:'Radio One',countrycode:'RO',url:'https://example.com/b.aac'},{stationuuid:'c',name:'Radio One',countrycode:'GB',url:'https://example.org/gb'}]);expect(result).toHaveLength(2);expect(result[0].streams).toEqual(['https://example.com/a.mp3','https://example.com/b.aac']);expect(result[1].country).toBe('GB');});
 it('does not expose insecure or missing stream records as playable stations',()=>{expect(radioStations([{name:'Bad',url:'http://example.com/stream'},{name:'None'},{name:'TV',codec:'H264',url:'https://example.com/tv.m3u8'}])).toEqual([]);});
});
describe('complete article speech',()=>{
 it('keeps all text beyond the old 2000-character cutoff',()=>{const input='This complete public article must be read to its last paragraph. '.repeat(160)+'THE END';const parts=speechChunks(input);expect(parts.length).toBeGreaterThan(4);expect(parts.every(part=>part.length<=1800)).toBe(true);expect(parts.join(' ')).toBe(input);expect(parts.at(-1)).toContain('THE END');});
 it('handles empty text and long unbroken content without dropping characters',()=>{expect(speechChunks(' ')).toEqual([]);const text='x'.repeat(4001);expect(speechChunks(text).join('')).toBe(text);});
});
