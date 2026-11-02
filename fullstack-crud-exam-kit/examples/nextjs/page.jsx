'use client';
import { useEffect, useState } from 'react';
export default function Page() {
 const [books,setBooks]=useState([]),[categories,setCategories]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function request(url,options) {
  const res=await fetch(url,options);const data=await res.json();if(!res.ok)throw Error(data.error || 'Request failed');return data;
 }
 async function load() {
  const [b,c]=await Promise.all([request('/api/books'),request('/api/categories')]);setBooks(b);setCategories(c);
 }
 useEffect(()=>{load().catch(e=>setMessage(e.message));},[]);
 async function submit(event) {
  event.preventDefault();const form=event.currentTarget;setBusy(true);
  try {
   const data=new FormData(form);if(!data.get('cover').size)data.delete('cover');
   await request('/api/books',{method:'POST',body:data});form.reset();await load();setMessage('บันทึกแล้ว');
  } catch(e) {setMessage(e.message);} finally {setBusy(false);}
 }
 return <main style={{maxWidth:800,margin:'40px auto',fontFamily:'sans-serif'}}>
  <h1>Book Catalog · Next.js example</h1><p role="status">{message}</p>
  <form onSubmit={submit}>
   <label>ชื่อหนังสือ <input name="title" required maxLength={200}/></label><br/>
   <label>ผู้เขียน <input name="author" required maxLength={150}/></label><br/>
   <label>ราคา <input name="price" type="number" min="0" max="99999999.99" step="0.01" required/></label><br/>
   <label>หมวดหมู่ <select name="category_id" required>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><br/>
   <label>ปก <input name="cover" type="file" accept="image/png,image/jpeg,image/webp"/></label><br/>
   <button disabled={busy || !categories.length}>{busy?'กำลังบันทึก…':'เพิ่มหนังสือ'}</button>
  </form>
  {books.map(b=><article key={b.id}><h2>{b.title}</h2><p>{b.author} · {b.category_name} · ฿{Number(b.price).toFixed(2)}</p>{b.cover && <img src={'/uploads/'+encodeURIComponent(b.cover)} alt={'ปก '+b.title} width="120"/>}</article>)}
 </main>;
}
