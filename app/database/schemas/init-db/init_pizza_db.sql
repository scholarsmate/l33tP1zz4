-- app/schemas/init-db/init_pizza_db.sql

-- Create Pizza Sizes Table
CREATE TABLE IF NOT EXISTS pizza_sizes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(5,2) NOT NULL
);

-- Create Pizza Styles Table
CREATE TABLE IF NOT EXISTS pizza_styles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(5,2) NOT NULL
);

-- Create Toppings Table
CREATE TABLE IF NOT EXISTS toppings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(5,2) NOT NULL
);

-- Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    order_name VARCHAR(100),
    phone_number VARCHAR(20),
    size_id INTEGER REFERENCES pizza_sizes(id),
    style_id INTEGER REFERENCES pizza_styles(id),
    total_price DECIMAL(7,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Toppings Junction Table
CREATE TABLE IF NOT EXISTS order_toppings (
    order_id INTEGER REFERENCES orders(order_id),
    topping_id INTEGER REFERENCES toppings(id),
    PRIMARY KEY (order_id, topping_id)
);

-- Insert initial data into Pizza Sizes
INSERT INTO pizza_sizes (name, price) VALUES
('Small', 8.00),
('Medium', 12.00),
('Large', 15.00);

-- Insert initial data into Pizza Styles
INSERT INTO pizza_styles (name, price) VALUES
('Thin Crust', 0.00),
('Hand Tossed', 1.00),
('Deep Dish', 2.00);

-- Insert initial data into Toppings
INSERT INTO toppings (name, price) VALUES
('Pepperoni', 1.50),
('Sausage', 1.50),
('Onions', 1.00),
('Green Peppers', 1.00),
('Black Olives', 1.00),
('Ham', 1.50),
('Pineapple', 1.00),
('Bacon', 1.50),
('Mushrooms', 1.50);
