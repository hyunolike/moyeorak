import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

// All expressions share this rig. Front is +Z; unit = capsule height.
export const expressions={
 default:{eyes:'round',mouth:'smile',tilt:0,left:[-1.48,1.32,.12],right:[1.48,1.38,.17]},
 thinking:{eyes:'look-up',mouth:'o',tilt:-.10,left:[-1.43,1.27,.13],right:[.97,1.68,.94]},
 waiting:{eyes:'soft',mouth:'small-smile',tilt:.055,left:[-.56,1.08,.76],right:[.56,1.08,.76]},
 happy:{eyes:'crescent',mouth:'laugh',tilt:-.08,left:[-1.53,2.43,.1],right:[1.53,2.43,.1]},
 sorry:{eyes:'droop',mouth:'frown',tilt:.13,left:[-.52,1.07,.79],right:[.52,1.07,.79],bow:.12},
 guide:{eyes:'wink',mouth:'side-smile',tilt:-.04,left:[-1.45,1.24,.18],right:[1.64,2.17,.18]},
 celebrate:{eyes:'joy',mouth:'wide-laugh',tilt:.08,left:[-1.37,2.91,.14],right:[1.37,2.91,.14],jump:.18},
 sleepy:{eyes:'closed',mouth:'yawn',tilt:-.15,left:[-1.40,1.12,.12],right:[1.29,1.10,.19],squat:.12}
};
export const palette={hongsi:'#F45B3F',cream:'#FFF1DA',ink:'#202923',cheek:'#FFBBA8',forest:'#176B5B',signal:'#F3CF58'};
const materials={};
function clay(color){return materials[color]??=(new THREE.MeshStandardMaterial({color,roughness:.93,metalness:0}));}
function mesh(geo,color,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,clay(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,w,h,d,r,color,x=0,y=0,z=0){return mesh(new RoundedBoxGeometry(w,h,d,8,r),color,parent,x,y,z);}
function ball(parent,x,y,z,sx,sy,sz,color){const m=mesh(new THREE.SphereGeometry(1,40,32),color,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function stroke(parent,coords,r,color){const points=coords.map(p=>new THREE.Vector3(...p));const curve=new THREE.CatmullRomCurve3(points);return mesh(new THREE.TubeGeometry(curve,48,r,12,false),color,parent);}
function limb(parent,start,end,r,color){stroke(parent,[start,[(start[0]+end[0])*.53,(start[1]+end[1])*.5+.04,(start[2]+end[2])*.5],end],r,color);ball(parent,...end,r,r,r,color);ball(parent,...start,r,r,r,color);}
function mouth(g,kind){const z=.775,y=1.56,I=palette.ink;const line=(points,r=.035)=>stroke(g,points.map(p=>[p[0],y+p[1],z]),r,I);
 if(kind==='smile')line([[-.22,.04],[-.12,-.065],[0,-.095],[.12,-.065],[.22,.04]]);
 if(kind==='small-smile')line([[-.16,0],[0,-.035],[.16,0]],.033);
 if(kind==='side-smile')line([[-.19,.025],[-.08,-.085],[.08,-.07],[.23,.07]],.036);
 if(kind==='frown')line([[-.17,-.055],[0,.015],[.17,-.055]],.034);
 if(kind==='o'||kind==='yawn'){ball(g,0,y-.02,z,.095,kind==='yawn'?.14:.095,.031,I);if(kind==='yawn')ball(g,.015,y-.09,z+.026,.048,.032,.012,'#E38C79');}
 if(kind==='laugh'||kind==='wide-laugh'){const w=kind==='laugh'?.23:.28;const shape=new THREE.Shape();shape.moveTo(-w,.035);shape.quadraticCurveTo(0,-.06,w,.035);shape.quadraticCurveTo(w*.9,-.255,0,-.26);shape.quadraticCurveTo(-w*.9,-.255,-w,.035);const m=mesh(new THREE.ShapeGeometry(shape,32),I,g,0,y,z+.01);ball(g,0,y-.195,z+.018,w*.53,.049,.009,'#F9A18A');}
}
function eyes(g,kind){const z=.79,cy=1.91,I=palette.ink;for(const side of [-1,1]){let x=side*.39,y=cy;let sx=.107,sy=.145;
 if(kind==='look-up'){x+=.025;y+=.08;sx=.11;sy=side===-1?.103:.14;}
 if(kind==='soft'){sx=.12;sy=.077;y-=.025;}
 if(kind==='droop'){sx=.095;sy=.105;y-=.04;}
 if(['crescent','joy','closed'].includes(kind)||(kind==='wink'&&side===1)){
 const high=kind==='closed'?-.075:kind==='joy'?.13:.10;
 stroke(g,[[x-.125,y-.025,z],[x,y+high,z+.006],[x+.125,y-.025,z]],kind==='joy'?.043:.038,I);
 }else{ball(g,x,y,z,sx,sy,.047,I);ball(g,x-.032,y+sy*.36,z+.045,.032,.039,.012,'#FFFFFF');}
 if(kind==='droop')stroke(g,[[x-.14,cy+.22,z],[x,cy+.25,z],[x+.12,cy+.19,z]],.026,I);
 if(kind==='look-up'&&side===1)stroke(g,[[x-.11,cy+.30,z],[x,cy+.34,z],[x+.1,cy+.31,z]],.023,I);
 }
}
export function createMazu(name='default',{scale=1}={}){const p=expressions[name]??expressions.default;const root=new THREE.Group();root.name=`Mazu_${name}`;const g=new THREE.Group();root.add(g);
 // Silhouette is a softly bevelled station sign with a subtle clipped lower corner.
 const shape=new THREE.Shape();const x=-1.25,b=.68,t=2.85,r=.48;shape.moveTo(x+r,b);shape.lineTo(.80,b);shape.quadraticCurveTo(.91,b,1.01,b+.10);shape.lineTo(1.16,b+.25);shape.quadraticCurveTo(1.25,b+.34,1.25,b+.46);shape.lineTo(1.25,t-r);shape.quadraticCurveTo(1.25,t,.77,t);shape.lineTo(-.77,t);shape.quadraticCurveTo(x,t,x,t-r);shape.lineTo(x,b+r);shape.quadraticCurveTo(x,b,x+r,b);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.70,bevelEnabled:true,bevelSegments:10,steps:1,bevelSize:.13,bevelThickness:.14,curveSegments:32});geo.translate(0,0,-.42);geo.computeVertexNormals();mesh(geo,palette.hongsi,g);
 box(g,2.18,1.05,.22,.46,palette.cream,0,1.78,.575);
 eyes(g,p.eyes);mouth(g,p.mouth);
 for(const side of [-1,1]){ball(g,side*.76,1.64,.77,.116,.049,.012,palette.cheek);}
 limb(g,[-1.16,1.64,.05],p.left,.18,palette.hongsi);limb(g,[1.16,1.64,.05],p.right,.18,palette.hongsi);
 const feet=name==='celebrate'?[[-.66,.39,.14],[.69,.52,.06]]:name==='sleepy'?[[-.62,.35,.27],[.66,.35,.27]]:[[-.64,.38,.13],[.64,.38,.13]];
 for(const f of feet){const foot=box(g,.45,.59,.64,.20,'#DC482F',...f);foot.rotation.z=name==='celebrate'?-.19:0;}
 g.rotation.z=p.tilt;g.rotation.x=p.bow??0;g.position.y=(p.jump??0)-(p.squat??0);root.scale.setScalar(scale);return root;
}
export function createProp(name){const g=new THREE.Group();g.name=`prop_${name}`;const C=palette;
 if(name==='station-sign'){box(g,.22,1.5,.22,.10,C.forest,0,.8,0);box(g,2.4,.95,.40,.22,C.cream,0,1.65,0);box(g,1.75,.24,.12,.10,C.forest,0,1.65,.25);ball(g,-.87,1.65,.26,.12,.12,.06,C.hongsi);box(g,.95,.17,.7,.08,'#CCC6BC',0,.08,0);}
 if(name==='map-pin'||name==='cracked-map-pin'){const s=new THREE.Shape();s.moveTo(0,.12);s.bezierCurveTo(-.1,.3,-.83,1.05,-.83,1.51);s.bezierCurveTo(-.83,2.64,.83,2.64,.83,1.51);s.bezierCurveTo(.83,1.05,.1,.3,0,.12);const hole=new THREE.Path();hole.absellipse(0,1.59,.30,.30,0,Math.PI*2,true);s.holes.push(hole);const geo=new THREE.ExtrudeGeometry(s,{depth:.26,bevelEnabled:true,bevelSize:.07,bevelThickness:.08,bevelSegments:8,curveSegments:48});geo.translate(0,0,-.14);mesh(geo,C.hongsi,g);if(name==='cracked-map-pin')stroke(g,[[-.19,1.23,.23],[.05,1.09,.23],[-.12,.93,.23],[.09,.73,.23]],.028,C.ink);}
 if(name==='clock-tile'){box(g,1.95,1.95,.46,.33,C.signal,0,1.15,0);ball(g,0,1.15,.28,.76,.76,.07,C.cream);stroke(g,[[0,1.7,.39],[0,1.15,.39],[.40,1.15,.39]],.065,C.ink);ball(g,0,1.15,.41,.10,.10,.04,C.hongsi);for(let i=0;i<4;i++){const a=i*Math.PI/2;ball(g,Math.sin(a)*.61,1.15+Math.cos(a)*.61,.37,.033,.033,.016,C.ink);}}
 if(name==='calendar-tile'||name==='blank-calendar'){box(g,2.08,1.94,.42,.24,C.cream,0,1.14,0);box(g,2.05,.46,.44,.15,C.hongsi,0,1.89,.015);for(const x of [-.58,.58])box(g,.15,.43,.16,.072,C.forest,x,2.07,.15);for(let r=0;r<2;r++)for(let c=0;c<3;c++){box(g,.28,.25,.055,.06,name==='blank-calendar'?'#E4E0D8':r===1&&c===1?C.forest:'#CCC6BC',-.56+c*.56,1.26-r*.48,.25);}}
 if(name==='chat-bubble'){box(g,2.35,1.51,.47,.43,C.cream,0,1.46,0);const tail=box(g,.52,.52,.35,.1,C.signal,-.67,.76,.01);tail.rotation.z=.54;for(const x of [-.53,0,.53])ball(g,x,1.47,.27,.11,.11,.055,C.forest);}
 if(name==='three-dots-converging'){for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const mini=createMazu(i===1?'happy':'default',{scale:.31});mini.position.set(Math.sin(a)*1.02,.04,Math.cos(a)*.75);mini.rotation.y=-Math.sin(a)*.35;g.add(mini);stroke(g,[[Math.sin(a)*.42,.03,Math.cos(a)*.42],[0,.03,0]],.05,[C.hongsi,C.forest,C.signal][i]);}ball(g,0,.04,0,.18,.045,.18,C.cream);}
 return g;
}
function shadowTexture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');const gr=ctx.createRadialGradient(128,128,3,128,128,125);gr.addColorStop(0,'rgba(60,35,20,.23)');gr.addColorStop(.4,'rgba(60,35,20,.12)');gr.addColorStop(1,'rgba(60,35,20,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,256,256);return new THREE.CanvasTexture(c);}
function ground(scene,size=3.3){if(typeof document === 'undefined')return;const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size*.65),new THREE.MeshBasicMaterial({map:shadowTexture(),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.008;scene.add(m);const catcher=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.12}));catcher.rotation.x=-Math.PI/2;catcher.receiveShadow=true;catcher.position.y=.015;scene.add(catcher);}
export function setup(canvas,{width=512,height=512}={}){const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(2);renderer.setSize(width,height);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.98;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;return renderer;}
export async function render(renderer,opts={}){const {kind='character',name='default',angle=24,view='hero',width=512,height=512}=opts;renderer.setSize(width,height);const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#FFF3E5','#C3B8A8',1.7));const key=new THREE.DirectionalLight('#FFE8CE',4.3);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-5,near:.1,far:20});key.shadow.bias=-.001;key.shadow.normalBias=.02;key.shadow.radius=5;scene.add(key);const fill=new THREE.DirectionalLight('#E3EBFF',1.3);fill.position.set(4,2,3);scene.add(fill);const rim=new THREE.DirectionalLight('#FFF1DF',1.8);rim.position.set(1,4,-4);scene.add(rim);
 const aspect=width/height;let span=4.8,target=new THREE.Vector3(0,1.60,0),model;
 if(kind==='character'){model=createMazu(name);scene.add(model);ground(scene);model.rotation.y=THREE.MathUtils.degToRad(angle);if(view==='side')model.rotation.y=Math.PI/2;if(view==='front')model.rotation.y=0;}
 if(kind==='prop'){model=createProp(name);scene.add(model);model.rotation.y=.35;target.y=1.1;span=3.5;ground(scene,2.7);}
 if(kind==='icon'){model=createMazu('default');model.position.y=-.1;scene.add(model);model.rotation.y=.10;span=3.65;target.y=1.6;ground(scene);}
 if(kind==='scene'){span=6.5;target.y=1.35;model=new THREE.Group();scene.add(model);if(name==='landing-hero'){const m=createMazu('guide');m.rotation.y=.20;m.position.set(.45,.03,.05);model.add(m);for(let i=0;i<3;i++){const col=[palette.forest,palette.signal,palette.hongsi][i];const points=[[[-2.7,.06,.7],[-1.65,.06,.7],[-1.2,.06,.1],[.45,.06,.1]],[[-1.6,.06,-1.5],[-1.6,.06,-.7],[-.7,.06,.1],[.45,.06,.1]],[[2.5,.06,1.2],[1.5,.06,1.2],[1.1,.06,.1],[.45,.06,.1]]][i];stroke(model,points,.075,col);const mini=createMazu(i===1?'happy':'default',{scale:.26});mini.position.set(points[0][0],.06,points[0][2]);mini.rotation.y=-.2;model.add(mini);}const pin=createProp('map-pin');pin.scale.setScalar(.40);pin.position.set(2.05,.2,-.6);pin.rotation.z=-.16;model.add(pin);}
 if(name==='empty-state'){const m=createMazu('sleepy');m.position.x=-1.05;m.rotation.y=.12;model.add(m);const p=createProp('blank-calendar');p.position.set(1.75,.03,-.3);p.rotation.y=-.18;p.rotation.z=-.08;model.add(p);}
 if(name==='error-state'){const m=createMazu('sorry');m.position.x=-.8;m.rotation.y=.16;model.add(m);const p=createProp('cracked-map-pin');p.position.set(1.55,.75,.3);p.scale.setScalar(.62);p.rotation.z=-.25;model.add(p);}
 ground(scene,6.5);}
 const camera=new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,100);camera.position.set(0,target.y+2.3,8.6);if(view==='front'||view==='side')camera.position.set(0,target.y,9);camera.lookAt(target);renderer.render(scene,camera);window.lastScene=scene;window.lastModel=model;window.lastCamera=camera;return {meshes:model.children.length};}
window.exportGLB=async()=>{const exporter=new GLTFExporter();const result=await exporter.parseAsync(window.lastModel,{binary:true,onlyVisible:true});return Array.from(new Uint8Array(result));};
