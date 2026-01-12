CREATE DATABASE IF NOT EXISTS ai_factory;
USE ai_factory;

CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  score INT DEFAULT 0,
  coins INT DEFAULT 100,
  energy INT DEFAULT 100, 
  robot_color VARCHAR(32) DEFAULT '#ff0000',
  owned_robots JSON DEFAULT '[]', 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  KEY idx_user_robots (id, coins) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dolls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(100),
  description TEXT,
  image_url VARCHAR(255),
  is_good BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);