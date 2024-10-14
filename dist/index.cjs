"use strict";var m=Object.defineProperty;var a=(r,t)=>m(r,"name",{value:t,configurable:!0});var s=require("fs/promises"),c=require("path"),w=require("fs"),g=require("os");typeof Symbol.asyncDispose!="symbol"&&Object.defineProperty(Symbol,"asyncDispose",{configurable:!1,enumerable:!1,writable:!1,value:Symbol.for("asyncDispose")});class b{static{a(this,"FsFixture")}path;constructor(t){this.path=t}getPath(...t){return c.join(this.path,...t)}exists(t=""){return s.access(this.getPath(t)).then(()=>!0,()=>!1)}rm(t=""){return s.rm(this.getPath(t),{recursive:!0,force:!0})}writeFile(t,i){return s.writeFile(this.getPath(t),i)}writeJson(t,i){return this.writeFile(t,JSON.stringify(i,null,2))}readFile(t,i){return s.readFile(this.getPath(t),i)}async[Symbol.asyncDispose](){await this.rm()}}const F=w.realpathSync(g.tmpdir()),P=`fs-fixture-${Date.now()}`;let p=0;const d=a(()=>(p+=1,p),"getId");class l{static{a(this,"Symlink")}target;type;path;constructor(t,i){this.target=t,this.type=i}}const y=a((r,t,i)=>{const e=[];for(const o in r){if(!Object.hasOwn(r,o))continue;const u=c.join(t,o);let n=r[o];if(typeof n=="function"){const f=Object.assign(Object.create(i),{filePath:u}),h=n(f);if(h instanceof l){h.path=u,e.push(h);continue}else n=h}typeof n=="string"?e.push({path:u,content:n}):e.push(...y(n,u,i))}return e},"flattenFileTree"),j=a(async r=>{const t=c.join(F,`${P}-${d()}/`);if(await s.mkdir(t,{recursive:!0}),r){if(typeof r=="string")await s.cp(r,t,{recursive:!0});else if(typeof r=="object"){const i={fixturePath:t,getPath:a((...e)=>c.join(t,...e),"getPath"),symlink:a((e,o)=>new l(e,o),"symlink")};await Promise.all(y(r,t,i).map(async e=>{await s.mkdir(c.dirname(e.path),{recursive:!0}),e instanceof l?await s.symlink(e.target,e.path,e.type):await s.writeFile(e.path,e.content)}))}}return new b(t)},"createFixture");exports.createFixture=j;
