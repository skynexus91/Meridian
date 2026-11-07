import {test,expect,type Page} from '@playwright/test';
async function openTab(page:Page,name:string){
 const navigation=page.getByRole('navigation',{name:'Main navigation'});
 if(!await navigation.isVisible())await page.getByRole('button',{name:'Side panel',exact:true}).click();
 await navigation.getByRole('button',{name,exact:true}).click();
}

test('live interface, source details and place persistence',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByRole('link',{name:'Meridian home'})).toBeVisible();await expect(page.locator('.news-card').first()).toBeVisible({timeout:30000});
 await page.locator('.news-card').first().click();await expect(page.getByRole('dialog',{name:'Event details'})).toBeVisible();await expect(page.getByText('Source timeline')).toBeVisible();await expect(page.locator('.source-timeline a').first()).toHaveAttribute('href',/^https?:/);await page.getByRole('button',{name:'Close event details'}).click();
 await page.getByRole('textbox',{name:'Search places'}).fill('Bucuresti');await page.locator('.search-results>button').first().click();
 if(testInfo.project.name==='mobile')await page.locator('.mobile-switch').getByRole('button',{name:'List'}).click();
 await page.locator('.focus-banner').getByRole('button',{name:'Follow place'}).click();await expect(page.locator('.focus-banner')).toContainText('Following');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('meridian:places')??'[]'))).toContain('ro-bucharest');
 await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('meridian:places')??'[]'))).toContain('ro-bucharest');
 await page.screenshot({path:`test-results/${testInfo.project.name}-overview.png`,fullPage:true});expect(errors).toEqual([]);
});
test('radio favorites, explicit playback and source health',async({page})=>{await page.goto('/');await openTab(page,'Radio');await expect(page.getByRole('heading',{name:'On the air'})).toBeVisible();expect(await page.locator('audio').count()).toBe(0);await page.getByRole('button',{name:'Save Europa FM',exact:true}).click();await expect(page.getByRole('button',{name:'Save Europa FM',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Listen to Europa FM',exact:true}).click();await expect(page.locator('.radio-player')).toContainText('Europa FM');await expect(page.locator('audio')).toHaveAttribute('src',/^https:/);await page.getByRole('button',{name:'Close radio player'}).click();await openTab(page,'Sources');await expect(page.getByRole('heading',{name:'Source health'})).toBeVisible();await expect(page.locator('.source-row').first()).toBeVisible();});
test('weather forecast and satellite controls',async({page},testInfo)=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await openTab(page,'Weather');await expect(page.locator('.forecast-main')).toBeVisible({timeout:30000});await expect(page.locator('.imagery-card').first()).toBeVisible({timeout:30000});await page.locator('.imagery-card').first().click();if(testInfo.project.name==='mobile')await page.locator('.mobile-switch').getByRole('button',{name:'Map'}).click();await expect(page.getByRole('slider',{name:'Weather imagery frame'})).toBeVisible();await page.getByRole('button',{name:'Play imagery',exact:true}).click();await expect(page.getByRole('button',{name:'Pause imagery',exact:true})).toBeVisible();await page.getByRole('button',{name:'Pause imagery',exact:true}).click();await page.screenshot({path:`test-results/${testInfo.project.name}-weather.png`,fullPage:true});expect(errors).toEqual([]);});
test('responsive layout has no horizontal overflow',async({page},testInfo)=>{await page.goto('/');await page.waitForTimeout(1000);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(testInfo.project.name==='mobile'){await page.locator('.mobile-switch').getByRole('button',{name:'Map'}).click();await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible();}await page.screenshot({path:`test-results/${testInfo.project.name}-map.png`,fullPage:true});});
test('camera cards open the in-app viewer',async({page})=>{await page.goto('/');await openTab(page,'Cameras');await page.locator('.camera-card').first().click();await expect(page.getByRole('dialog',{name:'Camera directory'})).toBeVisible();await page.getByRole('button',{name:'Close camera',exact:true}).click();await expect(page.locator('.camera-modal')).toHaveCount(0);});
test('administration remains locked without a valid token',async({page})=>{await page.goto('/');if(!await page.getByRole('button',{name:'Local administration',exact:true}).isVisible())await page.locator('.panel-toggle').click();await page.getByRole('button',{name:'Local administration',exact:true}).click();await expect(page.getByRole('dialog',{name:'Local administration'})).toBeVisible();await page.getByLabel('Administrator token').fill('invalid-token');await page.getByRole('button',{name:'Unlock tools'}).click();await expect(page.locator('.admin-status')).toContainText('Administrator token required');await page.getByRole('button',{name:'Close administration'}).click();});
test('malformed saved preferences recover without crashing',async({page})=>{await page.addInitScript(()=>{localStorage.setItem('meridian:language','"invalid-language"');localStorage.setItem('meridian:places','{"corrupted":true}');localStorage.setItem('meridian:stations','null');localStorage.setItem('meridian:lastVisit','not-a-date');});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByRole('link',{name:'Meridian home'})).toBeVisible();await expect(page.getByRole('combobox',{name:'Interface language'})).toHaveValue('en');await openTab(page,'My places');await expect(page.getByText('Search a city and follow it')).toBeVisible();expect(errors).toEqual([]);});
test('Romanian interface choice persists',async({page})=>{await page.goto('/');await page.getByRole('combobox',{name:'Interface language'}).selectOption('ro');await expect(page.locator('html')).toHaveAttribute('lang','ro');if(!await page.locator('.rail').isVisible())await page.locator('.panel-toggle').click();await expect(page.getByRole('navigation').getByRole('button',{name:'Știri',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('combobox',{name:'Limba interfeței'})).toHaveValue('ro');});
test('news remains usable when map tiles fail',async({page})=>{await page.route('https://tiles.openfreemap.org/**',r=>r.abort());await page.goto('/');await expect(page.locator('.news-card').first()).toBeVisible({timeout:30000});await page.locator('.news-card').first().click();await expect(page.getByRole('dialog',{name:'Event details'})).toBeVisible();await page.getByRole('button',{name:'Close event details'}).click();});

test('approved direct radio supports volume, navigation and fallback link',async({page})=>{
 const wav=Buffer.alloc(8044,128);wav.write('RIFF',0);wav.writeUInt32LE(8036,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(8000,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(8000,40);
 await page.route('**/api/stations',r=>r.fulfill({json:{stations:[{id:'test-radio',name:'Approved test station',country:'RO',region:'National',city:'Bucharest',genre:'news',lat:44.43,lon:26.1,url:'https://example.org/player',stream:'https://media.example.org/test.wav',rights:'Test-only fixture; never part of the app catalog'}]}}));await page.route('https://media.example.org/test.wav',r=>r.fulfill({contentType:'audio/wav',body:wav}));
 await page.goto('/');await openTab(page,'Radio');expect(await page.locator('audio').count()).toBe(0);await page.getByRole('button',{name:'Listen to Approved test station',exact:true}).click();await expect.poll(()=>page.locator('audio').evaluate((e:HTMLAudioElement)=>e.volume)).toBeCloseTo(.7);await expect(page.locator('.radio-player a[target="_blank"]')).toHaveCount(0);await page.getByRole('slider',{name:'Radio volume'}).fill('0.4');await expect.poll(()=>page.locator('audio').evaluate((e:HTMLAudioElement)=>e.volume)).toBeCloseTo(.4);await openTab(page,'News');await expect(page.locator('audio')).toHaveCount(1);await page.getByRole('button',{name:'Close radio player'}).click();await expect(page.locator('audio')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('traffic opens at the selected locality and exposes the incident drawer',async({page,context})=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:46.548,longitude:23.884});
 await page.goto('/');await openTab(page,'Traffic');
 const road=page.getByRole('region',{name:'Road traffic'});await expect(road).toBeVisible();
 await road.getByRole('button',{name:'My area'}).click();
 await expect(road).toContainText('Câmpia Turzii');
 await road.getByRole('button',{name:/INFOTRAFIC/}).click();await expect(road).toContainText('Pozițiile sunt aproximative');
 await road.getByRole('button',{name:'Close traffic'}).click();await expect(road).toHaveCount(0);
});

test('theme persists and burger navigation works on phones',async({page},info)=>{
 await page.goto('/');
 const mode=page.getByRole('switch',{name:'Dark mode',exact:true});
 await mode.click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.reload();await expect(mode).toHaveAttribute('aria-checked','true');
 if(info.project.name==='mobile'){
  await page.getByRole('button',{name:'Side panel',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
  await openTab(page,'Satellites');
  await expect(page.getByRole('heading',{name:'Sateliți',exact:true})).toBeVisible();
 }else{
  await page.getByRole('button',{name:'Side panel',exact:true}).click();
  await expect(page.locator('#regional-panel')).toBeHidden();
  await page.getByRole('button',{name:'Side panel',exact:true}).click();
  await expect(page.locator('#regional-panel')).toBeVisible();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/'+info.project.name+'-redesign-dark.png'});
});
test('saved locality restores when GPS is denied',async({page},info)=>{
 await page.addInitScript(()=>{localStorage.setItem('meridian:lastPlace','"ro-turda"');Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_ok:unknown,fail:(value:object)=>void)=>fail({code:1})}});});
 let ipRequests=0;page.on('request',r=>{if(r.url().includes('ipapi.co'))ipRequests++;});
 await page.goto('/');
 if(info.project.name==='mobile')await page.locator('.mobile-switch').getByRole('button',{name:'Map',exact:true}).click();
 await page.getByRole('button',{name:'My location',exact:true}).click();
 await expect(page.locator('.map-title')).toContainText('Turda');
 expect(ipRequests).toBe(0);
});
test('earth products and computed satellite tracks are available',async({request})=>{
 const earth=await(await request.get('/api/earth/layers')).json();
 expect(earth.error).toBeUndefined();expect(earth.data.length).toBeGreaterThanOrEqual(8);
 for(const layer of earth.data){expect(layer.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);expect(layer.date<=new Date().toISOString().slice(0,10)).toBe(true);}
 const orbits=await(await request.get('/api/satellites')).json();
 expect(orbits.data.length).toBeGreaterThan(0);
 expect(orbits.data[0].track[0].length).toBeGreaterThan(1);
});
