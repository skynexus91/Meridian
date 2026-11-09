import {test,expect,type Page} from '@playwright/test';
const place={id:'bucharest',name:'București',country:'RO',region:'București',lat:44.4268,lon:26.1025,aliases:['Bucharest']};
test.beforeEach(async({page,context})=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:place.lat,longitude:place.lon});
 await page.route('**/api/location?*',route=>route.fulfill({json:{place}}));
});
async function openPanel(page:Page,name:string){const navigation=page.getByRole('navigation',{name:'Main navigation'});if(!await navigation.isVisible())await page.getByRole('button',{name:'Side panel',exact:true}).click();await navigation.getByRole('button',{name,exact:true}).click();}

test('Romania is the only data scope',async({page,request})=>{
 await page.goto('/');
 for(const [endpoint,key] of [['sources','sources'],['places','places'],['stations','stations']] as const){const body=await(await request.get('/api/'+endpoint)).json();expect(body[key].length).toBeGreaterThan(0);expect(body[key].every((value:any)=>value.country==='RO')).toBe(true);}
 expect((await request.get('/api/events?country=UA')).status()).toBe(400);expect((await request.get('/api/alerts')).status()).toBe(404);
 await expect(page.locator('.country-tabs')).toHaveCount(0);await expect(page.getByRole('navigation').getByRole('button',{name:/Ukraine|Ucraina|Україн/i})).toHaveCount(0);
});

test('world news opens a full article with its photo inside the app',async({page},info)=>{
 await page.route('https://publisher.test/news.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#bfd8e5"/></svg>'}));
 await page.route('**/api/world/news?*',route=>route.fulfill({json:{data:{stories:[{id:'romanian-reader-fixture',title:'Romanian test article',source:'Redacție de test',at:new Date().toISOString(),url:'https://publisher.test/story'}]},stale:false}}));
 await page.route('**/api/world/article/romanian-reader-fixture',route=>route.fulfill({json:{data:{id:'romanian-reader-fixture',title:'Romanian test article',source:'Redacție de test',url:'https://publisher.test/story',publishedAt:new Date().toISOString(),image:'https://publisher.test/news.svg',restricted:false,blocks:[{kind:'paragraph',text:'Primul paragraf integral este afișat în aplicație.'},{kind:'heading',text:'Detalii locale'},{kind:'paragraph',text:'Al doilea paragraf rămâne alături de imaginea și sursa articolului.'}]},stale:false}}));
 await page.goto('/');await openPanel(page,'News');await page.locator('.world-stories button').first().click();
 await expect(page.locator('.world-article-reader')).toContainText('Al doilea paragraf');const image=page.locator('.world-reader-image');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((element:HTMLImageElement)=>element.naturalWidth)).toBeGreaterThan(0);
 expect(new URL(page.url()).hostname).toBe('127.0.0.1');await page.screenshot({path:`test-results/${info.project.name}-romania-reader.png`});
});

test('traffic coverage status is clear without a configured tile provider',async({page})=>{
 await page.goto('/');await expect(page.locator('.region-stat')).toContainText(/Traffic enabled automatically|Trafic activ automat/);
 await expect(page.locator('.live-traffic-panel iframe')).toHaveCount(0);
});

test('road bulletin markers open their details inside the map',async({page},info)=>{
 const road={id:'road-fixture-romania',kind:'road',lat:44.4268,lon:26.1025,name:'Test INFOTRAFIC București',source:'INFOTRAFIC',observedAt:new Date().toISOString(),description:'Poziție aproximativă la nivel de localitate.'};
 await page.route('**/api/observations?layer=road**',route=>route.fulfill({json:{data:[road],stale:false}}));
 await page.route('**/api/road-detail?*',route=>route.fulfill({json:{data:{paragraphs:['Circulația este restricționată în zona București. Buletin de test.']},stale:false}}));
 await page.goto('/');await expect(page.locator('.road-marker').first()).toBeVisible({timeout:30000});await page.locator('.road-marker').first().click();
 await expect(page.locator('.observation-card')).toContainText('Buletin de test');expect(new URL(page.url()).pathname).toBe('/');
 await page.screenshot({path:`test-results/${info.project.name}-romania-traffic.png`});
});
