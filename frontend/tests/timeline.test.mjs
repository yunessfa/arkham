import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clamp,smooth,chapterOpacity,mixHex,chapters,palettes,luminance,foreground} from '../src/experience/timeline.ts';
test('Seven chapters retain readable endpoints',()=>{assert.equal(chapters.length,7);assert.equal(palettes.length,7);for(let i=0;i<7;i++){assert.equal(chapterOpacity(i,i),1);for(let j=0;j<7;j++)if(i!==j)assert.equal(chapterOpacity(i,j),0)}});
test('Crossfades never leave all content invisible',()=>{for(let p=0;p<=6;p+=.01){const opacity=chapters.map((_,i)=>chapterOpacity(p,i));assert.ok(Math.max(...opacity)>.2);assert.ok(opacity.every(x=>x>=0&&x<=1))}});
test('Scroll interpolation is bounded and continuous',()=>{assert.equal(clamp(-5),0);assert.equal(clamp(12),1);assert.equal(smooth(0),0);assert.equal(smooth(1),1);for(let i=0;i<100;i++)assert.ok(smooth((i+1)/100)>=smooth(i/100));assert.equal(mixHex('#000000','#ffffff',.5),'#808080');for(let i=0;i<6;i++){assert.equal(mixHex(palettes[i],palettes[i+1],0),palettes[i]);assert.equal(mixHex(palettes[i],palettes[i+1],1),palettes[i+1])}});

test('Foreground maintains readable contrast throughout palette transitions',()=>{for(let i=0;i<6;i++)for(let k=0;k<=100;k++){const bg=mixHex(palettes[i],palettes[i+1],k/100),a=luminance(bg),b=luminance(foreground(bg));assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5)}});
