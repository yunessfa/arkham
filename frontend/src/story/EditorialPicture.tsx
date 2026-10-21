import bee from '../design/assets/bee.webp';import beeSmall from '../design/assets/bee-small.webp';
import comb from '../design/assets/comb.webp';import combSmall from '../design/assets/comb-small.webp';
import meadow from '../design/assets/meadow.webp';import meadowSmall from '../design/assets/meadow-small.webp';
const sources={bee:{large:bee,small:beeSmall},comb:{large:comb,small:combSmall},meadow:{large:meadow,small:meadowSmall}};
export function EditorialPicture({kind,alt,className='',eager=false,sizes='(max-width: 899px) 100vw, 50vw'}:{kind:keyof typeof sources;alt:string;className?:string;eager?:boolean;sizes?:string}){
 const s=sources[kind];return <picture className={'editorial-picture '+className}><source srcSet={`${s.small} 760w, ${s.large} 1264w`} sizes={sizes} type="image/webp"/><img src={s.large} alt={alt} width={1264} height={848} loading={eager?'eager':'lazy'} decoding="async" fetchPriority={eager?'high':'auto'}/></picture>;
}
