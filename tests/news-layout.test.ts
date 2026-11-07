import {describe,it,expect} from 'vitest';
import {placeFloatingPanel} from '../src/floatingToolbar';
import {publicAddress} from '../server/world-reader';
describe('floating panel placement',()=>{
 it('fits menu content below a toolbar in the reported viewport',()=>{const result=placeFloatingPanel({left:20,top:12,height:64},{width:270,height:440},{width:714,height:668});expect(result.top).toBe(88);expect(result.top+result.maxHeight).toBeLessThanOrEqual(656);expect(result.left+result.width).toBeLessThanOrEqual(702);});
 it('opens above a toolbar moved near the bottom',()=>{const result=placeFloatingPanel({left:600,top:580,height:64},{width:370,height:560},{width:714,height:668});expect(result.top).toBeGreaterThanOrEqual(12);expect(result.top+result.maxHeight).toBeLessThanOrEqual(568);expect(result.left+result.width).toBeLessThanOrEqual(702);});
 it('shrinks the panel for narrow screens',()=>{const result=placeFloatingPanel({left:12,top:12,height:60},{width:370,height:560},{width:320,height:568});expect(result.width).toBe(296);expect(result.top+result.maxHeight).toBeLessThanOrEqual(556);});
});
describe('public publisher addresses',()=>{
 it('rejects private networks and metadata addresses',()=>{for(const address of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','::1','fc00::1','::ffff:127.0.0.1'])expect(publicAddress(address)).toBe(false);});
 it('allows public publisher IP addresses',()=>{expect(publicAddress('8.8.8.8')).toBe(true);expect(publicAddress('2606:4700:4700::1111')).toBe(true);});
});
