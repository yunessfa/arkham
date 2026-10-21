import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {BeeMark} from './Bee';
import {advanceFlight,flightLane,landingCurve,type FlightState,type Point} from './beeMotion';
import {beeTarget} from '../design/registry';
/** Mounted once and portalled outside route/reveal transforms. No target = keep flying. */
export default function BeeCompanion({enabled=true}:{enabled?:boolean}){
 const ref=useRef<HTMLDivElement>(null),memory=useRef<FlightState|null>(null);
 useEffect(()=>{
  const bee=ref.current;if(!bee)return;
  const preference=matchMedia('(prefers-reduced-motion:reduce)');
  let frame=0,stopped=false,lastTime=0,lastScrollTime=-1000,lastY=scrollY,velocity=0,lastInput=performance.now(),angle=0,landStart=0,origin:Point|null=null,destination:Point|null=null,landingHeading:HTMLElement|null=null;
  let state=memory.current,wasVisible=false;
  function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(tick)}
  function pickHeading(){
   const visible=[...document.querySelectorAll<HTMLElement>('.story-home .bee-anchor')].filter(h=>!h.closest('[inert]')).map(h=>{const range=document.createRange();range.selectNodeContents(h);const rects=[...range.getClientRects()];const rect=rects.find(r=>r.width>2&&r.height>2)||h.getBoundingClientRect();return {h,rect}}).filter(({rect:r})=>r.top>95&&r.bottom<innerHeight*.88&&r.left>18&&r.right<innerWidth-18);
   visible.sort((a,b)=>Math.abs(a.rect.top-innerHeight*.37)-Math.abs(b.rect.top-innerHeight*.37));
   if(!visible.length)return null;
   const item=visible[0];landingHeading=item.h;
   const target=beeTarget(item.rect,innerWidth,innerHeight);
   return {x:Math.min(innerWidth-(innerWidth<900?44:36),target.x),y:target.y};
  }
  function scroll(){const now=performance.now(),dt=Math.max(16,now-lastInput);velocity=Math.max(-2400,Math.min(2400,(scrollY-lastY)/dt*1000));lastInput=now;lastY=scrollY;lastScrollTime=now;landStart=0;origin=null;destination=null;landingHeading=null;schedule()}
  function resize(){landStart=0;destination=null;origin=null;landingHeading=null;lastTime=0;schedule()}
  function tick(now:number){frame=0;if(stopped)return;
   const visible=enabled&&!preference.matches&&!document.hidden;
   if(!visible){bee.hidden=true;wasVisible=false;return;}
   const dt=lastTime?Math.min(1/30,(now-lastTime)/1000):1/60;lastTime=now;
   const moving=now-lastScrollTime<240;
   const lane=flightLane(scrollY,innerWidth,innerHeight,moving?velocity:0);
   if(!state){const initial=pickHeading()||lane;state={...initial,vx:0,vy:0};memory.current=state;}
   let target=lane,mode='flying';
   if(!moving){
    if(!landStart){landStart=now;origin={x:state.x,y:state.y};destination=pickHeading();}
    if(destination&&origin){const progress=Math.min(1,(now-landStart)/1050);target=landingCurve(origin,destination,progress);mode=progress<1?'landing':'settling';}
    else{target=lane;mode='hovering';}
   }
   state=advanceFlight(state,target,dt);
   const margin=innerWidth<900?25:34;
   state.x=Math.max(margin,Math.min(innerWidth-margin,state.x));state.y=Math.max(82,Math.min(innerHeight-35,state.y));memory.current=state;
   const settled=!moving&&Math.hypot(state.x-target.x,state.y-target.y)<.6&&Math.hypot(state.vx,state.vy)<2&&(!destination||now-landStart>1050);
   if(settled){state={...target,vx:0,vy:0};memory.current=state;mode=destination?'perched':'hovering';}
   const desiredAngle=moving?Math.max(-20,Math.min(20,state.vx*.035+velocity*.008)):0;angle+=(desiredAngle-angle)*(1-Math.exp(-dt*9));
   bee.style.transform=`translate3d(${state.x}px,${state.y}px,0)`;bee.style.setProperty('--bee-angle',angle+'deg');bee.dataset.mode=mode;bee.dataset.x=state.x.toFixed(1);bee.dataset.y=state.y.toFixed(1);bee.dataset.anchor=destination&&landingHeading?'heading':'lane';
   // Position is written before showing; never starts from (0,0) or resets on product fetch.
   bee.hidden=false;if(!wasVisible){bee.dataset.visible='true';wasVisible=true;}
   if(!settled||moving||Math.abs(angle)>.1)schedule();
  }
  function visibility(){lastTime=0;schedule()}
  addEventListener('scroll',scroll,{passive:true});addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);preference.addEventListener('change',resize);
  const home=document.querySelector('.story-home'),layoutObserver=new ResizeObserver(resize);if(home)layoutObserver.observe(home);
  document.fonts.ready.then(()=>{if(!stopped)resize()});schedule();
  return()=>{stopped=true;layoutObserver.disconnect();cancelAnimationFrame(frame);removeEventListener('scroll',scroll);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);preference.removeEventListener('change',resize)};
 },[enabled]);
 return createPortal(<div ref={ref} className="bee-companion-v7" aria-hidden="true" hidden><div className="bee-rot"><BeeMark/></div></div>,document.body);
}
