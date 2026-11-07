import {test,expect,type Page} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));});
async function open(page:Page,name:string){
 const button=page.getByRole('navigation').getByRole('button',{name,exact:true});
 if(!await button.isVisible())await page.locator('.panel-toggle').click();
 await button.click();
}
test('Romania is the only data scope',async({page,request})=>{
 await page.goto('/');
 for(const [endpoint,key] of [['sources','sources'],['places','places'],['stations','stations']] as const){
  const body=await(await request.get('/api/'+endpoint)).json();
  expect(body[key].length).toBeGreaterThan(0);expect(body[key].every((v:any)=>v.country==='RO')).toBe(true);
 }
 expect((await request.get('/api/events?country=UA')).status()).toBe(400);
 expect((await request.get('/api/alerts')).status()).toBe(404);
 await expect(page.locator('.country-tabs')).toHaveCount(0);
 await expect(page.locator('.rail').getByRole('button',{name:/Ukraine|Ucraina|Україн/i})).toHaveCount(0);
});
test('news opens a full article with its published photo inside the app',async({page},info)=>{
 await page.route('https://publisher.test/news.jpg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#bfd8e5"/></svg>'}));
  await page.route('**/api/articles/*',r=>r.fulfill({json:{stale:false,data:{id:'reader-fixture',title:'Articol pentru verificarea interfeței',source:'Redacție de test',url:'https://publisher.test/story',publishedAt:new Date().toISOString(),image:'https://publisher.test/news.jpg',restricted:false,blocks:[{kind:'paragraph',text:'Primul paragraf integral este afișat în aplicație pentru verificarea cititorului.'},{kind:'heading',text:'Detalii locale'},{kind:'paragraph',text:'Al doilea paragraf rămâne disponibil alături de imaginea și sursa articolului.'}]}}}));
 await page.goto('/');await open(page,'News');await page.locator('.news-card').first().click();
 await expect(page.getByRole('article',{name:'Articol complet'})).toContainText('Al doilea paragraf');
 const image=page.locator('.article-hero img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 expect(new URL(page.url()).hostname).toBe('127.0.0.1');
 await page.screenshot({path:'test-results/'+info.project.name+'-romania-reader.png'});
});
test('live traffic layer loads in-map with tax info',async({page})=>{
 await page.goto('/');await open(page,'Traffic');
 const liveBtn=page.getByRole('button',{name:'Live traffic',exact:true});
 await expect(liveBtn).toBeVisible();
 await liveBtn.click();
 await expect(page.locator('.live-traffic-button.live-on')).toBeVisible({timeout:30000});
 await page.getByRole("button",{name:"Road tax info",exact:true}).click();
 await expect(page.locator('.tax-box')).toBeVisible();
 await liveBtn.click();
 await expect(page.locator('.live-traffic-button.live-on')).toHaveCount(0);
});
test('in-map traffic tiles load without leaving the page',async({page},info)=>{
 await page.goto('/');await open(page,'Traffic');
 await page.getByRole('button',{name:'Live traffic',exact:true}).click();
 await expect(page.locator('.live-traffic-button.live-on')).toBeVisible({timeout:30000});
 const canvas=page.locator('canvas.maplibregl-canvas');await expect(canvas).toBeVisible();
 await expect(page.url()).toContain('127.0.0.1');
 await page.screenshot({path:'test-results/'+info.project.name+'-romania-traffic.png'});
 await page.getByRole('button',{name:'Live traffic',exact:true}).click();
});
