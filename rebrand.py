from pathlib import Path
from PIL import Image
import numpy as np, shutil
root=Path('/data/arkham'); assets=root/'frontend/src/assets'; public=root/'frontend/public/brand'; public.mkdir(exist_ok=True)
src=Path('/data/.agent-service/files/c163271c-c10b-4a1f-8860-81af5239961e/photo_5987660031467392255_y.jpg')
shutil.copy(src,public/'original-logo.jpg')
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(float)
mask=(a[:,:,0]>110)&(a[:,:,1]>80)&(a[:,:,0]-a[:,:,2]>35)
print('Gold median:',np.median(a[mask],axis=0))
# Alpha matte from the supplied raster, without changing the geometry of the mark.
alpha=np.clip((a[:,:,0]-35)/95,0,1)*np.clip((a[:,:,0]-a[:,:,2]-8)/24,0,1)
rgb=a.copy(); edge=(alpha>0)&(alpha<1); gold=np.median(a[mask],axis=0)
rgb[edge]=gold
out=Image.fromarray(np.dstack([rgb,alpha*255]).astype('uint8'),'RGBA'); bbox=out.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox(); out=out.crop((bbox[0]-12,bbox[1]-12,bbox[2]+12,bbox[3]+12)); out.thumbnail((760,1140)); out.save(assets/'arkham-crest.webp',quality=95,method=6); out.save(public/'arkham-crest.png',optimize=True)
print('Logo size',out.size)
p=root/'frontend/src/main.tsx'; s=p.read_text();s=s.replace('import brandFallback from "./assets/brand-fallback.webp";','import brandFallback from "./assets/brand-fallback.webp";\nimport crest from "./assets/arkham-crest.webp";')
idx=s.index('function HeroVisual()')
s=s[:idx]+'''function BrandIdentity({ compact = false }: { compact?: boolean }) {
  const { assets } = useApp();
  const logo = assets?.find((a: any) => a.key === "logo-dark");
  return <span className={`brand-identity${compact ? " brand-identity-stacked" : ""}`}>
    <img className="brand-crest" src={logo?.image || crest} alt={logo?.alt || "نشان رسمی آرکهام"} />
    <span className="brand-type" aria-hidden="true">ARKHAM<span className="brand-tagline">HONEY ATELIER</span></span>
  </span>;
}
''' +s[idx:]
start=s.index('          {assets?.find',s.index('function Header'))
end=s.index('\n        </Link>',start)
s=s[:start]+'          <BrandIdentity />'+s[end:]
start=s.index('            {assets?.find',s.index('function Footer'))
end=s.index('\n          </Link>',start)
s=s[:start]+'            <BrandIdentity compact />'+s[end:]
s=s.replace('<Scene onFailure={() => setFailed(true)} />','<Scene logoUrl={assets?.find((a: any) => a.key === "logo-dark")?.image || crest} onFailure={() => setFailed(true)} />')
s=s.replace('A<span>ARKHAM</span>','<img src={crest} alt="" />')
s=s.replace('<div className="narrow">\n        <AsyncForm\n          key={String(register)}','<div className="narrow">\n        <div className="auth-brand"><BrandIdentity compact /></div>\n        <AsyncForm\n          key={String(register)}')
p.write_text(s)
