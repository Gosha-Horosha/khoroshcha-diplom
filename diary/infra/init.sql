-- Initialize database with sample data (optional)

-- Create admin user (password: admin123)
INSERT INTO users (username, email, hashed_password, is_active, created_at) 
VALUES (
    'admin', 
    'admin@diaryapp.com', 
    '$2b$12$LQv3c1yqBWVHrnG6sWz8u.SsKZJY4Vj8c8cB8mR6fL5aN9dK7lL1C', -- bcrypt hash for 'admin123'
    true, 
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- Grant admin permissions to admin user
INSERT INTO permissions (user_id, permission_type, granted_at)
VALUES (
    (SELECT id FROM users WHERE username = 'admin'),
    'admin',
    NOW()
) ON CONFLICT DO NOTHING;

-- Create sample diary entries for admin
INSERT INTO diary_entries (title, content, user_id, is_public, created_at)
VALUES 
    (
        'Welcome to Diary App',
        'This is your first diary entry. You can write about your thoughts, experiences, and anything that matters to you.',
        (SELECT id FROM users WHERE username = 'admin'),
        true,
        NOW()
    ),
    (
        'Private thoughts',
        'This entry is private and only visible to you.',
        (SELECT id FROM users WHERE username = 'admin'),
        false,
        NOW()
    )
ON CONFLICT DO NOTHING;