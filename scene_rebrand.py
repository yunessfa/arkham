from pathlib import Path
p=Path('/data/arkham/frontend/src/Scene.tsx'); s=p.read_text().replace('Canvas, useFrame, useThree','Canvas, useFrame, useThree, useLoader')
s=s.replace('function SceneObjects({ motion }: { motion: boolean }) {','function SceneObjects({ motion, logoUrl }: { motion: boolean; logoUrl: string }) {\n  const logo = useLoader(THREE.TextureLoader, logoUrl);')
a=s.index('    x.fillStyle ='); b=s.index('    return new THREE.CanvasTexture(c);',a)
s=s[:a]+'''    x.fillStyle = "#0c0c0c";
    x.fillRect(0, 0, 1024, 512);
    x.strokeStyle = "#c5a45f";
    x.lineWidth = 3;
    x.strokeRect(18, 18, 988, 476);
    const image = logo.image as HTMLImageElement;
    const h = 310, w = h * image.width / image.height;
    x.drawImage(image, (1024-w)/2, 48, w, h);
    x.textAlign = "center";
    x.fillStyle = "#d9bd7f";
    x.font = "42px Georgia";
    x.fillText("A R K H A M", 512, 418);
    x.font = "16px Arial";
    x.fillText("H O N E Y   A T E L I E R", 512, 455);
''' +s[b:]
s=s.replace('return new THREE.CanvasTexture(c);\n  }, []);','const texture = new THREE.CanvasTexture(c);\n    texture.colorSpace = THREE.SRGBColorSpace;\n    texture.anisotropy = 4;\n    return texture;\n  }, [logo]);')
a=s.index('  const jarPoints');s=s[:a]+'''  const honeycomb = useMemo(() => {
    const shape = new THREE.Shape();
    const hole = new THREE.Path();
    for (let i=0;i<6;i++) {
      const a = Math.PI/6+i*Math.PI/3;
      const x=Math.cos(a), y=Math.sin(a);
      if(i===0) {shape.moveTo(x*.46,y*.46); hole.moveTo(x*.365,y*.365);}
      else {shape.lineTo(x*.46,y*.46); hole.lineTo(x*.365,y*.365);}
    }
    shape.closePath(); hole.closePath(); shape.holes.push(hole);
    return shape;
  }, []);
''' +s[a:]
s=s.replace('intensity={0.8}','intensity={1.1}').replace('["#ffe4a6", "#160c03", 1]','["#fff6e3", "#111113", 1.3]').replace('color="#fff0c1"','color="#fff6e6"').replace('intensity={22} color="#df8c22"','intensity={32} color="#d0b374"')
a=s.index('      <group position={[-1.45');b=s.index('      <group ref={jar}',a)
s=s[:a]+'''      <group position={[-1.3, -0.2, -0.85]} rotation={[0, -0.18, -0.04]}>
        {[[0,0],[0,.80],[0,-.80],[-.70,.40],[-.70,-.40],[.70,.40],[.70,-.40]].map(([x,y],i) => (
          <group key={i} position={[x,y,0]}>
            <mesh castShadow>
              <extrudeGeometry args={[honeycomb, { depth:.28, bevelEnabled:true, bevelSize:.012, bevelThickness:.012, bevelSegments:1, steps:1 }]} />
              <meshStandardMaterial color="#c5a45f" roughness={.28} metalness={.72} />
            </mesh>
            <mesh position={[0,0,.025]} rotation={[Math.PI/2,0,0]}>
              <cylinderGeometry args={[.36,.36,.10,6]} />
              <meshStandardMaterial color={i%2 ? "#27231b" : "#141414"} metalness={.35} roughness={.55} />
            </mesh>
          </group>
        ))}
      </group>
''' +s[b:]
s=s.replace('color="#e5a22f"','color="#c58a27"').replace('metalness={0.12}','metalness={0.2}').replace('transmission={0.12}','transmission={0.16}').replace('              0.87,','              1.13,').replace('color="#d2ae5e"','color="#c5a45f"').replace('color="#f3d995"','color="#d9bd7f"').replace('color="#edb940"','color="#c5a45f"').replace('color="#18130b"','color="#0c0c0e"').replace('color="#292013"','color="#191919"').replace('color="#d9b568"','color="#c5a45f"')
a=s.index('      <mesh\n        position={[0, -1.3');b=s.index('\n    </>',a)
s=s[:a]+'''      <group position={[0,-1.38,0]} rotation={[0,Math.PI/6,0]}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[2.3,2.3,.16,6]} />
          <meshStandardMaterial color="#101012" roughness={.42} metalness={.55}/>
        </mesh>
        <mesh position={[0,-.077,0]}>
          <cylinderGeometry args={[2.31,2.31,.018,6]} />
          <meshStandardMaterial color="#aa8a49" metalness={.8} roughness={.3}/>
        </mesh>
      </group>''' +s[b:]
