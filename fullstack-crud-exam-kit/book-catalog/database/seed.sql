INSERT INTO categories (name) VALUES ('Programming'), ('Literature') ON CONFLICT (name) DO NOTHING;
INSERT INTO books (title, author, price, category_id)
SELECT 'Learning JavaScript', 'Exam Practice', 299, id FROM categories
WHERE name = 'Programming' AND NOT EXISTS (SELECT 1 FROM books WHERE title = 'Learning JavaScript');
