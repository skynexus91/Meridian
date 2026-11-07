import {useRef,useState,type PointerEvent} from 'react';
export function useDock(initiallyCollapsed=true){
 const [collapsed,setCollapsed]=useState(initiallyCollapsed);const origin=useRef<number|undefined>(undefined);const dragged=useRef(false);
 function onPointerDown(event:PointerEvent<HTMLButtonElement>){origin.current=event.clientY;dragged.current=false;event.currentTarget.setPointerCapture(event.pointerId);}
 function onPointerMove(event:PointerEvent<HTMLButtonElement>){if(origin.current===undefined)return;const delta=event.clientY-origin.current;if(Math.abs(delta)>12){dragged.current=true;setCollapsed(delta>0);}}
 function onPointerUp(event:PointerEvent<HTMLButtonElement>){origin.current=undefined;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}
 return {collapsed,setCollapsed,handle:{onPointerDown,onPointerMove,onPointerUp,onPointerCancel:onPointerUp,onClick:()=>{if(!dragged.current)setCollapsed(value=>!value);dragged.current=false;}}};
}
export function DockHandle({dock,ro}:{dock:ReturnType<typeof useDock>;ro:boolean}){return <button type="button" className="dock-handle" title={ro?'Trage în sus pentru deschidere, în jos pentru ascundere. Poți și să apeși.':'Drag up to open, down to hide. You can also tap.'} aria-label={dock.collapsed?(ro?'Deschide panoul de jos':'Expand bottom panel'):(ro?'Ascunde panoul de jos':'Hide bottom panel')} aria-expanded={!dock.collapsed} {...dock.handle}><span/></button>;}
