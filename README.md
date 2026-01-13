# QueenB X AppsFlyer - BeSafe Hackathon 2026

**BeSafe** is an interactive 3D educational cybersecurity game designed to teach digital safety and online security concepts to younger audiences through engaging gameplay. Players control a customizable robot avatar in a vibrant cyberpunk world and complete missions that teach password security, privacy protection, and general digital safety.

## Features

### Educational Mini-Games

- **Password Room**: Learn password strength principles by evaluating passwords as strong or weak. Players review 10 random passwords and earn a "Golden Key" badge for mastery
- **Privacy Room**: Understand personal data privacy through AI-powered doll generation. The game uses DALL-E to visualize consequences of sharing personal information publicly
- **Strength Room**: Test cybersecurity knowledge with an interactive quiz featuring gesture-based controls
- **Shop Room**: Spend earned coins on robot cosmetics and upgrades with 3D preview
- **Clothing Room**: Customize your robot avatar with different appearance options

### Game Mechanics

- **3D Lobby World**: Interactive cyberpunk-themed 3D environment built with Three.js
- **Progression System**: Earn score points, coins, and energy as you complete challenges
- **Badge System**: Unlock achievements like "Golden Key" and "Privacy Shield"
- **Mission System**: Story-driven missions with specific objectives
- **Multiple Input Methods**: Keyboard controls (WASD/Arrow keys) and hand gesture recognition via MediaPipe

### Authentication

- Google OAuth login
- Ministry of Education authentication option
- Session persistence with profile pictures

## Technology Stack

### Frontend

- React 19 with Vite
- Three.js & @react-three/fiber for 3D rendering
- @react-three/drei and @react-three/postprocessing for visual effects (Bloom, GodRays)
- @mediapipe/hands for hand gesture recognition
- @react-oauth/google for authentication
- React Router for navigation
- Axios for API communication

### Backend

- Node.js with Express.js 5
- MySQL database for data persistence
- OpenAI SDK for DALL-E image generation
- CORS for cross-origin requests

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/en) version 20.x or higher (latest LTS recommended)
- npm version 10.x or higher
- MySQL database server

### Clone the Repository

1. Clone the repository to your local machine:
   ```bash
   git clone <repository-url>
   cd hakathon
   ```

### Database Setup

1. Install and start MySQL on your machine
2. Create a new database for the project:
   ```sql
   CREATE DATABASE besafe_db;
   ```
3. Create the required tables by running the SQL schema (check `db/` folder for schema files)

Required tables:
- `users` - stores user accounts, scores, coins, energy, robot customization
- `passwords` - stores password examples for the Password Room mini-game
- `dolls` - stores AI-generated dolls from the Privacy Room

### Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install server dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `server` directory with the following variables:
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:5173
   OPENAI_API_KEY=your_openai_api_key_here
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=besafe_db
   ```

   **Important**: You need a valid OpenAI API key for the Privacy Room doll generation feature to work

### Client Setup

1. Navigate to the client directory:
   ```bash
   cd ../client
   ```

2. Install client dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `client` directory:
   ```env
   VITE_SERVER_API_URL=http://localhost:5000
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ```

## Usage

### Start the Server

1. Open a terminal in the server directory:
   ```bash
   cd server
   npm run dev
   ```

   The server will run on `http://localhost:5000` by default

### Run the Client

1. Open a new terminal in the client directory:
   ```bash
   cd client
   npm run dev
   ```

   The client will run on `http://localhost:5173` by default
   A browser window should open automatically

### Playing the Game

1. **Login**: Use Google OAuth to sign in or create a new account
2. **Lobby**: Explore the 3D cyberpunk world using WASD or arrow keys
3. **Enter Rooms**: Approach room entrances to receive proximity notifications, then enter to play mini-games
4. **Complete Challenges**:
   - Password Room: Classify 10 passwords as strong or weak
   - Privacy Room: Create dolls and learn about privacy settings
   - Strength Room: Answer cybersecurity quiz questions
5. **Earn Rewards**: Gain points, coins, and badges
6. **Customize**: Visit the Shop to purchase robot cosmetics with your earned coins

### Controls

