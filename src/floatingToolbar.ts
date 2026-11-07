import {useEffect,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent,type KeyboardEvent} from 'react';
export function clampToolbar(point:{left:number;top:number},size:{width:number;height:number},viewport:{width:number;height:number}){return {left:Math.max(8,Math.min(point.left,Math.max(8,viewport.width-size.width-8))),top:Math.max(8,Math.min(point.top,Math.max(8,viewport.height-size.height-8)))};}
const key='meridian:toolbar-position:v1';
export function placeFloatingPanel(anchor:{left:number;top:number;height:number},size:{height:number;width:number},viewport:{width:number;height:number}){
 const margin=12,gap=12;const width=Math.min(size.width,Math.max(0,viewport.width-margin*2));const belowStart=anchor.top+anchor.height+gap;const below=Math.max(0,viewport.height-margin-belowStart);const above=Math.max(0,anchor.top-gap-margin);const useBelow=below>=Math.min(size.height,300)||below>=above;
 const height=Math.min(size.height,useBelow?below:above,viewport.height-margin*2);
 return {position:'fixed' as const,left:Math.max(margin,Math.min(anchor.left,viewport.width-width-margin)),top:useBelow?belowStart:Math.max(margin,anchor.top-gap-height),width,maxHeight:Math.max(0,height)};
}
export function useFloatingToolbar(){
 const ref=useRef<HTMLElement>(null);const [saved,setSaved]=useState<{x:number;y:number}|null>(()=>{try{const value=JSON.parse(localStorage.getItem(key)??'null');return value&&Number.isFinite(value.x)&&Number.isFinite(value.y)?{x:Math.max(0,Math.min(1,value.x)),y:Math.max(0,Math.min(1,value.y))}:null;}catch{return null;}});
 const [bounds,setBounds]=useState({left:12,top:12,width:350,height:64});const drag=useRef<{x:number;y:number;left:number;top:number}|undefined>(undefined);
 const measure=()=>{if(!ref.current)return;const rect=ref.current.getBoundingClientRect();const point=saved?{left:8+saved.x*Math.max(0,innerWidth-rect.width-16),top:8+saved.y*Math.max(0,innerHeight-rect.height-16)}:{left:innerWidth>800?20:12,top:innerWidth>800?20:12};setBounds({...clampToolbar(point,rect,{width:innerWidth,height:innerHeight}),width:rect.width,height:rect.height});};
 useEffect(()=>{measure();const observer=new ResizeObserver(measure);if(ref.current)observer.observe(ref.current);window.addEventListener('resize',measure);return()=>{observer.disconnect();window.removeEventListener('resize',measure);};},[saved]);
 function persist(left:number,top:number){const point={x:(left-8)/Math.max(1,innerWidth-bounds.width-16),y:(top-8)/Math.max(1,innerHeight-bounds.height-16)};setSaved(point);try{localStorage.setItem(key,JSON.stringify(point));}catch{}}
 function onPointerDown(e:ReactPointerEvent<HTMLButtonElement>){if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,left:bounds.left,top:bounds.top};}
 function onPointerMove(e:ReactPointerEvent<HTMLButtonElement>){if(!drag.current)return;const next=clampToolbar({left:drag.current.left+e.clientX-drag.current.x,top:drag.current.top+e.clientY-drag.current.y},bounds,{width:innerWidth,height:innerHeight});setBounds(previous=>({...previous,...next}));}
 function onPointerUp(e:ReactPointerEvent<HTMLButtonElement>){if(!drag.current)return;drag.current=undefined;persist(bounds.left,bounds.top);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
 function reset(){setSaved(null);try{localStorage.removeItem(key);}catch{}}
 function onKeyDown(e:KeyboardEvent<HTMLButtonElement>){const delta=e.shiftKey?40:10;const directions:Record<string,[number,number]>={ArrowLeft:[-delta,0],ArrowRight:[delta,0],ArrowUp:[0,-delta],ArrowDown:[0,delta]};if(!directions[e.key])return;e.preventDefault();const [x,y]=directions[e.key];const next=clampToolbar({left:bounds.left+x,top:bounds.top+y},bounds,{width:innerWidth,height:innerHeight});setBounds(previous=>({...previous,...next}));persist(next.left,next.top);}
 const viewportHeight=typeof innerHeight==='number'?innerHeight:800,viewportWidth=typeof innerWidth==='number'?innerWidth:1200;
 function panelStyle(height:number,width:number):CSSProperties{return placeFloatingPanel(bounds,{height,width},{width:viewportWidth,height:viewportHeight});}

 return {ref,style:{left:bounds.left,top:bounds.top,right:'auto'} as CSSProperties,nearBottom:bounds.top>viewportHeight/2,onPointerDown,onPointerMove,onPointerUp,onKeyDown,reset,panelStyle};
}
