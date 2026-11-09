import {test,expect,type Page} from '@playwright/test';

async function openPanel(page:Page,name:string){
 const navigation=page.getByRole('navigation',{name:'Main navigation'});
 if(!await navigation.isVisible())await page.getByRole('button',{name:'Side panel',exact:true}).click();
 await navigation.getByRole('button',{name,exact:true}).click();
}

test('world radio stays in app while switching panels',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:lastPlace','"radio-city"'));
 await page.route('**/api/places',r=>r.fulfill({json:{places:[{id:'radio-city',name:'London',country:'GB',region:'Greater London',lat:51.5,lon:-.12,aliases:[]}]}}));

 const popups:string[]=[];page.on('popup',popup=>popups.push(popup.url()));
 await page.evaluate(()=>{HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('playing'));return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'));};});
 await page.route('**/api/world/radio?*',route=>route.fulfill({json:{data:{stations:[{id:'integration-radio',name:'Integration World Radio',country:'GB',region:'London',stream:'https://example.test/integration.mp3'}]},stale:false}}));
 await page.goto('/');await openPanel(page,'Radio');await page.locator('.world-station').click();
 await expect(page.locator('.radio-player')).toContainText('Integration World Radio');
 await openPanel(page,'News');await expect(page.locator('audio')).toHaveCount(1);
 expect(new URL(page.url()).hostname).toBe('127.0.0.1');expect(popups).toEqual([]);
 await page.getByRole('button',{name:/Close radio player|Închide playerul radio/}).click();await expect(page.locator('audio')).toHaveCount(0);
});

