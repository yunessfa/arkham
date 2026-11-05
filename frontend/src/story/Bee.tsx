import {useId} from 'react';
/**
 * Top-down honeybee, head up. Drawn from bee anatomy rather than an icon:
 * elbowed antennae, large compound eyes, hairy thorax, fore + hind wing pairs
 * with venation, six jointed legs (pollen baskets on the hind pair) and a
 * banded abdomen that tapers to the sting. Wings pivot at the thorax so the
 * CSS flap reads as a real wing stroke, not a wobble.
 */
export function BeeMark(){
 const id='bee-'+useId().replace(/:/g,'');
 const hair=Array.from({length:22},(_,i)=>{const a=i/22*Math.PI*2,r1=12.2,r2=14.6+(i%3)*.7;return `M${(60+Math.cos(a)*r1).toFixed(1)} ${(47+Math.sin(a)*r1).toFixed(1)}L${(60+Math.cos(a)*r2).toFixed(1)} ${(47+Math.sin(a)*r2).toFixed(1)}`}).join('');
 return <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" className="bee-mark">
  <defs>
   <radialGradient id={id+'-thorax'} cx="56" cy="42" r="16" gradientUnits="userSpaceOnUse"><stop stopColor="#e6b85c"/><stop offset=".55" stopColor="#b8822f"/><stop offset="1" stopColor="#6e4a1f"/></radialGradient>
   <linearGradient id={id+'-abdomen'} x1="46" y1="60" x2="74" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="#a8701f"/><stop offset=".45" stopColor="#f0be55"/><stop offset="1" stopColor="#9b671d"/></linearGradient>
   <linearGradient id={id+'-wing'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffffff" stopOpacity=".92"/><stop offset="1" stopColor="#f1e3bd" stopOpacity=".55"/></linearGradient>
   <clipPath id={id+'-body'}><path d="M60 58c9 0 14.5 7.5 14.5 17.5 0 10-6.2 19.5-14.5 26.5-8.3-7-14.5-16.5-14.5-26.5C45.5 65.5 51 58 60 58Z"/></clipPath>
  </defs>
  {/* legs: front, middle, hind (with corbicula pollen loads) */}
  <g stroke="#3b2b19" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="bee-legs">
   <path d="M51 41 43 35 39 27M69 41 77 35 81 27"/>
   <path d="M49 49 38 51 31 59M71 49 82 51 89 59"/>
   <path d="M51 55 42 64 39 79M69 55 78 64 81 79"/>
  </g>
  <ellipse cx="40.8" cy="70" rx="3.1" ry="4.2" fill="#e8962c" stroke="#9c5e16" strokeWidth=".6" className="bee-pollen"/>
  <ellipse cx="79.2" cy="70" rx="3.1" ry="4.2" fill="#e8962c" stroke="#9c5e16" strokeWidth=".6" className="bee-pollen"/>
  {/* abdomen with alternating tergite bands and fine hair rows */}
  <g clipPath={`url(#${id}-body)`}>
   <rect x="40" y="56" width="40" height="50" fill={`url(#${id}-abdomen)`}/>
   <path d="M40 66.5h40v4.6H40zM40 77h40v4.8H40zM40 87.6h40v5H40zM40 98h40v6H40z" fill="#3a2a17"/>
   <path d="M46 64.6q14 3 28 0M45.6 75.2q14.4 3 28.8 0M46.6 85.8q13.4 3 26.8 0M49 96.2q11 2.6 22 0" stroke="#fff3c9" strokeWidth=".7" opacity=".55"/>
  </g>
  <path d="M60 58c9 0 14.5 7.5 14.5 17.5 0 10-6.2 19.5-14.5 26.5-8.3-7-14.5-16.5-14.5-26.5C45.5 65.5 51 58 60 58Z" stroke="#4a3418" strokeWidth="1"/>
  <path d="m58.6 101.6 1.4 5.2 1.4-5.2" fill="#2b2014" stroke="#2b2014" strokeWidth=".8" strokeLinejoin="round"/>
  {/* hindwings sit under the forewings */}
  <g className="bee-wing bee-wing-a">
   <path d="M52.5 50C43 50.5 33 53.5 27.5 58.5c-2.2 2 .2 4.6 3.5 4C39 61 47.5 57 53 53Z" fill={`url(#${id}-wing)`} stroke="#8f7c54" strokeWidth=".6"/>
   <path d="M51.5 42.5C42 36 29 28.5 19 27.5c-6-.6-7.8 3.8-3.6 7.6C23 42 38 47.5 52 48.5Z" fill={`url(#${id}-wing)`} stroke="#8f7c54" strokeWidth=".65"/>
   <path d="M51 45C40 40 28 34 18 31.5M44 43.5 38 34.5M36 40.8l-3.5-8.6M28 37.5l-1.8-6.4M50.5 51.5 31 59.5M44 53 41 59" stroke="#8f7c54" strokeWidth=".45" opacity=".9"/>
  </g>
  <g className="bee-wing bee-wing-b">
   <path d="M67.5 50c9.5.5 19.5 3.5 25 8.5 2.2 2-.2 4.6-3.5 4C81 61 72.5 57 67 53Z" fill={`url(#${id}-wing)`} stroke="#8f7c54" strokeWidth=".6"/>
   <path d="M68.5 42.5C78 36 91 28.5 101 27.5c6-.6 7.8 3.8 3.6 7.6C97 42 82 47.5 68 48.5Z" fill={`url(#${id}-wing)`} stroke="#8f7c54" strokeWidth=".65"/>
   <path d="M69 45c11-5 23-11 33-13.5M76 43.5l6-9M84 40.8l3.5-8.6M92 37.5l1.8-6.4M69.5 51.5 89 59.5M76 53l3 6" stroke="#8f7c54" strokeWidth=".45" opacity=".9"/>
  </g>
  {/* hairy thorax */}
  <path d={hair} stroke="#c99a4a" strokeWidth=".9" strokeLinecap="round" opacity=".85"/>
  <circle cx="60" cy="47" r="12.5" fill={`url(#${id}-thorax)`} stroke="#5a3d18" strokeWidth=".9"/>
  <path d="M54 43.5q6-3.5 12 0M53 49q7 3.2 14 0" stroke="#7a5323" strokeWidth=".8" opacity=".7"/>
  {/* head: compound eyes, ocelli, elbowed antennae */}
  <path d="M57.4 25.5 55 18.5l-6.5-6M62.6 25.5 65 18.5l6.5-6" stroke="#2f2416" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx="48.3" cy="12.3" r="1.2" fill="#2f2416"/><circle cx="71.7" cy="12.3" r="1.2" fill="#2f2416"/>
  <ellipse cx="60" cy="31" rx="9.4" ry="8" fill="#4a3620" stroke="#2c2014" strokeWidth=".9"/>
  <ellipse cx="52.6" cy="30.2" rx="3.6" ry="5.6" fill="#1f1912" transform="rotate(-12 52.6 30.2)"/>
  <ellipse cx="67.4" cy="30.2" rx="3.6" ry="5.6" fill="#1f1912" transform="rotate(12 67.4 30.2)"/>
  <ellipse cx="51.7" cy="28.4" rx="1" ry="1.6" fill="#fff6dc" opacity=".8"/><ellipse cx="66.5" cy="28.4" rx="1" ry="1.6" fill="#fff6dc" opacity=".8"/>
  <circle cx="58.3" cy="26.6" r=".75" fill="#e9c77d"/><circle cx="61.7" cy="26.6" r=".75" fill="#e9c77d"/><circle cx="60" cy="25.4" r=".75" fill="#e9c77d"/>
 </svg>
}
