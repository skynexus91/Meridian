import {test,expect} from '@playwright/test';
const places=[{id:'bucharest',name:'Bucharest',country:'RO',region:'București',lat:44.4268,lon:26.1025,aliases:['București']},{id:'ploiesti',name:'Ploiești',country:'RO',region:'Prahova',lat:44.94,lon:26.01,aliases:['Ploiesti']}];

test('route planner calculates and shows GPS guidance only after planning',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 await page.route('**/api/places',route=>route.fulfill({json:{places}}));
 let addressRequests=0;
 await page.route('**/api/addresses?*',route=>{addressRequests++;return route.fulfill({json:{places:[]}});});
 await page.route('**/api/suggestions?*',route=>route.fulfill({json:{places:[]}}));
 await page.route('**/api/route?*',route=>route.fulfill({json:{distance:15200,duration:1450,geometry:{type:'LineString',coordinates:[[26.1025,44.4268],[26.01,44.94]]},provider:'OSRM · OpenStreetMap',calculatedAt:new Date().toISOString(),steps:[]}}));
 await page.goto('/');await page.getByRole('button',{name:'Search a place or route',exact:true}).click();
 await page.getByRole('textbox',{name:'Starting location',exact:true}).fill('Bucharest');
 await page.getByRole('textbox',{name:'Destination',exact:true}).fill('Ploiești');
 await page.getByRole('button',{name:'Find route',exact:true}).click();
 await expect(page.locator('.navigation-summary')).toContainText('15.2 km',{timeout:15000});
 expect(addressRequests).toBe(0);
 await expect(page.locator('.guidance-active')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Start GPS',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Find route',exact:true})).toHaveCount(0);
 await page.screenshot({path:`test-results/${info.project.name}-routing.png`});
 await page.getByRole('button',{name:'Edit route',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Destination',exact:true})).toHaveValue('Ploiești');
});

test('automatic traffic stays in the current app view',async({page})=>{
 await page.goto('/');await expect(page.locator('.region-stat')).toContainText(/Traffic enabled automatically|Trafic activ automat/);
 await expect(page.locator('.live-traffic-panel iframe')).toHaveCount(0);expect(new URL(page.url()).hostname).toBe('127.0.0.1');
});

test('nearby summary opens forecast and map layers stay independently controllable',async({page,context},info)=>{
 const place=places[0];
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:place.lat,longitude:place.lon});
 await page.route('**/api/location?*',route=>route.fulfill({json:{place}}));
 await page.route('**/api/weather/current?*',route=>route.fulfill({json:{data:{current:{temperature_2m:12}},stale:false}}));
 await page.route('**/api/weather?*',route=>route.fulfill({json:{data:{current:{temperature_2m:12}},stale:false}}));
 await page.route('**/api/observations?*',route=>route.fulfill({json:{data:[{id:'test-road',kind:'road',title:'Road works',lat:place.lat,lon:place.lon,observedAt:new Date().toISOString()}],stale:false}}));
 await page.route('**/api/world/news?*',route=>route.fulfill({json:{data:{stories:[{id:'test-story',title:'New library opens in Bucharest',source:'Local news',at:new Date().toISOString()}]}}}));
 await page.goto('/');
 const nearby=page.getByRole('complementary',{name:'Local news',exact:true});
 const locate=nearby.getByRole('button',{name:'Use my location for local news'});
 await expect(nearby.getByRole('button',{name:'Open forecast'}).or(locate)).toBeVisible();
 if(await locate.isVisible())await locate.click();
 await expect(nearby.getByRole('button',{name:'Open forecast'})).toHaveText('12°C');
 await expect(nearby.getByRole('button',{name:'Open traffic'})).toHaveText('1 road bulletin');
 await expect(nearby.getByText('New library opens in Bucharest')).toBeVisible();
 await page.screenshot({path:`test-results/${info.project.name}-nearby.png`});
 const openForecast=nearby.getByRole('button',{name:'Open forecast'});
 await openForecast.press('Enter');
 const weather=page.getByRole('complementary',{name:'Weather',exact:true});
 await expect(weather.getByRole('heading',{name:'Weather',exact:true})).toBeFocused();
 await expect(weather.getByText('12°',{exact:true})).toBeVisible();
 await expect(nearby).toHaveCount(0);
 const bounds=await weather.boundingBox();
 expect(bounds).not.toBeNull();
 if(info.project.name==='mobile'){
  expect(bounds!.x).toBeCloseTo(0,0);
  expect(bounds!.width).toBeCloseTo(page.viewportSize()!.width,0);
 }else expect(bounds!.x).toBeGreaterThan(page.viewportSize()!.width/2);
 await page.screenshot({path:`test-results/${info.project.name}-forecast.png`});
 await page.keyboard.press('Escape');
 await expect(weather).toHaveCount(0);
 await expect(openForecast).toBeFocused();
 await page.getByRole('button',{name:'Map layers',exact:true}).click();
 const layers=page.getByRole('complementary',{name:'Map layers',exact:true});
 const traffic=layers.getByRole('button',{name:/Traffic/});
 await expect(traffic).toHaveAttribute('aria-pressed','true');
 await traffic.click();
 await expect(traffic).toHaveAttribute('aria-pressed','false');
 await expect(layers.getByRole('button',{name:/News/})).toHaveAttribute('aria-pressed','false');
});