test('map inspector keeps incidents and places visible and preserves pin actions',async({page},info)=>{
 const incident={id:'road-fixture',kind:'road',lat:46.57,lon:23.78,name:'Incident rutier pentru verificare',source:'INFOTRAFIC',observedAt:new Date().toISOString(),description:'Poziție aproximativă la nivel de localitate.'};
 const place={id:'ro-turda',name:'Turda',country:'RO',region:'Cluj',lat:incident.lat,lon:incident.lon,aliases:[]};
 const poi={id:'fixture-fuel',name:'Test fuel stop',type:'fuel',city:'Turda',region:'Cluj',lat:incident.lat,lon:23.789,rights:'Test fixture'};
 await page.addInitScript(id=>{
  localStorage.setItem('meridian:lastPlace',JSON.stringify(id));
  localStorage.setItem('meridian:language','"en"');
 },place.id);
 await page.route('**/api/places',route=>route.fulfill({json:{places:[place]}}));
 await page.route('**/api/pois?*',route=>route.fulfill({json:{pois:[poi]}}));
 await page.route('**/api/observations?layer=road**',route=>route.fulfill({json:{data:[incident],stale:false}}));
 await page.route('**/api/road-detail?*',route=>route.fulfill({json:{data:{paragraphs:['Circulația este restricționată în zona indicată. Acesta este un buletin folosit exclusiv în test.']},stale:false}}));
 await page.goto('/');
 const roadButton=page.getByRole('button',{name:incident.name,exact:true});
 await roadButton.evaluate(button=>{button.dataset.qaOriginal='true';});
 const layerToggle=page.getByRole('button',{name:'Map layers',exact:true});
 await layerToggle.press('Enter');
 await expect(page.getByRole('heading',{name:'Map layers',exact:true})).toBeFocused();
 const newsLayer=page.getByRole('complementary',{name:'Map layers'}).getByRole('button',{name:/News/});
 await newsLayer.click();
 await expect(newsLayer).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');
 await expect(layerToggle).toBeFocused();
 await expect(roadButton).toHaveAttribute('data-qa-original','true');
 await roadButton.press('Enter');
 const inspector=page.locator('.map-inspector');
 await expect(inspector.getByRole('heading',{name:incident.name})).toBeFocused();
 await page.keyboard.press('Tab');
 await expect(inspector.getByRole('button',{name:'Close',exact:true})).toBeFocused();
 await expect(inspector).toContainText('Circulația este restricționată');
 const selection=page.locator('.map-selection-ring');
 async function selectionClearsInspector(){
  const [marker,panel]=await Promise.all([selection.boundingBox(),inspector.boundingBox()]);
  if(!marker||!panel)return false;
  const viewport=page.viewportSize()!;
  const onScreen=marker.x>=0&&marker.y>=0&&marker.x+marker.width<=viewport.width&&marker.y+marker.height<=viewport.height;
  return onScreen&&(info.project.name==='mobile'?marker.y+marker.height<panel.y:marker.x+marker.width<panel.x);
 }
 await expect.poll(selectionClearsInspector).toBe(true);
 expect(new URL(page.url()).pathname).toBe('/');await page.screenshot({path:`test-results/${info.project.name}-integrated-traffic.png`});
 await page.keyboard.press('Escape');
 await expect(inspector).toHaveCount(0);
 await expect(roadButton).toBeFocused();
 await expect(selection).toHaveCount(0);
 const poiButton=page.getByRole('button',{name:poi.name,exact:true});
 await poiButton.evaluate(button=>{button.dataset.qaOriginal='true';});
 await poiButton.click();
 await expect(inspector).toHaveAccessibleName(poi.name);
 await expect.poll(selectionClearsInspector).toBe(true);
 await inspector.getByRole('button',{name:'Pin place',exact:true}).click();
 await expect(inspector.getByRole('button',{name:'Unpin',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(poiButton).toHaveAttribute('data-qa-original','true');
 await page.screenshot({path:`test-results/${info.project.name}-place-inspector.png`});
 await inspector.getByRole('button',{name:'Navigate to',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Destination',exact:true})).toHaveValue(poi.name);
 await expect(inspector).toHaveCount(0);
});

test('news map pins are opt-in and open the latest mapped report',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 const place={id:'fixture-city',name:'Mapped city',country:'RO',region:'Cluj',lat:46,lon:25,aliases:[]};
 const report={id:'recent-report',title:'Latest report in the mapped city',country:'RO',category:'community',place,precision:'city',updatedAt:new Date().toISOString(),publishedAt:new Date().toISOString(),articles:[],independentSources:0};
 const previous={...report,id:'previous-report',title:'Earlier report in the mapped city',updatedAt:new Date(Date.now()-3600000).toISOString()};
 const national={...report,id:'national-report',title:'Country-level report',place:undefined,precision:'country'};
 await page.route('**/api/events?*',route=>route.fulfill({json:{events:[previous,national,report],total:3,asOf:report.updatedAt}}));
 await page.route('**/api/events/recent-report',route=>route.fulfill({json:report}));
 await page.route('**/api/observations?*',route=>route.fulfill({json:{data:[],stale:false}}));
 await page.route('**/api/weather/layers',route=>route.fulfill({json:{layers:[{id:'rainviewer',kind:'radar',name:'Rain radar',legend:'Observed rainfall',frames:[{time:report.updatedAt,url:'https://tiles.example.test/{z}/{x}/{y}.png'}]}]}}));
 await page.route('https://tiles.example.test/**',route=>route.abort());
 await page.goto('/');
 const pins=page.locator('.news-map-marker');
 const layers=page.getByRole('button',{name:'Map layers',exact:true});
 const news=page.getByRole('complementary',{name:'Map layers',exact:true}).getByRole('button',{name:/News/});
 await expect(layers).toBeVisible({timeout:15000});
 await layers.press('Enter');
 await expect(news).toHaveAttribute('aria-pressed','false');
 await expect(pins).toHaveCount(0);
 await news.click();
 await expect(pins).toHaveCount(1);
 await page.keyboard.press('Escape');
 const marker=page.getByRole('button',{name:report.title,exact:true});
 await expect(marker).toBeVisible();
 await page.screenshot({path:`test-results/${info.project.name}-news-layer.png`});
 await marker.press('Enter');
 const event=page.getByRole('dialog',{name:'Event details'});
 await expect(event.getByRole('heading',{name:report.title,exact:true})).toBeVisible();
 await expect(event.getByRole('button',{name:'Close event details'})).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(marker).toBeFocused();
 await layers.press('Enter');
 await news.click();
 await expect(pins).toHaveCount(0);
 const radarTile=page.waitForRequest('https://tiles.example.test/**');
 await page.getByRole('button',{name:/Weather radar/}).click();
 await expect(page.locator('.weather-timeline')).toContainText('Rain radar');
 await radarTile;
 await expect(page.getByTestId('map-canvas')).toBeVisible();
});

test('public camera browsing remains disabled',async({page})=>{
 await page.goto('/');const navigation=page.getByRole('navigation',{name:'Main navigation'});
 if(!await navigation.isVisible())await page.getByRole('button',{name:'Side panel',exact:true}).click();
 await expect(navigation.getByRole('button',{name:'Cameras',exact:true})).toHaveCount(0);
 await expect(page.locator('.camera-card,.camera-modal')).toHaveCount(0);
});

test('traffic distinguishes cached, unavailable and current feeds and opens reports',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 const now=new Date().toISOString();
 const incident={id:'cached-road',kind:'road',name:'Road works on DN1',lat:46.57,lon:23.78,observedAt:now,source:'INFOTRAFIC'};
 let feed:{data:typeof incident[];stale:boolean;at?:string;error?:string}={data:[incident],stale:true,at:now,error:'Provider unavailable'};
 let releaseInitial!:()=>void;
 const initial=new Promise<void>(resolve=>{releaseInitial=resolve;});
 await page.route('**/api/observations?layer=road*',async route=>{await initial;await route.fulfill({json:feed});});
 await page.route('**/api/road-detail?*',route=>route.fulfill({json:{data:{paragraphs:['Last official bulletin.']},stale:true}}));
 await page.route('**/api/addresses?*',route=>route.fulfill({json:{places:[{id:'turda',name:'Turda',region:'Turda',country:'RO',lat:46.57,lon:23.78,aliases:[]}]}}));
 await page.route('**/api/suggestions?*',route=>route.fulfill({json:{places:[]}}));
 const story={id:'traffic-story',title:'Roadworks begin near Turda',source:'Test publisher',at:now,url:'https://example.test/story'};
 await page.route('**/api/world/news?*',route=>route.fulfill({json:{data:{stories:[story]}}}));
 await page.route('**/api/world/article/traffic-story',route=>route.fulfill({json:{data:{...story,publishedAt:now,restricted:false,blocks:[{kind:'paragraph',text:'The bulletin says roadworks start Monday.'}]},stale:false}}));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Traffic in Romania',exact:true}).click();
 const panel=page.getByRole('complementary',{name:'Traffic',exact:true});
 const official=panel.getByRole('region',{name:'INFOTRAFIC'});
 await expect(panel).toContainText('National bulletins');
 await expect(panel).not.toContainText('Near your GPS location');
 await expect(official.getByRole('status')).toContainText('Loading road bulletins');
 releaseInitial();
 await expect(official.getByRole('status')).toContainText('Cached road bulletins');
 await expect(official.getByRole('status')).toContainText('Last updated');
 await expect(official.getByRole('button',{name:/Road works on DN1/})).toBeVisible();
 await expect(page.locator('.provider-notice')).toHaveCount(0);
 await page.screenshot({path:`test-results/${info.project.name}-cached-traffic.png`});
 await official.getByRole('button',{name:/Road works on DN1/}).click();
 await expect(page.locator('.map-inspector')).toContainText('Last official bulletin.');
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Traffic in Romania',exact:true}).click();
 async function refreshRoadFeed(next:typeof feed){
  feed=next;
  const refreshed=page.waitForResponse(response=>response.url().includes('/api/observations?layer=road'));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await refreshed;
 }
 await refreshRoadFeed({data:[],stale:true,error:'Provider unavailable'});
 await expect(official.getByRole('status')).toHaveText('Road bulletins unavailable');
 await expect(official).not.toContainText('No mapped bulletins in the current feed.');
 await refreshRoadFeed({data:[],stale:false,at:now});
 await expect(official.getByRole('status')).toContainText('0 road bulletins');
 await expect(official).toContainText('No mapped bulletins in the current feed.');
 await panel.getByRole('textbox',{name:'Information location'}).fill('Turda');
 await panel.getByRole('button',{name:'Search area'}).click();
 await panel.getByRole('button',{name:'Turda',exact:true}).click();
 await panel.getByRole('button',{name:new RegExp(story.title)}).click();
 const reader=panel.getByRole('article',{name:'News reader'});
 await expect(reader).toContainText('The bulletin says roadworks start Monday.');
 await reader.getByRole('button',{name:'Back to news'}).click();
 await expect(panel.getByRole('button',{name:new RegExp(story.title)})).toBeVisible();
});

test('radar playback pauses on an unavailable frame and can recover',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 const png=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=16;
  const context=canvas.getContext('2d')!;
  context.fillStyle='rgba(40,130,220,0.35)';
  context.fillRect(0,0,16,16);
  return canvas.toDataURL().split(',')[1];
 });
 const older={time:'2026-11-09T12:00:00Z',url:'https://radar.example.test/older/{z}/{x}/{y}.png'};
 const latest={time:'2026-11-09T12:10:00Z',url:'https://radar.example.test/latest/{z}/{x}/{y}.png'};
 let frames=[older,latest];
 let failOlder=true;
 await page.route('**/api/weather/layers',route=>route.fulfill({json:{layers:[
  {id:'rainviewer',kind:'radar',name:'Rain radar',legend:'Observed rainfall',attribution:'Test radar',frames},
  {id:'msg_fes:ir108',kind:'satellite',name:'Infrared satellite',legend:'Cloud cover',attribution:'Test satellite',frames:[{...latest,url:'https://radar.example.test/satellite.png'}]},
 ]}}));
 await page.route('https://radar.example.test/**',route=>failOlder&&route.request().url().includes('/older/')
  ?route.fulfill({status:503,body:'Unavailable'})
  :route.fulfill({contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:Buffer.from(png,'base64')}));
 await page.route('**/api/observations?*',route=>route.fulfill({json:{data:[],stale:false}}));
 await page.goto('/');
 await page.getByRole('button',{name:'Map layers',exact:true}).click();
 await page.getByRole('button',{name:/Weather radar/}).click();
 const timeline=page.getByRole('region',{name:'Weather imagery'});
 const slider=timeline.getByRole('slider',{name:'Weather imagery frame'});
 await expect(slider).toHaveValue('1');
 await expect(timeline.getByText('Loading frame…')).toHaveCount(0);
 await timeline.getByRole('button',{name:'Play imagery'}).click();
 await expect(slider).toHaveValue('0');
 await expect(timeline.getByText('This frame could not load.')).toBeVisible({timeout:15000});
 await expect(timeline.getByRole('button',{name:'Play imagery'})).toBeDisabled();
 await page.screenshot({path:`test-results/${info.project.name}-radar-retry.png`});
 failOlder=false;
 await timeline.getByRole('button',{name:'Retry frame'}).click();
 await expect(timeline.getByRole('button',{name:'Retry frame'})).toHaveCount(0);
 await expect(timeline.getByText('Loading frame…')).toHaveCount(0);
 const selectedTime=await slider.getAttribute('aria-valuetext');
 frames=[{...older,time:'2026-11-09T11:50:00Z',url:'https://radar.example.test/earliest/{z}/{x}/{y}.png'},older,latest];
 const refreshed=page.waitForResponse('**/api/weather/layers');
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await refreshed;
 await expect(slider).toHaveValue('1');
 await expect(slider).toHaveAttribute('aria-valuetext',selectedTime!);
 await timeline.getByRole('button',{name:'Latest frame'}).click();
 await expect(slider).toHaveValue('2');
 await page.getByRole('button',{name:'Map layers',exact:true}).click();
 await expect(timeline).toHaveCount(0);
 await page.getByRole('button',{name:/Satellite imagery/}).click();
 await expect(timeline).toContainText('Infrared satellite');
 await expect(slider).toBeDisabled();
 await expect(timeline.getByRole('button',{name:'Play imagery'})).toBeDisabled();
 await expect(timeline.getByText('Loading frame…')).toHaveCount(0);
 await expect(timeline.getByText('This frame could not load.')).toHaveCount(0);
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
