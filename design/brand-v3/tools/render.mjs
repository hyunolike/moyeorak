import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const url='http://brand-v3.local';const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:600,height:600},deviceScaleFactor:2});await page.route('http://brand-v3.local/**',async route=>{try{const file=path.join(root,new URL(route.request().url()).pathname);const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};await route.fulfill({body:await fs.readFile(file),contentType:types[path.extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}});page.on('pageerror',e=>console.error(e));await page.goto(url+'/tools/render.html');await page.waitForFunction(()=>window.ready);
async function shoot(out,options){await page.evaluate(o=>window.renderAsset(o),options);await page.locator('canvas').screenshot({path:path.join(root,out),omitBackground:true});console.log(out);}
await fs.mkdir(path.join(root,'character/3d'),{recursive:true});
if(process.argv.includes('--first')){await shoot('character/3d/default.png',{width:512,height:512});}
else{
 const names=['default','thinking','waiting','happy','sorry','guide','celebrate','sleepy'];for(const name of names){await shoot(`character/3d/${name}.png`,{name,width:512,height:512});for(const size of [512,256])await sharp(path.join(root,`character/3d/${name}.png`)).resize(size,size).png().toFile(path.join(root,`character/3d/${name}-${size}.png`));}
 for(const view of ['front','side'])await shoot(`character/3d/default-${view}.png`,{view,width:512,height:512});
 await fs.mkdir(path.join(root,'character/3d/turntable'),{recursive:true});for(let angle=0;angle<360;angle+=30)await shoot(`character/3d/turntable/${String(angle).padStart(3,'0')}.png`,{angle,width:256,height:256});
 await page.evaluate(()=>window.renderAsset({name:'default',width:512,height:512}));await fs.writeFile(path.join(root,'character/3d/mazu.glb'),Buffer.from(await page.evaluate(()=>window.exportGLB())));
 await fs.mkdir(path.join(root,'props/3d'),{recursive:true});for(const name of ['station-sign','map-pin','clock-tile','calendar-tile','chat-bubble','three-dots-converging'])await shoot(`props/3d/${name}.png`,{kind:'prop',name,width:256,height:256});
 await fs.mkdir(path.join(root,'scenes/3d'),{recursive:true});for(const name of ['landing-hero','empty-state','error-state'])await shoot(`scenes/3d/${name}.png`,{kind:'scene',name,width:600,height:450});
 await fs.mkdir(path.join(root,'app-icon'),{recursive:true});await shoot('app-icon/icon-render.png',{kind:'icon',width:512,height:512});
}
await browser.close();