- **WASD** or **Arrow Keys**: Move robot
- **Space**: Jump
- **Hand Gestures**: Alternative control method (requires webcam)
  - Forward gesture: Move forward
  - Back gesture: Move backward
  - Left/Right gestures: Turn
  - "I love you" gesture: Exit

### Stopping the Application

- **Stop the Express Server**: In the server terminal, press `Ctrl + C`
- **Stop the React Client**: In the client terminal, press `Ctrl + C`

## Project Structure

### Client Directory (`client/`)

```
client/
├── src/
│   ├── game/                    # Main game components
│   │   ├── GameShell.jsx        # Game container
│   │   ├── MainGameContainer.jsx # Scene router
│   │   └── scenes/              # Individual rooms
│   │       ├── Lobby.jsx
│   │       ├── PasswordRoom.jsx
│   │       ├── PrivacyRoom.jsx
│   │       ├── ShopRoom.jsx
│   │       ├── StrengthRoom.jsx
│   │       └── ClothingRoom.jsx
│   ├── mission/                 # Mission system
│   │   └── Mission1Page.jsx
│   ├── features/
│   │   ├── robot/               # Robot 3D models
│   │   └── world/               # 3D world environments
│   │       ├── ThreeDemo.jsx
│   │       ├── CyberpunkWorld.jsx
│   │       └── ForestWorld.jsx
│   ├── context/
│   │   └── GameContext.jsx      # Global game state
│   ├── pages/
│   │   └── Login.jsx            # Login page
│   ├── hooks/                   # Custom hooks (useKeyboard, useSound, etc.)
│   ├── components/              # Reusable UI components
│   ├── styles/                  # CSS modules
│   ├── App.jsx                  # Root component
│   └── index.jsx                # Entry point
└── package.json
```

### Server Directory (`server/`)

```
server/
├── server.js                    # Main server file with all API endpoints
├── db/
│   └── db.js                    # MySQL connection pool
├── routes/                      # Route files (legacy)
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login or create new user
- `GET /api/users/:userId` - Get user data

### User Management
- `POST /api/user/update-points-coins` - Update user score, coins, and energy

### Password Game
- `GET /api/passwords/random/:count` - Get random passwords for evaluation
- `POST /api/passwords/check` - Check if password strength answer is correct

### Privacy/Doll Generation
- `POST /api/dolls/generate` - Generate AI doll with DALL-E
- `GET /api/dolls/:userId` - Get user's doll collection
- `DELETE /api/dolls/:id` - Delete a doll

### Shop
- `POST /api/shop/buy-robot` - Purchase robot with coins
- `POST /api/shop/select-robot` - Equip owned robot
- `GET /api/shop/robots/:userId` - Get user's robot collection

## Configuration

### Environment Variables

#### Server (`.env`)
- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `OPENAI_API_KEY` - OpenAI API key for DALL-E image generation
- `DB_HOST` - MySQL host
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - MySQL database name

#### Client (`.env`)
- `VITE_SERVER_API_URL` - Backend API URL (default: http://localhost:5000)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

## Troubleshooting

### Database Issues
- Ensure MySQL is running on your machine
- Verify database credentials in server `.env` file
- Check that all required tables are created with correct schema

### OpenAI API Issues
- If DALL-E fails, the app will use placeholder images
- Verify your OpenAI API key is valid and has credits
- Check console logs for specific error messages

### Server Issues
- Ensure no other application is using port 5000
- Check server console for error messages
- Verify all environment variables are set correctly

### Client Issues
- Check browser console (F12) for errors
- Verify the client can connect to the server API
- Ensure port 5173 is available

### 3D Performance Issues
- The game requires a modern GPU for smooth 3D rendering
- Try reducing browser window size
- Close other tabs/applications to free up resources

## Best Practices & Teamwork

For team collaboration guidelines, see [BestPractices.md](BestPractices.md)

## Support

For any issues, please:
- Open an issue on the GitHub repository
- Contact via [mail](mailto:queenb.community@gmail.com)

## License

This project was created for the QueenB X AppsFlyer - BeSafe Hackathon 2026

**Happy Coding!**
