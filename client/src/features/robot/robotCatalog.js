// Central robot catalog for shop and avatar rendering
export const ROBOT_CATALOG = [
  // Basic robots
  { id: 'basic_red', name: 'Neon Red', price: 50, type: 'basic', color: '#ff0044' },
  { id: 'basic_lime', name: 'Lime Strike', price: 50, type: 'basic', color: '#33ff00' },
  { id: 'basic_black', name: 'Night Black', price: 50, type: 'basic', color: '#7c2ae8' },
  // Luxury robots
  { id: 'gold_elite', name: 'Golden Sovereign', price: 500, type: 'luxury', color: '#ffd700', metalness: 1, roughness: 0.1 },
  { id: 'obsidian', name: 'Deep Obsidian', price: 600, type: 'luxury', color: '#050505', metalness: 0.8, roughness: 0.05 },
  { id: 'platinum', name: 'Platinum Prime', price: 700, type: 'luxury', color: '#e5e4e2', metalness: 0.95, roughness: 0.08 },
  { id: 'ruby', name: 'Ruby Spark', price: 650, type: 'luxury', color: '#c1004f', metalness: 0.7, roughness: 0.12 },
  // Special robot
  { id: 'cyber_mesh', name: 'Cyber Grid', price: 1200, type: 'special', color: '#00f2ff', wireframe: true },
];