s=s.replace('export default function Scene({ onFailure }: { onFailure: () => void }) {','export default function Scene({ onFailure, logoUrl }: { onFailure: () => void; logoUrl: string }) {').replace('شیشه عسل و زنبور آرکهام','شیشه با نشان رسمی آرکهام و سازه شش‌ضلعی کندو').replace('<SceneObjects motion={motion} />','<SceneObjects motion={motion} logoUrl={logoUrl} />')
p.write_text(s)
p=Path('/data/arkham/frontend/src/style.css');s=p.read_text()
colors={'#d9b568':'var(--brand-gold)','#e7c780':'var(--brand-light)','#f7f0e2':'var(--brand-ivory)','#fffcf6':'var(--brand-paper)','#090909':'var(--brand-black)','#171711':'var(--brand-charcoal)','#10110e':'var(--brand-charcoal)','#efce89':'#dfc487'}
for a,b in colors.items():s=s.replace(a,b)
s='''/* Palette sampled from the supplied official logo; semantic colors stay separate. */
:root {
  --brand-gold: #c5a45f;
  --brand-light: #ddc58c;
  --brand-black: #090909;
  --brand-charcoal: #111113;
  --brand-ivory: #f5f0e6;
  --brand-paper: #fcfaf5;
}
'''+s
s+='''
/* Official crest lockup: preserve source proportions at every viewport. */
.wordmark .brand-identity {
  display: flex; flex-direction: row; align-items: center; gap: 15px;
  margin: 0; direction: ltr; color: var(--brand-light);
}
.wordmark .brand-crest, .brand-crest { width: 43px; height: 66px; object-fit: contain; flex-shrink: 0; }
.wordmark .brand-type, .brand-type {
  display: block; margin: 0; font: 26px/1.3 Georgia,serif;
  letter-spacing: .14em; color: var(--brand-light); text-align: center;
}
.wordmark .brand-tagline, .brand-tagline {
  display: block; margin: 7px 0 0; font: 7px/1.4 Arial,sans-serif;
  letter-spacing: .33em; color: var(--brand-light);
}
.wordmark .brand-identity-stacked, .brand-identity-stacked {
  display: inline-flex; flex-direction: column; gap: 18px;
}
footer .wordmark .brand-crest { width: 57px; height: 87px; }
footer .wordmark .brand-type { font-size: 28px; }
.auth-brand { background: var(--brand-black); text-align: center; padding: 32px; margin-bottom: 24px; border-top: 2px solid var(--brand-gold); }
.auth-brand .brand-crest { width: 56px; height: 86px; }
.story-monogram img { width: 42%; height: 74%; object-fit: contain; }
.hive-section { background: var(--brand-charcoal); }
.hero-halo { opacity: .55; }
button, .button, input, select, textarea { border-radius: 2px; }
@media(max-width:760px) {
  .wordmark .brand-identity { gap: 7px; }
  .topnav .wordmark .brand-crest { width: 25px; height: 39px; }
  .topnav .wordmark .brand-type { font-size: 17px; letter-spacing: .09em; }
  .topnav .wordmark .brand-tagline { font-size: 5px; letter-spacing: .19em; margin-top: 4px; }
  footer .wordmark .brand-identity { gap: 18px; }
}
'''
p.write_text(s)
