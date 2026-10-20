const fs=require('fs'),path=require('path');
const sharp=require(process.env.CZ_NODE_MODULES?path.join(process.env.CZ_NODE_MODULES,'sharp'):'sharp');
const root=path.resolve(__dirname,'..');
async function read(k){const {data,info}=await sharp(path.join(root,'assets_extended',k+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;if(data[i+3]<=8)data[i+3]=0;if(data[i+3]>40){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}return{data,info,box:{left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}};}
(async()=>{const manifest={canvas:[256,360],anchor:[128,340],displayScale:.5,assets:{},mode:'Built-in image generation; source art retained in assets_extended. Shared pair scale, uniform crop/resize and transparent padding only.'};const scale=JSON.parse(fs.readFileSync(path.join(root,'assets/scale.json')));
for(const flavor of ['blueberry','cinnamon_roll']){const fresh=await read(flavor),factor=230/fresh.box.width;for(const k of [flavor,'zombie_'+flavor]){const r=k===flavor?fresh:await read(k),w=Math.round(r.box.width*factor),h=Math.round(r.box.height*factor),buf=await sharp(r.data,{raw:r.info}).extract(r.box).resize(w,h,{fit:'fill'}).png().toBuffer();if(w>256||h>340)throw Error('Sprite does not fit '+k);await sharp({create:{width:256,height:360,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:buf,left:Math.round(128-w/2),top:340-h}]).png().toFile(path.join(root,'assets',k+'.png'));manifest.assets[k]={sourceBox:r.box,sourceScale:factor,exportSize:[w,h],foot:[128,340]};scale[k]=.5;}}
fs.writeFileSync(path.join(root,'assets/scale.json'),JSON.stringify(scale));
fs.writeFileSync(path.join(root,'assets_extended/manifest.json'),JSON.stringify(manifest,null,2));
console.log(manifest);
})();
