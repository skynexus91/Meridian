import {test,expect,type Page} from '@playwright/test';

async function openPanel(page:Page,name:string){
 const navigation=page.getByRole('navigation',{name:'Main navigation'});
 if(!await navigation.isVisible())await page.getByRole('button',{name:'Side panel',exact:true}).click();
 await navigation.getByRole('button',{name,exact:true}).click();
}

test('world radio stays in app while switching panels',async({page})=>{
 const popups:string[]=[];page.on('popup',popup=>popups.push(popup.url()));
 await page.evaluate(()=>{HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('playing'));return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'));};});
 await page.route('**/api/world/radio?*',route=>route.fulfill({json:{data:{stations:[{id:'integration-radio',name:'Integration World Radio',country:'GB',region:'London',stream:'https://example.test/integration.mp3'}]},stale:false}}));
 await page.goto('/');await openPanel(page,'Radio');await page.locator('.world-station').click();
 await expect(page.locator('.radio-player')).toContainText('Integration World Radio');
 await openPanel(page,'News');await expect(page.locator('audio')).toHaveCount(1);
 expect(new URL(page.url()).hostname).toBe('127.0.0.1');expect(popups).toEqual([]);
 await page.getByRole('button',{name:/Close radio player|Închide playerul radio/}).click();await expect(page.locator('audio')).toHaveCount(0);
});

test('mapped road bulletins open in app',async({page},info)=>{
 const incident={id:'road-fixture',kind:'road',lat:46.57,lon:23.78,name:'Incident rutier pentru verificare',source:'INFOTRAFIC',observedAt:new Date().toISOString(),description:'Poziție aproximativă la nivel de localitate.'};
 await page.route('**/api/observations?layer=road**',route=>route.fulfill({json:{data:[incident],stale:false}}));
 await page.route('**/api/road-detail?*',route=>route.fulfill({json:{data:{paragraphs:['Circulația este restricționată în zona indicată. Acesta este un buletin folosit exclusiv în test.']},stale:false}}));
 await page.goto('/');const marker=page.locator('.road-marker').first();await expect(marker).toBeVisible({timeout:30000});await marker.click();
 await expect(page.locator('.observation-card')).toContainText('Circulația este restricționată');
 expect(new URL(page.url()).pathname).toBe('/');await page.screenshot({path:`test-results/${info.project.name}-integrated-traffic.png`});
});

test('public camera browsing remains disabled',async({page})=>{
 await page.goto('/');const navigation=page.getByRole('navigation',{name:'Main navigation'});
 if(!await navigation.isVisible())await page.getByRole('button',{name:'Side panel',exact:true}).click();
 await expect(navigation.getByRole('button',{name:'Cameras',exact:true})).toHaveCount(0);
 await expect(page.locator('.camera-card,.camera-modal')).toHaveCount(0);
});

test('saved Cluj locality does not narrow the national event feed',async({page,request})=>{
 const place={id:'ro-turda',name:'Turda',country:'RO',region:'Cluj',lat:46.5667,lon:23.7833,aliases:[]};
 await page.addInitScript(()=>localStorage.setItem('meridian:lastPlace','"ro-turda"'));
 await page.route('**/api/places',route=>route.fulfill({json:{places:[place]}}));
 const eventsRequest=page.waitForRequest(r=>r.url().includes('/api/events?'));
 await page.goto('/');await expect(page.locator('.map-title')).toContainText('Turda');
 const query=new URL((await eventsRequest).url()).searchParams;expect(query.has('place')).toBe(false);expect(query.get('country')).toBe('RO');
 const sources=await(await request.get('/api/sources')).json();
 expect(sources.sources.filter((source:any)=>source.country==='RO'&&source.enabled).length).toBeGreaterThanOrEqual(45);
});
