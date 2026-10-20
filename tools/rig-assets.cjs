const fs = require('node:fs'), path = require('node:path');
const RIG_FILES = {
  rig_butter_body: 'butter.png',
  rig_butter_eyes: 'butter_eyes.png',
  rig_butter_Lhand: 'butter_Lhand.png',
  rig_butter_Rhand: 'butter_Rhand.png'
};
function loadRigAssets(root) {
  return Object.fromEntries(Object.entries(RIG_FILES).map(([key, file]) => [
    key, 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets/rigs/butter', file)).toString('base64')
  ]));
}
module.exports = { loadRigAssets, RIG_FILES };
