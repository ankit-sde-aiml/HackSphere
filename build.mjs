import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const page=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const src=readFileSync(new URL('./worker.js',import.meta.url),'utf8');
if(!src.includes('__HTML_JSON__'))throw new Error('Missing HTML marker');
mkdirSync(new URL('./dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('./dist/worker.js',import.meta.url),src.replace('__HTML_JSON__',JSON.stringify(page)));
console.log('HackSphere Worker assembled in dist/worker.js');