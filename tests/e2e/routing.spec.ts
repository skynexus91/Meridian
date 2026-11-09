import {test,expect} from '@playwright/test';
const places=[{id:'bucharest',name:'Bucharest',country:'RO',region:'București',lat:44.4268,lon:26.1025,aliases:['București']},{id:'ploiesti',name:'Ploiești',country:'RO',region:'Prahova',lat:44.94,lon:26.01,aliases:['Ploiesti']}];

test('route planner calculates and shows GPS guidance only after planning',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('meridian:language','"en"'));
 await page.route('**/api/places',route=>route.fulfill({json:{places}}));
 await page.route('**/api/suggestions?*',route=>route.fulfill({json:{places:[]}}));
 await page.route('**/api/route?*',route=>route.fulfill({json:{distance:15200,duration:1450,geometry:{type:'LineString',coordinates:[[26.1025,44.4268],[26.01,44.94]]},provider:'OSRM · OpenStreetMap',calculatedAt:new Date().toISOString(),steps:[]}}));
 await page.goto('/');await page.getByRole('button',{name:'Search a place or route',exact:true}).click();
 await page.getByRole('textbox',{name:'Starting location',exact:true}).fill('Bucharest');await page.locator('.route-suggestions button').filter({hasText:'Bucharest'}).first().click();
 await page.getByRole('textbox',{name:'Destination',exact:true}).fill('Ploi');await page.locator('.route-suggestions button').filter({hasText:'Ploiești'}).first().click();
 await expect(page.locator('.navigation-summary')).toContainText('15.2 km');
 await expect(page.locator('.guidance-active')).toHaveCount(0);await expect(page.locator('.navigation-instruction')).toHaveCount(0);await page.screenshot({path:`test-results/${info.project.name}-routing.png`});
});

test('automatic traffic stays in the current app view',async({page})=>{
 await page.goto('/');await expect(page.locator('.region-stat')).toContainText(/Traffic enabled automatically|Trafic activ automat/);
 await expect(page.locator('.live-traffic-panel iframe')).toHaveCount(0);expect(new URL(page.url()).hostname).toBe('127.0.0.1');
});
