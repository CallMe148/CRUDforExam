// ไฟล์นี้ทำงานในเบราว์เซอร์: รับค่าจากฟอร์ม → เรียก API → วาดรายการใหม่
const bookForm = document.querySelector('#bookForm');
const categoryForm = document.querySelector('#categoryForm');
const status = document.querySelector('#status');
let editingBookId = null;
let editingCategoryId = null;

// fetch ไม่ throw เมื่อได้ 400/404/500 จึงต้องตรวจ res.ok เองทุกครั้ง
async function request(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 204) return null; // DELETE สำเร็จ ไม่มี JSON กลับมา
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'เรียก API ไม่สำเร็จ');
    return data;
}

// ครอบงาน async เพื่อให้ข้อผิดพลาดทุกจุดแสดงบนหน้าเว็บ
async function run(task) {
    status.textContent = '';
    try {
        await task();
    } catch (error) {
        status.textContent = error.message;
    }
}

// ใช้ textContent เพื่อให้ข้อความจากผู้ใช้แสดงเป็นข้อความธรรมดาเสมอ
function button(label, onClick) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click', () => run(onClick));
    return element;
}

function resetBook() {
    editingBookId = null;
    bookForm.reset();
    document.querySelector('#formTitle').textContent = 'เพิ่มหนังสือ';
}

function resetCategory() {
    editingCategoryId = null;
    categoryForm.reset();
}

// โหลดทั้งสองรายการใหม่หลังบันทึก เพื่อให้ชื่อหมวดหมู่ในหนังสือตรงกัน
async function refresh() {
    const [categories, books] = await Promise.all([
        request('/api/categories'), request('/api/books')
    ]);
    const list = document.querySelector('#categories');
    const select = bookForm.elements.category_id;
    const selected = select.value;
    list.replaceChildren();
    select.replaceChildren(new Option('เลือกหมวดหมู่', ''));
    for (const category of categories) {
        select.add(new Option(category.name, category.id));
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = category.name;
        item.append(name, button('แก้ไข', () => {
            editingCategoryId = category.id;
            categoryForm.elements.name.value = category.name;
            categoryForm.elements.name.focus();
        }), button('ลบ', async () => {
            if (!confirm(`ลบหมวดหมู่ ${category.name}?`)) return;
            await request(`/api/categories/${category.id}`, { method: 'DELETE' });
            if (editingCategoryId === category.id) resetCategory();
            await refresh();
        }));
        list.append(item);
    }
    select.value = selected;
    const container = document.querySelector('#books');
    container.replaceChildren();
    if (!books.length) container.textContent = 'ยังไม่มีหนังสือ';
    for (const book of books) {
        const card = document.createElement('article');
        if (book.cover) {
            const image = document.createElement('img');
            image.src = `/uploads/${encodeURIComponent(book.cover)}`;
            image.alt = `ปก ${book.title}`;
            card.append(image);
        }
        const title = document.createElement('h3');
        title.textContent = book.title;
        const detail = document.createElement('p');
        detail.textContent = `${book.author} · ${book.category_name} · ${Number(book.price).toFixed(2)} บาท`;
        card.append(title, detail, button('แก้ไข', () => {
            resetBook(); // ล้างไฟล์ที่เคยเลือก เพื่อไม่ส่งปกของหนังสือเล่มอื่น
            editingBookId = book.id;
            for (const field of ['title', 'author', 'price', 'category_id']) {
                bookForm.elements[field].value = book[field];
            }
            document.querySelector('#formTitle').textContent = `แก้ไขหนังสือ #${book.id}`;
            bookForm.elements.title.focus();
        }), button('ลบ', async () => {
            if (!confirm(`ลบหนังสือ ${book.title}?`)) return;
            await request(`/api/books/${book.id}`, { method: 'DELETE' });
            if (editingBookId === book.id) resetBook();
            await refresh();
        }));
        container.append(card);
    }
}

categoryForm.addEventListener('submit', event => {
    event.preventDefault(); // ป้องกันเบราว์เซอร์เปลี่ยนหน้าเมื่อกดบันทึก
    run(async () => {
        const url = editingCategoryId ? `/api/categories/${editingCategoryId}` : '/api/categories';
        await request(url, {
            method: editingCategoryId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: categoryForm.elements.name.value })
        });
        resetCategory();
        await refresh();
        status.textContent = 'บันทึกหมวดหมู่แล้ว';
    });
});

bookForm.addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
        // FormData ส่งข้อความและไฟล์พร้อมกันแบบ multipart/form-data
        // ให้เบราว์เซอร์ตั้ง Content-Type พร้อม boundary ให้เอง
        const data = new FormData(bookForm);
        if (!bookForm.elements.cover.files.length) data.delete('cover');
        const url = editingBookId ? `/api/books/${editingBookId}` : '/api/books';
        await request(url, { method: editingBookId ? 'PUT' : 'POST', body: data });
        resetBook();
        await refresh();
        status.textContent = 'บันทึกหนังสือแล้ว';
    });
});

document.querySelector('#cancelBook').addEventListener('click', resetBook);
document.querySelector('#cancelCategory').addEventListener('click', resetCategory);
run(refresh); // โหลดข้อมูลครั้งแรกเมื่อเปิดหน้าเว็บ
