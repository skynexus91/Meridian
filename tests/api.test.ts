import {afterEach,describe,expect,it,vi} from 'vitest';
import {api} from '../src/lib';

afterEach(()=>vi.unstubAllGlobals());

describe('API throttling responses',()=>{
 it('exposes Retry-After delay-seconds on a 429 response',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:429,headers:{'Retry-After':'5'}})));
  await expect(api('/api/events')).rejects.toMatchObject({status:429,retryAfterMs:5000});
 });

 it('parses HTTP-date Retry-After headers',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-08T00:00:00.000Z'));
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:429,headers:{'Retry-After':'Sun, 08 Nov 2026 00:00:10 GMT'}})));
  await expect(api('/api/events')).rejects.toMatchObject({status:429,retryAfterMs:10000});
  vi.useRealTimers();
 });

 it('keeps the plain-language message and retries after a default delay when the header is absent',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:429})));
  await expect(api('/api/events')).rejects.toMatchObject({status:429,retryAfterMs:undefined,message:'The server is temporarily limiting requests. Data will retry shortly.'});
 });
});
