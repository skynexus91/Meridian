import {expect,test,type Page} from '@playwright/test';

async function openTool(page:Page,name:string){
 await page.getByRole('button',{name:'Side panel',exact:true}).click();
 await page.getByRole('button',{name,exact:true}).click();
}

test('voice invitation connects two browser peers and hangup reaches both',async({page})=>{
 test.setTimeout(90000);
 await page.context().addInitScript(()=>{
  localStorage.setItem('meridian:language','"en"');
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async(constraints:MediaStreamConstraints)=>{
   if(typeof constraints.audio!=='object'||!constraints.audio.echoCancellation||!constraints.audio.noiseSuppression||constraints.video!==false)throw Error('Unexpected microphone constraints');
   const audio=new AudioContext();
   const oscillator=audio.createOscillator();
   const destination=audio.createMediaStreamDestination();
   oscillator.connect(destination);
   oscillator.start();
   await audio.resume();
   return destination.stream;
  }});
 });
 await page.goto('/');
 await openTool(page,'Voice call');
 const host=page.getByRole('complementary',{name:'Voice call'});
 await expect(host.getByRole('button',{name:'Hang up'})).toBeDisabled();
 await host.getByRole('button',{name:'Call',exact:true}).click();
 await expect(host.getByRole('button',{name:'Call',exact:true})).toBeDisabled();
 await expect(host.getByRole('button',{name:'Hang up'})).toBeEnabled();
 const invite=host.getByRole('textbox',{name:'Invitation link'});
 await expect(invite).toBeVisible();
 const guest=await page.context().newPage();
 try{
  await guest.goto(await invite.inputValue());
  const guestPanel=guest.getByRole('complementary',{name:'Voice call'});
  await guestPanel.getByRole('button',{name:'Join call'}).click();
  await expect(host.getByRole('status')).toHaveText('Connected',{timeout:35000});
  await expect(guestPanel.getByRole('status')).toHaveText('Connected');
  await expect.poll(()=>guestPanel.locator('audio').evaluate(audio=>(audio as HTMLAudioElement).srcObject instanceof MediaStream)).toBe(true);
  await host.getByRole('button',{name:'Mute',exact:true}).click();
  await expect(host.getByRole('button',{name:'Unmute',exact:true})).toHaveAttribute('aria-pressed','true');
  await host.getByRole('button',{name:'Hang up'}).click();
  await expect(guestPanel.getByRole('status')).toHaveText('Call ended');
  await expect(host.getByRole('button',{name:'Call',exact:true})).toBeEnabled();
  await expect(host.getByRole('button',{name:'Hang up'})).toBeDisabled();
 }finally{await guest.close();}
});

test('live share publishes location and stops an open read-only viewer',async({page,context})=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:46.57,longitude:23.78});
 await page.route('**/api/location?*',route=>route.fulfill({json:{place:{id:'turda',name:'Turda',region:'Turda',country:'RO',lat:46.57,lon:23.78,aliases:[]}}}));
 await page.goto('/');
 await openTool(page,'Share live drive');
 const panel=page.getByRole('complementary',{name:'Share live drive'});
 await panel.getByRole('button',{name:'Start sharing'}).click();
 await expect(panel.getByRole('status')).toHaveText('Location shared');
 const viewer=await context.newPage();
 try{
  await viewer.goto(await panel.getByRole('textbox',{name:'Viewer link'}).inputValue());
  await expect(viewer.getByRole('status')).toContainText('Last update');
  const revoked=page.waitForResponse(response=>response.url().endsWith('/api/share/position')&&response.request().method()==='DELETE');
  await panel.getByRole('button',{name:'Stop sharing'}).click();
  expect((await revoked).status()).toBe(204);
  await expect(viewer.getByRole('status')).toHaveText('This drive link has ended or expired.',{timeout:15000});
 }finally{await viewer.close();}
});

test('telemetry stays queued offline and syncs after opt-in and reconnect',async({page,context})=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 await page.goto('/');
 await page.getByRole('button',{name:'Side panel',exact:true}).click();
 await context.setOffline(true);
 await page.getByRole('checkbox',{name:'Share usage statistics'}).check();
 const queued=()=>page.evaluate(()=>new Promise<number>((resolve,reject)=>{
  const request=indexedDB.open('meridian-offline');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result;
   const count=db.transaction('telemetry').objectStore('telemetry').count();
   count.onsuccess=()=>{db.close();resolve(count.result);};
   count.onerror=()=>{db.close();reject(count.error);};
  };
 }));
 await expect.poll(queued,{timeout:15000}).toBeGreaterThan(0);
 const upload=page.waitForResponse(response=>response.url().endsWith('/api/analytics/flush')&&response.request().method()==='POST');
 await context.setOffline(false);
 const response=await upload;
 expect(response.status()).toBe(204);
 const payload=response.request().postDataJSON().payload;
 const bytes=Buffer.from(payload,'base64');
 expect(bytes.length%7).toBe(0);
 expect(Array.from({length:bytes.length/7},(_,index)=>bytes[index*7])).toContain(1);
 await expect.poll(queued).toBe(0);
});