test('browsing asks for location only after the user chooses it',async({page})=>{
 const place=places[0];
 await page.addInitScript(({lat,lon})=>{
  localStorage.setItem('meridian:language','"en"');
  const permission=Object.assign(new EventTarget(),{state:'prompt'});
  const calls={requested:0,watched:0,cleared:0,highAccuracy:undefined as boolean|undefined};
  Object.defineProperty(window,'qaLocation',{value:{calls,revoke(){permission.state='denied';permission.dispatchEvent(new Event('change'));}}});
  Object.defineProperty(navigator,'permissions',{value:{query:async()=>permission}});
  Object.defineProperty(navigator,'geolocation',{value:{
   getCurrentPosition(success:PositionCallback){
    calls.requested++;
    permission.state='granted';
    permission.dispatchEvent(new Event('change'));
    success({coords:{latitude:lat,longitude:lon,accuracy:10,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()} as GeolocationPosition);
   },
   watchPosition(_success:PositionCallback,_error:PositionErrorCallback,options:PositionOptions){
    calls.watched++;
    calls.highAccuracy=options.enableHighAccuracy;
    return calls.watched;
   },
   clearWatch(){calls.cleared++;},
  }});
 },place);
 await page.route('**/api/location?*',route=>route.fulfill({json:{place}}));
 await page.route('**/api/weather?*',route=>route.fulfill({json:{data:{current:{temperature_2m:12}},stale:false}}));
 await page.route('**/api/observations?*',route=>route.fulfill({json:{data:[],stale:false}}));
 await page.goto('/');
 await page.getByRole('navigation',{name:'Explore',exact:true}).getByRole('button',{name:'Weather',exact:true}).click();
 const weather=page.getByRole('complementary',{name:'Weather',exact:true});
 await expect(weather).toContainText('Choose a city or use GPS for the forecast.');
 const calls=()=>page.evaluate(()=>Reflect.get(window,'qaLocation').calls);
 expect(await calls()).toMatchObject({requested:0,watched:0});
 await weather.getByRole('button',{name:'My location',exact:true}).click();
 await expect(weather.getByText('12°',{exact:true})).toBeVisible();
 expect(await calls()).toMatchObject({requested:1,watched:1,highAccuracy:false});
 await page.evaluate(()=>Reflect.get(window,'qaLocation').revoke());
 await expect(weather).toContainText('Choose a city or use GPS for the forecast.');
 expect(await calls()).toMatchObject({requested:1,watched:1,cleared:1});
});
