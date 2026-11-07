import {describe,it,expect} from 'vitest';
import {clampToolbar} from '../src/floatingToolbar';
describe('movable toolbar boundaries',()=>{
 it('keeps a dragged toolbar inside the viewport',()=>{expect(clampToolbar({left:-100,top:900},{width:700,height:64},{width:1200,height:800})).toEqual({left:8,top:728});});
 it('reclamps the position for a smaller mobile viewport',()=>{expect(clampToolbar({left:600,top:600},{width:366,height:60},{width:390,height:844})).toEqual({left:16,top:600});});
 it('preserves valid positions',()=>{expect(clampToolbar({left:100,top:200},{width:700,height:64},{width:1200,height:800})).toEqual({left:100,top:200});});
});
