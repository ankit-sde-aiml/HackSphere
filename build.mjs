import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
let worker=read("./worker.js"),files=[["__HTML_JSON__","./index.html"],["__CSS_JSON__","./assets/style.css"],["__APP_JSON__","./assets/app.js"]];
for(const [placeholder,path] of files){if(!worker.includes(placeholder))throw new Error("Missing placeholder "+placeholder);worker=worker.replace(placeholder,JSON.stringify(read(path)))}
mkdirSync(new URL("./dist/",import.meta.url),{recursive:true});
writeFileSync(new URL("./dist/worker.js",import.meta.url),worker);
console.log("Built HackSphere Worker with homepage, styles and LMS dashboard");
