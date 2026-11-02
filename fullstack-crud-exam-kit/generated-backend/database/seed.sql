INSERT INTO categories (name) VALUES ('Programming'), ('Literature'), ('Science') ON CONFLICT (name) DO NOTHING;

INSERT INTO books (title, author, price, category_id)
SELECT 'Learning JavaScript', 'Exam Practice', 299.00, id FROM categories
WHERE name = 'Programming' AND NOT EXISTS (SELECT 1 FROM books WHERE title = 'Learning JavaScript');

INSERT INTO books (title, author, price, category_id)
SELECT 'Clean Code', 'Robert C. Martin', 450.00, id FROM categories
WHERE name = 'Programming' AND NOT EXISTS (SELECT 1 FROM books WHERE title = 'Clean Code');

INSERT INTO books (title, author, price, category_id)
SELECT 'The Great Gatsby', 'F. Scott Fitzgerald', 199.00, id FROM categories
WHERE name = 'Literature' AND NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Great Gatsby');
