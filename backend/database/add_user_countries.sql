-- Add user_countries table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_countries (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, country_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_countries_user_id ON user_countries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_countries_country_id ON user_countries(country_id);