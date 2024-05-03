import i from"fs/promises";import s from"path";import l from"fs";import f from"os";typeof Symbol.asyncDispose!="symbol"&&Object.defineProperty(Symbol,"asyncDispose",{configurable:!1,enumerable:!1,writable:!1,value:Symbol.for("asyncDispose")});class p{path;constructor(t){this.path=t}getPath(t){return s.join(this.path,t)}exists(t=""){return i.access(this.getPath(t)).then(()=>!0,()=>!1)}rm(t=""){return i.rm(this.getPath(t),{recursive:!0,force:!0})}writeFile(t,e){return i.writeFile(this.getPath(t),e)}writeJson(t,e){return this.writeFile(t,JSON.stringify(e,null,2))}readFile(t,e){return i.readFile(this.getPath(t),e)}async[Symbol.asyncDispose](){await this.rm()}}const u=l.realpathSync(f.tmpdir()),h=`fs-fixture-${Date.now()}`;let o=0;const m=()=>(o+=1,o),c=(r,t)=>{const e=[];for(const a in r){if(!Object.hasOwn(r,a))continue;const n=r[a];typeof n=="string"?e.push({path:s.join(t,a),content:n}):e.push(...c(n,s.join(t,a)))}return e},y=async r=>{const t=s.join(u,`${h}-${m()}`);return await i.mkdir(t,{recursive:!0}),r&&(typeof r=="string"?await i.cp(r,t,{recursive:!0}):typeof r=="object"&&await Promise.all(c(r,t).map(async e=>{await i.mkdir(s.dirname(e.path),{recursive:!0}),await i.writeFile(e.path,e.content)}))),new p(t)};export{y as createFixture};
