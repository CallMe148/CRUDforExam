const $ = selector => document.querySelector(selector);
let books = [], categories = [], bookId = null, categoryId = null;
const status = message => { $('#status').textContent = message; };
async function api(url, options = {}) {
    const res = await fetch('/api' + url, options);
    if (res.status === 204) return;
    const data = await res.json();
    if (!res.ok) throw Error(data.error || 'Request failed');
    return data;
}
function button(label, fn) {
    const b = document.createElement('button'); b.textContent = label; b.type = 'button';
    b.onclick = () => run(fn); return b;
}
async function run(fn) { try { await fn(); } catch (e) { status(e.message); } }
function cancelBook() { bookId = null; $('#bookForm').reset(); $('#formTitle').textContent = 'เพิ่มหนังสือ'; }
function cancelCategory() { categoryId = null; $('#categoryForm').reset(); }
async function load() {
    [books, categories] = await Promise.all([api('/books'), api('/categories')]);
    const selected = $('[name=category_id]').value;
    $('#categories').replaceChildren(); $('[name=category_id]').replaceChildren();
    for (const c of categories) {
        const option = document.createElement('option'); option.value = c.id; option.textContent = c.name; $('[name=category_id]').append(option);
        const li = document.createElement('li'); const name = document.createElement('span'); name.textContent = c.name + ' '; li.append(name,
            button('แก้ไข', () => { categoryId = c.id; $('#categoryForm [name=name]').value = c.name; }),
            button('ลบ', async () => { if (confirm('ลบหมวดหมู่ ' + c.name + '?')) { await api('/categories/' + c.id, { method: 'DELETE' }); if (categoryId === c.id) cancelCategory(); await load(); status('ลบหมวดหมู่แล้ว'); } }));
        $('#categories').append(li);
    }
    if (categories.some(c => String(c.id) === selected)) $('[name=category_id]').value = selected;
    $('#books').replaceChildren();
    if (!books.length) $('#books').textContent = 'ยังไม่มีหนังสือ';
    for (const b of books) {
        const card = document.createElement('article'); card.className = 'card';
        if (b.cover) { const img = document.createElement('img'); img.src = '/uploads/' + encodeURIComponent(b.cover); img.alt = 'ปก ' + b.title; card.append(img); }
        const h = document.createElement('h3'); h.textContent = b.title;
        const p = document.createElement('p'); p.textContent = `${b.author} · ${b.category_name} · ฿${Number(b.price).toFixed(2)}`;
        card.append(h, p, button('แก้ไข', () => {
            bookId = b.id; const form = $('#bookForm'); form.reset();
            for (const key of ['title', 'author', 'price', 'category_id']) form.elements[key].value = b[key];
            $('#formTitle').textContent = 'แก้ไขหนังสือ #' + b.id; form.scrollIntoView({ behavior: 'smooth' });
        }), button('ลบ', async () => { if (confirm('ลบ ' + b.title + '?')) { await api('/books/' + b.id, { method: 'DELETE' }); if (bookId === b.id) cancelBook(); await load(); status('ลบหนังสือแล้ว'); } }));
        $('#books').append(card);
    }
}
$('#categoryForm').onsubmit = e => {
    e.preventDefault(); run(async () => {
        await api('/categories' + (categoryId ? '/' + categoryId : ''), { method: categoryId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: e.target.elements.name.value }) }); cancelCategory(); await load(); status('บันทึกหมวดหมู่แล้ว');
    });
};
$('#bookForm').onsubmit = e => {
    e.preventDefault(); run(async () => {
        const form = new FormData(e.target); if (!form.get('cover').size) form.delete('cover');
        // ห้ามตั้ง Content-Type เอง: browser ต้องสร้าง multipart boundary
        await api('/books' + (bookId ? '/' + bookId : ''), { method: bookId ? 'PUT' : 'POST', body: form }); cancelBook(); await load(); status('บันทึกหนังสือแล้ว');
    });
};
$('#cancelBook').onclick = cancelBook; $('#cancelCategory').onclick = cancelCategory;
run(load);
