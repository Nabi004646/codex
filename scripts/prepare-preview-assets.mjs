import fs from 'node:fs';
for(const name of ['comfyui','activepieces','actual','blender','wger','react-bits'])if(!fs.existsSync('public/previews/'+name+'.webp'))throw Error('Missing application screenshot: '+name);
for(const name of fs.readdirSync('public/previews'))if(/^atlas-.*\.svg$/.test(name))fs.rmSync('public/previews/'+name);
console.log('Verified six genuine application screenshots.');
