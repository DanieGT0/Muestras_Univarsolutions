-- Sample data for testing

-- Insert countries
INSERT INTO countries (cod, name) VALUES
('US', 'United States'),
('CO', 'Colombia'),
('MX', 'Mexico'),
('BR', 'Brazil'),
('PE', 'Peru');

-- Insert categories
INSERT INTO categories (cod, name) VALUES
('A', 'Category A'),
('B', 'Category B'),
('C', 'Category C');

-- Insert warehouses
INSERT INTO warehouses (cod, name) VALUES
('W001', 'Main Warehouse'),
('W002', 'Secondary Warehouse'),
('W003', 'Cold Storage');

-- Insert locations
INSERT INTO locations (cod, name) VALUES
('L001', 'Location A1'),
('L002', 'Location A2'),
('L003', 'Location B1');

-- Insert suppliers
INSERT INTO suppliers (cod, name) VALUES
('S001', 'Supplier Alpha'),
('S002', 'Supplier Beta'),
('S003', 'Supplier Gamma');

-- Insert responsibles
INSERT INTO responsibles (cod, name) VALUES
('R001', 'John Smith'),
('R002', 'Maria Garcia'),
('R003', 'Carlos Rodriguez');

-- Insert default admin user (password: admin123)
INSERT INTO users (email, full_name, hashed_password, role) VALUES
('admin@sample.com', 'System Administrator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYooBY1fzP3oY.y', 'ADMIN');

-- Insert test user (password: user123)
INSERT INTO users (email, full_name, hashed_password, role) VALUES
('user@sample.com', 'Test User', '$2a$12$EWBNYDQmI3fYN4v8sjO7hOJzZeGE4HfNq1mBBZaRcPzq9lLOWW/Ba', 'USER');