'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function updateGameCache(root){
  const consumers=fs.readdirSync(root).filter(file=>file!=='site.js'&&/\.(js|html)$/.test(file));
  // Dependencies before their importers, so a changed leaf also refreshes every parent URL.
  const assets=['green-city-development.js','green-city-planning.js','green-city-life.js','green-city-intro.js','green-city-neighbourhood-icons.js','green-city-neighbourhoods.js','green-city-missions.js','green-city-core.js','green-city-art.js','green-city-life-world.js','green-city-world.js','green-city-residents.js','green-city-transport.js','green-city-experience.js','green-city-planning-ui.js','green-city-intro-ui.js','green-city-development-ui.js','green-city.js','green-city-ui.css','green-city-neighbourhoods.css','green-city-missions.css','green-city-transport.css'];
  assets.unshift('arctic-model.js','arctic-ice.js','arctic-surfaces.js','arctic-wildlife.js','arctic-world.js','arctic-story.js','arctic-story.css');
  assets.unshift('assets/data/green-city-presentation.js');
  for(const asset of assets){
    const file=path.join(root,asset);if(!fs.existsSync(file))continue;
    const version=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,10);
    const pattern=new RegExp('(["\'])(\\./)?'+asset.replaceAll('.','\\.')+'(?:\\?v=[a-f0-9]+)?\\1','g');
    for(const consumer of consumers){const target=path.join(root,consumer),before=fs.readFileSync(target,'utf8');const after=before.replace(pattern,(_,quote,prefix)=>quote+(prefix||'')+asset+'?v='+version+quote);if(before!==after)fs.writeFileSync(target,after);}
  }
}
module.exports={updateGameCache};
