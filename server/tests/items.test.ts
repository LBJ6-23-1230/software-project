import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../app.ts";
import { validateItem } from "../modules/items.ts";

const draft={type:"found",title:"模块测试雨伞",category:"生活用品",location:"南湖图书馆",
  campus:"南湖校区",occurredAt:"2026-11-11",description:"仅用于隔离测试的虚构物品。"};

test("CSW-T01: title, location and description accept exact bounds and reject adjacent values",()=>{
  for(const [field,min,max] of [["title",2,80],["location",2,80],["description",5,2000]] as const){
    for(const length of [min,max])assert.equal(validateItem({...draft,[field]:"测".repeat(length)})[field].length,length);
    for(const length of [min-1,max+1])assert.throws(()=>validateItem({...draft,[field]:"测".repeat(length)}));
    assert.throws(()=>validateItem({...draft,[field]:" ".repeat(max)}));
  }
});

test("CSW-T02: image validation rejects scripts, HTML, disguised bytes and oversized content",()=>{
  const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=";
  assert.equal(validateItem({...draft,imageUrl:`data:image/png;base64,${png}`}).imageUrl,`data:image/png;base64,${png}`);
  const oversized=Buffer.alloc(1024*1024+1);Buffer.from([137,80,78,71,13,10,26,10]).copy(oversized);
  for(const imageUrl of ["javascript:alert(1)","data:text/html;base64,PHNjcmlwdD4=",
    "data:image/svg+xml;base64,PHN2Zy8+",`data:image/png;base64,${Buffer.from("<html>not-an-image</html>").toString("base64")}`,
    `data:image/png;base64,${oversized.toString("base64")}`,"/assets/../private.sqlite"])
    assert.throws(()=>validateItem({...draft,imageUrl}));
});

test("CSW-T03: calendar dates and both information types are checked without silent date rollover",()=>{
  for(const type of ["lost","found"])assert.equal(validateItem({...draft,type,occurredAt:"2024-02-29"}).type,type);
  for(const occurredAt of ["2026-02-29","2026-02-30","2026-13-01","2026-11-31","not-a-date"])
    assert.throws(()=>validateItem({...draft,occurredAt}));
  for(const change of [{type:"other"},{category:"不存在"},{campus:"不存在"}])assert.throws(()=>validateItem({...draft,...change}));
});

async function fixture(t:TestContext){
  const instance=createApp({dbPath:":memory:"});
  const server=instance.app.listen(0,"127.0.0.1");await once(server,"listening");
  const address=server.address();assert.ok(address && typeof address!=="string");
  const port=address.port;
  t.after(async()=>{await new Promise<void>(r=>server.close(()=>r()));instance.close();});
  async function call(path:string,body?:unknown,token?:string,method?:string){
    const response=await fetch(`http://127.0.0.1:${port}/api${path}`,{
      method:method??(body===undefined?"GET":"POST"),headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
      body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,data:await response.json() as any};
  }
  const login=async(studentId:string)=>(await call("/auth/login",{studentId,password:"Campus123!"})).data;
  return {call,login};
}

test("CSW-T04: six combined filters and three pages agree with fixed expected records",async t=>{
  const {call,login}=await fixture(t);const owner=await login("20260001"),admin=await login("admin");
  const records=[] as any[];
  for(let n=0;n<9;n++){
    const input={...draft,title:`CSW矩阵${n}测试物品`,type:n%2?"lost":"found",category:n%3?"生活用品":"数码产品",
      campus:n%2?"余家头校区":"南湖校区"};
    const r=await call("/items",input,owner.token);assert.equal(r.status,201);records.push(r.data);
    assert.equal((await call(`/admin/items/${r.data.id}/review`,{action:"approve"},admin.token)).status,200);
  }
  const filters:Record<string,string>[]=[{},{type:"lost"},{type:"found",campus:"南湖校区"},{category:"数码产品"},
    {type:"lost",category:"生活用品"},{campus:"余家头校区",category:"数码产品"}];
  for(const filter of filters){
    const params=new URLSearchParams({q:"CSW矩阵",...filter,pageSize:"50"});
    const r=await call(`/items?${params}`);assert.equal(r.status,200);
    const expected=records.filter(record=>Object.entries(filter).every(([k,v])=>record[k]===v)).map(r=>r.id).sort();
    assert.deepEqual(r.data.items.map((i:any)=>i.id).sort(),expected);assert.equal(r.data.total,expected.length);
  }
  const ids=[];
  for(let page=1;page<=3;page++){
    const r=await call(`/items?${new URLSearchParams({q:"CSW矩阵",page:String(page),pageSize:"3"})}`);
    assert.equal(r.status,200);assert.equal(r.data.items.length,3);ids.push(...r.data.items.map((i:any)=>i.id));
  }
  assert.equal(new Set(ids).size,9);assert.deepEqual(ids.slice().sort(),records.map(i=>i.id).sort());
  for(const pageSize of ["1","50"])assert.equal((await call(`/items?pageSize=${pageSize}`)).status,200);
  for(const pageSize of ["0","51","1.5","abc"])assert.equal((await call(`/items?pageSize=${pageSize}`)).status,400);
});

test("CSW-T05: foreign edit/withdraw and identity injection fail; owner edit re-enters private review",async t=>{
  const {call,login}=await fixture(t);const owner=await login("20260001"),stranger=await login("20260002"),admin=await login("admin");
  assert.equal((await call("/items",draft)).status,401);
  assert.equal((await call("/items",{...draft,ownerId:stranger.user.id},owner.token)).status,400);
  const created=await call("/items",draft,owner.token);assert.equal(created.status,201);const id=created.data.id;
  assert.equal((await call(`/items/${id}`,draft,stranger.token,"PATCH")).status,403);
  assert.equal((await call(`/items/${id}/withdraw`,{},stranger.token)).status,403);
  await call(`/admin/items/${id}/review`,{action:"approve"},admin.token);
  assert.equal((await call(`/items/${id}`)).status,200);
  const edited=await call(`/items/${id}`,{...draft,title:"本人修改后的雨伞"},owner.token,"PATCH");
  assert.equal(edited.status,200);assert.equal(edited.data.reviewStatus,"pending");
  assert.equal((await call(`/items/${id}`)).status,404);
  assert.equal((await call(`/items/${id}`,undefined,owner.token)).status,200);
  assert.equal((await call(`/items/${id}/withdraw`,{},owner.token)).data.status,"withdrawn");
  assert.equal((await call(`/items/${id}`,draft,owner.token,"PATCH")).status,409);
});