test('route discovery renders the 300 m corridor and warns about a mapped bump ahead',async({page,context})=>{
 const start={id:'test-start',name:'Test start',country:'RO',region:'Cluj',lat:46.57,lon:23.78,aliases:[]};
 const end={...start,id:'test-end',name:'Test end',lat:46.573,lon:23.80};
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:start.lat,longitude:start.lon,accuracy:5});
 await page.route('**/api/places',route=>route.fulfill({json:{places:[start,end]}}));
 await page.route('**/api/location?*',route=>route.fulfill({json:{place:start}}));
 await page.route('**/api/suggestions?*',route=>route.fulfill({json:{places:[]}}));
 await page.route('**/api/observations?*',route=>route.fulfill({json:{data:[],stale:false}}));
 await page.route('**/api/pois?*',route=>route.fulfill({json:{pois:[]}}));
 await page.route('**/api/speed-roads?*',route=>route.fulfill({json:{data:{roads:[]}}}));
 await page.route('**/api/route?*',route=>route.fulfill({json:{distance:1850,duration:240,provider:'Fixture',steps:[],geometry:{type:'LineString',coordinates:[[23.78,46.57],[23.78,46.573],[23.80,46.573]]}}}));
 await page.route('**/api/route-pois?*',route=>route.fulfill({json:{stale:false,data:{pois:[
  {id:'ev',name:'Route charger',type:'charging',lat:46.571,lon:23.781,city:'',region:'',rights:'Fixture'},
  {id:'mall',name:'Outside corridor mall',type:'mall',lat:46.58,lon:23.79,city:'',region:'',rights:'Fixture'},
  {id:'bump',name:'Mapped speed bump',type:'speed_bump',lat:46.571,lon:23.78,city:'',region:'',rights:'Fixture'},
 ]}}}));
 await page.goto('/');
 await page.getByRole('button',{name:'Search a place or route',exact:true}).click();
 await page.getByRole('textbox',{name:'Starting location',exact:true}).fill(start.name);
 await page.getByRole('textbox',{name:'Destination',exact:true}).fill(end.name);
 const corridor=page.waitForRequest(request=>request.url().includes('/api/route-pois?boxes='));
 await page.getByRole('button',{name:'Find route',exact:true}).click();
 await corridor;
 await expect(page.getByRole('button',{name:'Route charger',exact:true})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Outside corridor mall',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Start GPS',exact:true}).click();
 await expect(page.locator('.route-hazard')).toContainText('Mapped speed bump ahead');
 await expect.poll(()=>page.evaluate(()=>new Promise<string[]>((resolve,reject)=>{
  const request=indexedDB.open('meridian-offline');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result;
   const keys=db.transaction('routeDiscoveries').objectStore('routeDiscoveries').getAllKeys();
   keys.onsuccess=()=>{db.close();resolve(keys.result.map(String));};
   keys.onerror=()=>{db.close();reject(keys.error);};
  };
 }))).toEqual(['ev']);
});

test('worldwide POI markers and results route from the current GPS location',async({page})=>{
 const city={id:'london-fixture',name:'London',country:'GB',region:'London',lat:51.507,lon:-.127,aliases:[]};
 const landmark={id:'osm:node:990',name:'Test London landmark',type:'landmark',lat:51.512,lon:-.125,city:'London',region:'London',rights:'Fixture'};
 const repair={...landmark,id:'osm:node:991',name:'Test London auto service',type:'auto_service',lat:51.509,lon:-.119};
 await page.addInitScript(()=>{
  localStorage.setItem('meridian:language','"en"');
  localStorage.setItem('meridian:lastPlace','"london-fixture"');
  const fix=(callback:PositionCallback)=>callback({coords:{latitude:51.506,longitude:-.13,accuracy:5,heading:0,speed:0},timestamp:Date.now()} as GeolocationPosition);
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:fix,watchPosition:(callback:PositionCallback)=>{queueMicrotask(()=>fix(callback));return 1;},clearWatch:()=>{}}});
 });
 await page.route('**/api/places',route=>route.fulfill({json:{places:[city]}}));
 await page.route('**/api/pois?*',route=>route.fulfill({json:{pois:[landmark,repair]}}));
 await page.route('**/api/observations?*',route=>route.fulfill({json:{data:[],stale:false}}));
 await page.route('**/api/route-pois?*',route=>route.fulfill({json:{data:{pois:[]},stale:false}}));
 await page.route('**/api/speed-roads?*',route=>route.fulfill({json:{data:{roads:[]}}}));
 await page.route('**/api/location?*',route=>route.fulfill({json:{place:city}}));
 await page.route('**/api/route?*',route=>route.fulfill({json:{distance:900,duration:240,provider:'Fixture',steps:[
  {type:'turn',modifier:'left',name:'Test Street',instruction:'Turn left',location:[-.13,51.508],distance:500},
 ],geometry:{type:'LineString',coordinates:[[-.13,51.506],[-.13,51.508],[repair.lon,repair.lat]]}}}));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('.poi-marker').filter({visible:true}).and(page.getByRole('button',{name:landmark.name,exact:true})).click();
 await expect(page.locator('.map-inspector')).toContainText('Landmark');
 await expect(page.locator('.map-inspector').getByRole('button',{name:'Navigate to'})).toBeEnabled();
 await page.locator('.map-inspector').getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Search nearby places',exact:true}).click();
 const results=page.getByRole('complementary',{name:'Nearby places'});
 await results.getByRole('button',{name:'Auto services',exact:true}).click();
 await results.getByRole('button',{name:repair.name,exact:false}).click();
 const request=page.waitForRequest(req=>new URL(req.url()).pathname==='/api/route');
 await page.locator('.map-inspector').getByRole('button',{name:'Navigate to'}).click();
 const params=new URL((await request).url()).searchParams;
 expect([params.get('startLat'),params.get('startLon'),params.get('endLat'),params.get('endLon')]).toEqual(['51.506','-0.13',String(repair.lat),String(repair.lon)]);
 await page.getByRole('button',{name:'Start GPS',exact:true}).click();
 await expect(page.locator('.navigation-instruction')).toContainText('Turn left · Test Street');
});
