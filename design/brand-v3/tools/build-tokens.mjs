import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const ramps = {
 hongsi:['FFF1EC','FFDED3','FFBBA8','FF967E','FA785B','F45B3F','D94329','AD3422','812C20','54231C'],
 forest:['EAF6F0','D2EDDF','A8D9C3','7DD4B5','399B7E','176B5B','125749','10483D','103A32','102C27'],
 signal:['FFFBEA','FFF4CA','FBE99C','F8DD73','F5D65F','F3CF58','C6A22C','917419','68531B','44371A'],
 neutral:['FAF9F6','F2F0EB','E4E0D8','CCC6BC','A49C90','7B7469','625D54','4B4741','312E2A','24221F'],
};
const levels=[50,100,200,300,400,500,600,700,800,900];
const themes={
 light:{bg:'neutral.50',paper:'white',text:'ink',muted:'neutral.600',border:'neutral.200','input-border':'neutral.500',action:'forest.500','on-action':'white',selected:'forest.50',error:'hongsi.700','disabled-bg':'neutral.200','disabled-text':'neutral.600',assistant:'signal.50','action-hover':'forest.600','on-error':'white',success:'forest.500','surface-raised':'white',focus:'forest.500'},
 dark:{bg:'neutral.900',paper:'neutral.800',text:'neutral.50',muted:'neutral.300',border:'neutral.700','input-border':'neutral.400',action:'forest.300','on-action':'ink',selected:'forest.800',error:'hongsi.200','disabled-bg':'neutral.700','disabled-text':'neutral.300',assistant:'signal.900','action-hover':'forest.200','on-error':'ink',success:'forest.300','surface-raised':'neutral.700',focus:'forest.300'}
};
const color=hex=>({$type:'color',$value:{colorSpace:'srgb',components:hex.match(/../g).map(x=>parseInt(x,16)/255),alpha:1}});
const dim=n=>({$type:'dimension',$value:{value:n,unit:'px'}});
const primitive={color:{ink:color('202923'),white:color('FFFFFF'),transparent:{$type:'color',$value:{colorSpace:'srgb',components:[0,0,0],alpha:0}}}};
for(const [name,values] of Object.entries(ramps)) primitive.color[name]=Object.fromEntries(values.map((v,i)=>[levels[i],color(v)]));
const semantic=Object.fromEntries(Object.entries(themes).map(([mode,roles])=>[mode,{$description:`${mode} semantic color roles; select one complete group.`,...Object.fromEntries(Object.entries(roles).map(([k,v])=>[k,{$type:'color',$value:`{primitive.color.${v}}` }]))}]));
const spacing=Object.fromEntries([0,4,8,12,16,20,24,32,40,48,64,80,96].map(n=>[n,dim(n)]));
const radius=Object.fromEntries(Object.entries({xs:4,sm:8,md:12,lg:16,xl:24,'2xl':32,pill:999}).map(([k,v])=>[k,dim(v)]));
const durations={instant:0,fast:120,base:200,slow:320,expressive:480};
const easing={standard:[0.2,0,0,1],enter:[0,0,0.2,1],exit:[0.4,0,1,1],spring:[0.22,1,0.36,1]};
const shadowColor=(hex,alpha)=>({colorSpace:'srgb',components:hex.match(/../g).map(x=>parseInt(x,16)/255),alpha});
const shadowValue=(y,blur,alpha,hex)=>({color:shadowColor(hex,alpha),offsetX:{value:0,unit:'px'},offsetY:{value:y,unit:'px'},blur:{value:blur,unit:'px'},spread:{value:0,unit:'px'}});
const shadows={light:{sm:{$type:'shadow',$value:shadowValue(2,8,.06,'202923')},md:{$type:'shadow',$value:shadowValue(8,24,.10,'202923')},lg:{$type:'shadow',$value:shadowValue(16,48,.14,'202923')}},dark:{sm:{$type:'shadow',$value:shadowValue(2,8,.24,'000000')},md:{$type:'shadow',$value:shadowValue(8,24,.32,'000000')},lg:{$type:'shadow',$value:shadowValue(16,48,.40,'000000')}}};
const typeSizes={display:[40,700,1.2],h1:[32,700,1.25],h2:[24,700,1.35],h3:[20,600,1.4],body:[16,400,1.5],label:[14,600,1.4],caption:[12,400,1.5]};
const typography={family:{$type:'fontFamily',$value:['Pretendard','Apple SD Gothic Neo','sans-serif']},weight:{regular:{$type:'fontWeight',$value:400},medium:{$type:'fontWeight',$value:500},semibold:{$type:'fontWeight',$value:600},bold:{$type:'fontWeight',$value:700}},...Object.fromEntries(Object.entries(typeSizes).map(([k,[size,weight,line]])=>[k,{$type:'typography',$value:{fontFamily:'{typography.family}',fontSize:{value:size,unit:'px'},fontWeight:weight,letterSpacing:{value:0,unit:'px'},lineHeight:line}}]))};
const data={$description:'모여락 Brand v3. DTCG 2025.10 typed tokens. All colors sRGB; semantic groups reference primitives. CSS uses explicit data-theme with OS preference fallback.',primitive,semantic,spacing,radius,shadow:shadows,typography,motion:{duration:Object.fromEntries(Object.entries(durations).map(([k,v])=>[k,{$type:'duration',$value:{value:v,unit:'ms'}}])),easing:Object.fromEntries(Object.entries(easing).map(([k,v])=>[k,{$type:'cubicBezier',$value:v}])),reduced:{$description:'Under prefers-reduced-motion: reduce use instant durations, disable looping decorative animation; retain state feedback.',duration:{$type:'duration',$value:{value:0,unit:'ms'}}}}};
fs.writeFileSync(path.join(root,'tokens.json'),JSON.stringify(data,null,2)+'\n');
const palette=Object.entries(ramps).flatMap(([name,values])=>values.map((v,i)=>`  --color-${name}-${levels[i]}: #${v};`)).concat(['  --color-ink: #202923;','  --color-white: #FFFFFF;']);
const base=[...palette,'  --font-sans: Pretendard, "Apple SD Gothic Neo", sans-serif;',...Object.keys(spacing).map(n=>`  --space-${n}: ${n}px;`),...Object.entries(radius).map(([k,v])=>`  --radius-${k}: ${v.$value.value}px;`),...Object.entries(durations).map(([k,v])=>`  --duration-${k}: ${v}ms;`),...Object.entries(easing).map(([k,v])=>`  --ease-${k}: cubic-bezier(${v.join(', ')});`),...Object.entries(typeSizes).flatMap(([k,[size,weight,line]])=>[`  --type-${k}-size: ${size}px;`,`  --type-${k}-weight: ${weight};`,`  --type-${k}-line: ${line};`])];
const roles=mode=>Object.entries(themes[mode]).map(([k,v])=>`  --brand-${k}: var(--color-${v.replace('.','-')});`).concat(Object.entries(shadows[mode]).map(([k,v])=>{const s=v.$value;return `  --brand-shadow-${k}: 0 ${s.offsetY.value}px ${s.blur.value}px rgb(${mode==='light'?'32 41 35':'0 0 0'} / ${s.color.alpha});`}));
const aliases=Object.keys(themes.light).map(k=>`  --color-${k}: var(--brand-${k});`).concat(['sm','md','lg'].map(k=>`  --shadow-${k}: var(--brand-shadow-${k});`));
const tailwind=[...palette,'  --font-sans: Pretendard, "Apple SD Gothic Neo", sans-serif;','  --spacing: 4px;',...Object.entries(radius).map(([k,v])=>`  --radius-${k}: ${v.$value.value}px;`)];
const css=`/* Generated by tools/build-tokens.mjs. Explicit data-theme wins over OS. */\n:root {\n${base.join('\n')}\n${roles('light').join('\n')}\n${aliases.join('\n')}\n  color-scheme: light;\n}\n:root[data-theme="dark"], [data-theme="dark"] {\n${roles('dark').join('\n')}\n${aliases.join('\n')}\n  color-scheme: dark;\n}\n:root[data-theme="light"], [data-theme="light"] {\n${roles('light').join('\n')}\n${aliases.join('\n')}\n  color-scheme: light;\n}\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${roles('dark').map(x=>'  '+x).join('\n')}\n    color-scheme: dark;\n  }\n}\n/* Tailwind CSS v4: import after @import "tailwindcss". */\n@theme {\n${tailwind.join('\n')}\n}\n@theme inline {\n${Object.keys(themes.light).map(k=>`  --color-${k}: var(--brand-${k});`).join('\n')}\n  --shadow-sm: var(--brand-shadow-sm);\n  --shadow-md: var(--brand-shadow-md);\n  --shadow-lg: var(--brand-shadow-lg);\n}\n@media (prefers-reduced-motion: reduce) {\n  :root { --duration-fast: 0ms; --duration-base: 0ms; --duration-slow: 0ms; --duration-expressive: 0ms; }\n  .brand-motion, .brand-motion *, [data-brand-motion], [data-brand-motion] * {\n    animation: none !important; transition: none !important; scroll-behavior: auto !important;\n  }\n}\n`;
fs.writeFileSync(path.join(root,'tokens.css'),css);
console.log('tokens.css and typed tokens.json written');
