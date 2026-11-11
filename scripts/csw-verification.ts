/** Run existing audits/smoke against the current build and an isolated database. */
import express from "express";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.ts";

const root=fileURLToPath(new URL("..",import.meta.url));
const out=resolve(root,"reports/csw/2026-11-11-production-verification");
const scratch=resolve(root,"output",`csw-production-${Date.now()}`);
mkdirSync(out,{recursive:true});mkdirSync(scratch,{recursive:true});
const instance=createApp({dbPath:resolve(scratch,"campus.sqlite"),backupDir:resolve(scratch,"backups")});
instance.app.use(express.static(resolve(root,"dist")));
instance.app.get("/{*path}",(_req,res)=>res.sendFile(resolve(root,"dist/index.html")));
const server=instance.app.listen(0,"127.0.0.1");await once(server,"listening");
const address=server.address();if(!address || typeof address==="string")throw new Error("API address unavailable");
const base=`http://127.0.0.1:${address.port}`;
const checks=[] as {name:string,exitCode:number,log:string}[];
async function run(name:string,script:string,extra:Record<string,string>={}){
  const child=spawn(process.execPath,[script],{cwd:root,env:{...process.env,A11Y_BASE_URL:base,SMOKE_BASE_URL:base,
    A11Y_OUT:"reports/csw/2026-11-11-a11y",...extra},stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout.on("data",b=>{log+=b;process.stdout.write(b);});child.stderr.on("data",b=>{log+=b;process.stderr.write(b);});
  const [exitCode]=await once(child,"exit");
  writeFileSync(resolve(out,`${name}.txt`),log);
  checks.push({name,exitCode:Number(exitCode),log:`${name}.txt`});
}
try{
  await run("a11y","scripts/a11y-audit.mjs");
  await run("smoke-normal","scripts/smoke-test.mjs");
  await run("smoke-forced-colors","scripts/smoke-test.mjs",{SMOKE_FORCED_COLORS:"active"});
}finally{
  await new Promise<void>(r=>server.close(()=>r()));instance.close();
  writeFileSync(resolve(out,"report.json"),JSON.stringify({generatedAt:new Date().toISOString(),
    node:process.version,scope:"Current production build with isolated SQLite; not real screen-reader listening",checks},null,2));
}
if(checks.some(c=>c.exitCode!==0))process.exitCode=1;
