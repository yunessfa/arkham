/** Deterministic scroll follower: bounded speed/acceleration, never teleport. */
export type Point = { x:number; y:number };
export type FlightState = Point & { vx:number; vy:number };
const limit=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function flightLane(scrollY:number,width:number,height:number,velocity:number):Point {
 const compact=width<900;
 return {x:width-(compact?44:Math.max(48,Math.min(76,width*.045)))+Math.sin(scrollY/1100)*(compact?5:10),y:limit(height*.43+Math.sin(scrollY/1500)*height*.035+limit(velocity*.045,-height*.12,height*.12),100,height-65)};
}
export function advanceFlight(state:FlightState,target:Point,elapsed:number):FlightState {
 const dt=limit(elapsed,0,1/30),maxSpeed=410,maxAcceleration=1500;
 const dx=target.x-state.x,dy=target.y-state.y,d=Math.hypot(dx,dy);
 const speed=Math.min(maxSpeed,d*6),wx=d?dx/d*speed:0,wy=d?dy/d*speed:0;
 let ax=(wx-state.vx)*10,ay=(wy-state.vy)*10;
 const acceleration=Math.hypot(ax,ay);if(acceleration>maxAcceleration){ax*=maxAcceleration/acceleration;ay*=maxAcceleration/acceleration;}
 let vx=state.vx+ax*dt,vy=state.vy+ay*dt;
 const v=Math.hypot(vx,vy);if(v>maxSpeed){vx*=maxSpeed/v;vy*=maxSpeed/v;}
 return {x:state.x+vx*dt,y:state.y+vy*dt,vx,vy};
}
export function landingCurve(origin:Point,destination:Point,progress:number):Point {
 const t=limit(progress,0,1),u=1-t;
 const side=destination.x>=origin.x?1:-1;
 const c1={x:origin.x+side*Math.min(55,Math.abs(destination.x-origin.x)*.3),y:origin.y-24};
 const c2={x:destination.x+side*30,y:destination.y-34};
 return {x:u*u*u*origin.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*destination.x,y:u*u*u*origin.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*destination.y};
}
