import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';
import 'dotenv/config';
test('PostgreSQL integration: CRUD, validation and uploads', async t => {
 assert.ok(process.env.TEST_DATABASE_URL,'Set TEST_DATABASE_URL to a test PostgreSQL database');
 const schema='test_'+Date.now();
 const admin=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 let pool, server, dir;
 try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${schema}`,onConnect:async client=>{await client.query(`SET search_path TO ${schema}`);}});
  assert.equal((await pool.query('SELECT current_schema() AS name')).rows[0].name,schema);
  await pool.query(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));
  const seed=await readFile(new URL('../database/seed.sql',import.meta.url),'utf8');
  await pool.query(seed);await pool.query(seed);
  assert.equal((await pool.query('SELECT * FROM books')).rows.length,1);
  dir=await mkdtemp(path.join(tmpdir(),'crud-test-'));
  server=createApp(pool,dir).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=async(route,method='GET',body)=>{
   const isForm=body instanceof FormData;
   const res=await fetch(base+route,{method,headers:body&&!isForm?{'Content-Type':'application/json'}:undefined,body:body?(isForm?body:JSON.stringify(body)):undefined});
   const text=await res.text();return {status:res.status,data:text?JSON.parse(text):null};
  };
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ2kAAAAASUVORK5CYII=','base64');
  const form=(category,cover=image,extra={})=>{
   const fd=new FormData();for(const [k,v] of Object.entries({title:'Test book',author:'Tester',price:'199.50',category_id:String(category),...extra}))fd.set(k,v);
   if(cover)fd.set('cover',new Blob([cover],{type:'image/png'}),'cover.png');return fd;
  };
  let category,book;
  await t.test('static UI, Swagger, health and seed',async()=>{
   for(const route of ['/','/app.js','/docs/','/openapi.json'])assert.equal((await fetch(base+route)).status,200);
   assert.equal((await request('/api/health')).status,200);
   assert.equal((await request('/api/books')).data[0].category_name,'Programming');
  });
  await t.test('category CRUD and duplicate/invalid input',async()=>{
   let r=await request('/api/categories','POST',{name:'Exam'});assert.equal(r.status,201);category=r.data.id;
   assert.equal((await request('/api/categories/'+category)).data.name,'Exam');
   assert.equal((await request('/api/categories','POST',{name:'Exam'})).status,409);
   assert.equal((await request('/api/categories','POST',{name:' '})).status,400);
   assert.equal((await request('/api/categories/abc')).status,400);
   assert.equal((await request('/api/categories/2147483648')).status,400);
   assert.equal((await request('/api/categories/999999')).status,404);
   assert.equal((await request('/api/categories/'+category,'PUT',{name:'Renamed'})).data.name,'Renamed');
  });
  await t.test('create book with cover and enforce FK restriction',async()=>{
   const r=await request('/api/books','POST',form(category));assert.equal(r.status,201);book=r.data;
   assert.equal((await fetch(base+'/uploads/'+book.cover)).status,200);
   assert.equal((await request('/api/books/'+book.id)).data.title,'Test book');
   assert.equal((await request('/api/categories/'+category,'DELETE')).status,409);
  });
  await t.test('update preserves cover; replacement/removal cleans old files',async()=>{
   let r=await request('/api/books/'+book.id,'PUT',form(category,null,{title:'Updated'}));assert.equal(r.status,200);assert.equal(r.data.cover,book.cover);
   const old=book.cover;
   r=await request('/api/books/'+book.id,'PUT',form(category));assert.equal(r.status,200);book=r.data;assert.notEqual(book.cover,old);
   assert.equal((await fetch(base+'/uploads/'+old)).status,404);
   r=await request('/api/books/'+book.id,'PUT',form(category,null,{remove_cover:'true'}));assert.equal(r.data.cover,null);
   assert.deepEqual(await readdir(dir),[]);
  });
  await t.test('bad ID, price, FK, oversized and fake image; no leaked uploads',async()=>{
   assert.equal((await request('/api/books','POST',form(category,null,{price:'-1'}))).status,400);
   assert.equal((await request('/api/books','POST',form(category,null,{price:''}))).status,400);
   assert.equal((await request('/api/books','POST',form(category,null,{price:'1.234'}))).status,400);
   assert.equal((await request('/api/books','POST',form(999999))).status,409);
   assert.equal((await request('/api/books/999999','PUT',form(category))).status,404);
   assert.equal((await request('/api/books','POST',form(category,Buffer.from('<script>bad</script>')))).status,400);
   assert.equal((await request('/api/books','POST',form(category,Buffer.alloc(2*1024*1024+1)))).status,400);
   assert.deepEqual(await readdir(dir),[]);
  });
  await t.test('delete book removes cover; category can then be deleted',async()=>{
   book=(await request('/api/books/'+book.id,'PUT',form(category))).data;
   assert.equal((await request('/api/books/'+book.id,'DELETE')).status,204);
   assert.equal((await fetch(base+'/uploads/'+book.cover)).status,404);
   assert.equal((await request('/api/books/'+book.id)).status,404);
   assert.equal((await request('/api/books/'+book.id,'DELETE')).status,404);
   assert.equal((await request('/api/categories/'+category,'DELETE')).status,204);
   assert.equal((await request('/api/categories/'+category,'PUT',{name:'gone'})).status,404);
   assert.deepEqual(await readdir(dir),[]);
  });
 } finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  if(pool)await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();
  if(dir)await rm(dir,{recursive:true,force:true});
 }
});
