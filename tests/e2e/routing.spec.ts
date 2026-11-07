import {test,expect,type Page} from '@playwright/test';
async function traffic(page:Page){
 await page.goto('/');
 if(!await page.locator('.rail').isVisible())await page.locator('.panel-toggle').click();
 await page.getByRole('navigation').getByRole('button',{name:'Traffic',exact:true}).click();
}
test('two map clicks calculate a route and reset clears it',async({page},info)=>{
 await page.route('**/api/route?*',r=>r.fulfill({json:{distance:15200,duration:1450,geometry:{type:'LineString',coordinates:[[24,46],[25,46.4]]},provider:'OSRM · OpenStreetMap',calculatedAt:new Date().toISOString()}}));
 await traffic(page);
 await page.getByRole('button',{name:'Planifică ruta',exact:true}).click();
 await expect(page.locator('.route-planner')).toContainText('pentru plecare');
 const map=page.getByTestId('map-canvas');
 await map.click({position:{x:75,y:75}});
 await expect(page.locator('.route-point')).toHaveCount(1);
 await map.click({position:{x:120,y:130}});
 await expect(page.locator('.route-summary')).toContainText('15.2 km');
 await expect(page.locator('.route-point')).toHaveCount(2);
 await expect(page.locator('.route-summary')).toContainText('fără aglomerație live');
 await page.screenshot({path:'test-results/'+info.project.name+'-routing.png'});
 await page.getByRole('button',{name:'Șterge ruta',exact:true}).click();
 await expect(page.locator('.route-point')).toHaveCount(0);
 await expect(page.locator('.route-summary')).toHaveCount(0);
});
test('official Waze live traffic opens in Meridian and closes cleanly',async({page},info)=>{
 await traffic(page);
 await page.getByRole('button',{name:'Vezi aglomerația live',exact:true}).click();
 const frame=page.locator('.live-traffic-panel iframe');
 await expect(frame).toHaveAttribute('src',/^https:\/\/embed\.waze\.com\/ro\/iframe\?/);
 await expect(page.getByRole('dialog',{name:'Trafic live Waze'})).toBeVisible();
 await frame.contentFrame().locator('img[src*="tiles" i]').first().waitFor({timeout:45000});
 await page.screenshot({path:'test-results/'+info.project.name+'-live-waze.png'});
 expect(new URL(page.url()).hostname).toBe('127.0.0.1');
 await page.getByRole('button',{name:'Închide traficul live',exact:true}).click();
 await expect(frame).toHaveCount(0);
});
