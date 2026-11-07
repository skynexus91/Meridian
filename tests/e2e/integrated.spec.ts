import {test,expect,type Page} from '@playwright/test';
async function tab(page:Page,name:string){
 if(!await page.locator('.rail').isVisible())await page.locator('.panel-toggle').click();
 await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
}
test('radio plays inside Meridian and keeps playing across panels',async({page})=>{
 const popups:string[]=[];page.on('popup',p=>popups.push(p.url()));
 await page.goto('/');await tab(page,'Radio');
 await page.getByRole('button',{name:'Listen to Digi FM',exact:true}).click();
 await expect(page.locator('.radio-player')).toContainText('Digi FM');
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime),{timeout:30000}).toBeGreaterThan(1);
 await tab(page,'News');await expect(page.locator('audio')).toHaveCount(1);
 await page.getByRole('button',{name:'Pause radio',exact:true}).click();
 expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
 await page.getByRole('button',{name:'Close radio player',exact:true}).click();
 await expect(page.locator('audio')).toHaveCount(0);expect(popups).toEqual([]);
});
test('road markers open the full bulletin without leaving the app',async({page},info)=>{
 const id='https://www.politiaromana.ro/ro/info-trafic/test-fixture';
 const incident={id,kind:'road',lat:46.57,lon:23.78,name:'Incident rutier verificare interfață',source:'INFOTRAFIC',observedAt:new Date().toISOString(),description:'Poziție aproximativă la nivel de localitate.'};
 await page.route('**/api/observations?layer=road',r=>r.fulfill({json:{data:[incident],stale:false}}));
 await page.route('**/api/road-detail?*',r=>r.fulfill({json:{data:{paragraphs:['Circulația este restricționată în zona indicată. Acesta este un buletin folosit exclusiv în test.']},stale:false}}));
 await page.goto('/');await tab(page,'Traffic');
 const marker=page.locator('.road-marker').first();await expect(marker).toBeVisible({timeout:30000});await marker.click();
 await expect(page.locator('.observation-card')).toContainText('Circulația este restricționată');
 expect(new URL(page.url()).pathname).toBe('/');
 await page.screenshot({path:'test-results/'+info.project.name+'-integrated-traffic.png'});
});
test('camera selection stays in the app and explains provider restrictions',async({page})=>{
 await page.goto('/');await tab(page,'Cameras');
 await page.locator('.camera-card').first().click();
 await expect(page.getByRole('dialog',{name:'Camera directory'})).toBeVisible();
 await expect(page.locator('.camera-modal .integration-status')).toContainText(/autoriz|integrabil/,{timeout:30000});
 expect(new URL(page.url()).hostname).toBe('127.0.0.1');
 await page.getByRole('button',{name:'Close camera',exact:true}).click();
 await expect(page.locator('.camera-modal')).toHaveCount(0);
});
test('saved Cluj locality does not silently limit nationwide news',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:lastPlace','"ro-turda"'));
 const queries:string[]=[];page.on('request',r=>{if(r.url().includes('/api/events?'))queries.push(r.url());});
 await page.goto('/');await expect(page.locator('.news-geoscope')).toBeVisible({timeout:30000});
 await expect(page.getByRole('button',{name:'Whole country',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(queries.every(url=>!new URL(url).searchParams.has('place'))).toBe(true);
 const sources=await(await page.request.get('/api/sources')).json();
 expect(sources.sources.filter((s:any)=>s.country==='RO'&&s.enabled).length).toBeGreaterThanOrEqual(45);
});
