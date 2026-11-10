import type {FullConfig} from '@playwright/test';

export default async function productionSetup(config:FullConfig){
 const baseURL=config.projects[0]?.use.baseURL;
 if(!baseURL)throw new Error('Production browser tests require a base URL.');
 try{
  const health=await fetch(new URL('/api/health',baseURL),{signal:AbortSignal.timeout(10000)});
  if(!health.ok)throw new Error(`Health endpoint returned HTTP ${health.status}.`);
  const status=await health.json();
  if(status.app!=='meridian'||status.ok!==true)throw new Error('Health endpoint did not identify a ready Meridian API.');

  const index=await fetch(new URL('/',baseURL),{signal:AbortSignal.timeout(10000)});
  if(!index.ok)throw new Error(`App entry returned HTTP ${index.status}.`);
  const html=await index.text();
  if(!/<script\b[^>]*\bsrc="\/assets\/[^"\s]+\.js"/i.test(html))throw new Error('App entry does not reference a production bundle.');
 }catch(error){
  const detail=error instanceof Error?error.message:String(error);
  throw new Error(`Production test target ${baseURL} is unavailable or unbuilt. ${detail} Run npm run build for local tests or check TEST_BASE_URL.`,{cause:error});
 }
}
