const fs = require('node:fs'), path = require('node:path'), sharp = require('sharp');
const root = path.resolve(__dirname, '..');
async function main() {
  for (const [source, target] of [['approved.png','mold_player'],['mouth-open.png','mold_drop']]) {
    await sharp(path.join(root,'assets_extended/mold-drop-v1',source))
      .resize(240,237,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}})
      .png({compressionLevel:9}).toFile(path.join(root,'assets',target+'.png'));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
