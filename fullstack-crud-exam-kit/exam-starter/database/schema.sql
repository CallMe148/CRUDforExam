-- ใช้ ON DELETE RESTRICT และ CHECK price >= 0
CREATE TABLE IF NOT EXISTS categories (
 id SERIAL PRIMARY KEY,
 name VARCHAR(100) NOT NULL UNIQUE CHECK (length(trim(name)) > 0)
);
CREATE TABLE IF NOT EXISTS books (
 id SERIAL PRIMARY KEY,
 title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
 author VARCHAR(150) NOT NULL CHECK (length(trim(author)) > 0),
 price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
 category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
 cover VARCHAR(100)
);
