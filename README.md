# SafeForest - Cybersecurity Education Game
## QueenB X AppsFlyer - BeSafe Hackathon 2026

**SafeForest** 
is an interactive 3D educational cybersecurity game designed to teach digital safety and online security concepts through engaging gameplay. 
Players navigate through educational "rooms" in a vibrant 3D world while learning about password security, privacy protection, and digital safety. 
The game features customizable robot avatars, hand gesture controls, AI-generated companions, and a comprehensive progression system with points, coins, and badges.

## Features

### Educational Rooms & Features

- **Entry Point**: Welcome screen introducing players to the game
- **Lobby**: Central hub with doors to different educational rooms, featuring robot navigation
- **Password Room**: Interactive password security education with 3D graphics and hand tracking support
- **Privacy Room**: Learn about data privacy through AI-powered doll generation
  - Uses OpenAI DALL-E 3 for realistic visualizations (with Pollinations.ai fallback)
  - Demonstrates consequences of sharing personal information
- **Strength Room**: Password strength testing and cybersecurity challenges
- **Shop Room**: Purchase robot companions and items using earned coins
- **Try Again Screen**: Game over screen when energy reaches zero, with option to restart

### Game Mechanics

- **3D Environments**: Immersive worlds built with Three.js including:
  - Cyberpunk-themed environments
  - Forest world
  - Manhattan Street scenes
- **Progression System**:
  - **Score**: Earn points through correct answers and challenges
  - **Coins**: Starting balance of 50 coins, earn more through gameplay
  - **Energy**: Start with 100 energy, lose 10 per mistake, reach 0 for game over
  - Exchange rate: 2 points = 1 coin
- **Badge System**: Unlock achievements by completing challenges
- **Robot Companions**: Purchase and collect different robot types with unique animations
- **Scene Navigation**: Seamless transitions between different game rooms
- **State Management**: React Context API manages global game state and user session
- **Session Persistence**: User data saved to MySQL and synced via localStorage
- **Multiple Input Methods**:
  - Keyboard controls (WASD/Arrow keys)
  - Hand gesture recognition via MediaPipe Hands

### Authentication & User Management

- **Google OAuth 2.0**: Secure authentication via `@react-oauth/google`
- **Automatic Account Creation**: New users created on first login with default values
  - Score: 0
  - Coins: 50
  - Energy: 100
- **Session Persistence**: User data stored in localStorage and synced with MySQL
- **Profile Management**: User profiles with customizable robots and statistics

## Technology Stack

### Frontend

- **React 19** with **Vite** for fast development and optimized builds
- **Three.js** & **@react-three/fiber** for 3D rendering and graphics
- **@react-three/drei** and **@react-three/postprocessing** for visual effects (Bloom, GodRays)
- **@mediapipe/hands** for real-time hand gesture recognition
- **@react-oauth/google** for Google OAuth authentication
- **React Router** for client-side navigation
- **Axios** for HTTP requests and API communication
- **React Context API** for global state management

### Backend

- **Node.js** with **Express.js 5** for REST API
- **MySQL** database with connection pooling via `mysql2/promise`
- **Layered Architecture**:
  - Routes layer for endpoint definitions
  - Controllers for request/response handling
  - Services for business logic
  - Models for data structures
  - Middleware for authentication and error handling
- **OpenAI SDK** for DALL-E 3 image generation (with free Pollinations.ai fallback)
- **CORS** configured for cross-origin requests from frontend
- **Environment-based Configuration** via dotenv

### Database

- **MySQL** for relational data storage
- Tables: `users`, `dolls`
- Connection pool management for optimal performance
- Foreign key relationships for data integrity

## Architecture Overview

### Client Architecture

The client follows a component-based architecture with centralized state management:

- **GameContext** (`context/GameContext.jsx`): Central state hub managing:
  - User authentication and session
  - Game progression (score, coins, energy)
  - Badges and inventory
  - Scene navigation and transitions
  - Robot collection and shop items

- **Scene System**: Defined in `SCENES` object with routes for:
  - Entry point, Lobby, Password Room, Privacy Room, Shop Room, Strength Room, Try Again

- **API Layer**: Organized API modules in `client/src/api/`:
  - `axiosInstance.js`: Centralized HTTP client
  - `userApi.js`, `gameApi.js`, `shopApi.js`, `dollApi.js`: Feature-specific API calls

### Server Architecture

The server follows a **layered MVC-style architecture**:

1. **Routes Layer** (`routes/`): Define API endpoints and route to controllers
2. **Controllers Layer** (`controllers/`): Handle HTTP requests/responses, validation
3. **Services Layer** (`services/`): Business logic and database operations
4. **Models Layer** (`models/`): Data structures and schemas
5. **Middleware Layer** (`middlewares/`): Authentication, error handling
6. **Utils Layer** (`utils/`): Helper functions and utilities

### Data Flow

```
Client Component → API Call (axios) → Server Route → Controller → Service → Database
                                                                      ↓
Client State Update ← Response ← Response Handler ← Business Logic ←
```

### Key Patterns

- **State Management**: React Context for global state, localStorage for persistence
- **Authentication Flow**: Google OAuth → Check user in DB → Create if new → Return user data
- **Error Handling**: Centralized error handler middleware in server
- **Energy System**: Decrements on mistakes, triggers game over at 0
- **Point Economy**: 2 points = 1 coin exchange rate

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
2. Run the initialization script to create the database and tables:
   ```bash
   mysql -u your_username -p < db/init_db.sql
   ```
   This creates the `ai_factory` database with the following tables:
   - `users` - stores user accounts, scores, coins, energy, robot customization
   - `dolls` - stores AI-generated dolls from the Privacy Room

Alternatively, you can manually create the database and run the SQL:
```sql
mysql -u your_username -p
source db/init_db.sql
```

### Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install server dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `server` directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your configuration:
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:5173
   OPENAI_API_KEY=your_openai_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=ai_factory
   ```

   **Important**:
   - OpenAI API key is optional - the app will use Pollinations.ai as a free fallback for doll generation
   - Gemini API key is optional for AI features

### Client Setup

1. Navigate to the client directory:
   ```bash
   cd ../client
   ```

2. Install client dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `client` directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file:
   ```env
   VITE_SERVER_API_URL=http://localhost:5000
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ```

   **Note**: Get your Google OAuth Client ID from the [Google Cloud Console](https://console.cloud.google.com/)

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

1. **Login**: Use Google OAuth to sign in (creates new account automatically on first login)
2. **Entry Point**: Start your journey from the initial entry screen
3. **Lobby**: Explore the 3D cyberpunk/forest world using WASD or arrow keys
4. **Navigate**: Use your robot companion to navigate between different rooms
5. **Complete Challenges**:
   - **Password Room**: Learn about password security and strength
   - **Privacy Room**: Generate AI dolls and learn about data privacy
   - **Strength Room**: Test your cybersecurity knowledge
6. **Earn Rewards**:
   - Gain score points for correct answers
   - Earn coins (50 starting coins, more available through gameplay)
   - Unlock badges for achievements
   - Energy system: Start with 100 energy, lose 10 per mistake, game over at 0
7. **Manage Resources**: Exchange points for coins (2 points = 1 coin)
8. **Shop**: Purchase robot companions and items with your earned coins

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
├── server.js                    # Main Express server entry point
├── routes/                      # API route definitions
│   ├── user.js
│   ├── game.js
│   ├── shop.js
│   ├── doll.js
│   └── dolls.js
├── controllers/                 # Request/response handling
│   ├── userController.js
│   ├── gameController.js
│   ├── shopController.js
│   └── dollsController.js
├── services/                    # Business logic layer
│   ├── authService.js
│   ├── userService.js
│   ├── gameService.js
│   ├── shopService.js
│   ├── statsService.js
│   └── dollsService.js
├── models/                      # Data models
│   ├── Doll.js
│   └── robotModel.js
├── middlewares/                 # Express middleware
│   ├── authMiddleware.js
│   └── errorHandler.js
├── utils/                       # Utility functions
│   ├── authUtils.js
│   └── textUtils.js
├── config/                      # Configuration files
└── package.json
```

### Database Directory (`db/`)

```
db/
├── db.js                        # MySQL connection pool configuration
├── init_db.sql                  # Database schema initialization
└── package.json
```

## API Endpoints

The server follows a RESTful API design with routes organized by feature:

### Authentication (`/api/auth/*`)
- `POST /api/auth/login` - Google OAuth login (creates new user if doesn't exist)
  - Request: `{ email, username, profilePic }`
  - Response: User object with id, email, username, score, coins, energy

### User Management (`/api/user/*`, `/api/users/*`)
- `GET /api/users/:userId` - Get user data by ID
- `POST /api/user/update-points-coins` - Update user score, coins, and energy
- Additional user endpoints handled by userController

### Game Features (`/api/game/*`)
- Game-related endpoints for challenges and progression
- Handled by gameController and gameService

### Doll Generation (`/api/dolls/*`)
- `POST /api/dolls/generate` - Generate AI doll using DALL-E 3 or Pollinations.ai fallback
  - Request: `{ userId, name, description, isGood }`
  - Response: Generated doll with image URL
- `GET /api/dolls/:userId` - Get user's doll collection
- `DELETE /api/dolls/:id` - Delete a doll by ID

### Shop (`/api/shop/*`)
- `POST /api/shop/buy-robot` - Purchase robot companion with coins
- `POST /api/shop/select-robot` - Equip owned robot as active
- `GET /api/shop/robots/:userId` - Get user's robot collection and owned items

## Configuration

### Environment Variables

#### Server (`.env`)
- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `OPENAI_API_KEY` - OpenAI API key for DALL-E 3 doll generation (optional, uses free fallback if not provided)
- `GEMINI_API_KEY` - Google Gemini API key for AI features (optional)
- `DB_HOST` - MySQL host (default: localhost)
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - MySQL database name (default: ai_factory)

#### Client (`.env`)
- `VITE_SERVER_API_URL` - Backend API URL (default: http://localhost:5000)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

## Troubleshooting

### Database Issues
- Ensure MySQL is running on your machine
- Verify database credentials in server `.env` file
- Check that all required tables are created with correct schema

### AI Doll Generation Issues
- If OpenAI DALL-E fails or no API key is provided, the app automatically uses Pollinations.ai as a free fallback
- To use DALL-E 3: Set `OPENAI_API_KEY` in server `.env` file
- Verify your OpenAI API key is valid and has credits if using OpenAI
- Check server console logs for specific error messages
- Fallback service (Pollinations.ai) requires no API key and works out of the box

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

## Important Notes & Gotchas

### Port Configuration
- **Client runs on port 5173** (Vite default), NOT port 3000
- Server `CLIENT_URL` in `.env` must be `http://localhost:5173`
- Server CORS is hardcoded to `http://localhost:5173` in `server.js`
- Update both if changing client port

### Database
- Database name is `ai_factory`, not `besafe_db`
- Connection configured in `db/db.js` which references `../server/.env`
- Path is relative to the `db/` folder location

### Environment Files
- Both client and server need separate `.env` files
- Copy from `.env.example` files in each directory
- Never commit `.env` files to version control

### Scene Navigation
- Managed by GameContext via `SCENES` constants
- Use `switchRoom()` or `switchRoomWithRobot()` for transitions
- Current scene stored in `currentScene` state

### AI Features
- OpenAI DALL-E 3 is optional - free Pollinations.ai fallback is automatic
- Gemini API key is optional for additional AI features
- No API keys required for basic gameplay

### Code Comments
- Some code includes Hebrew comments (primarily in auth sections)
- Authentication and user management may have mixed language documentation

## Development Guidelines

### Adding New Features

Following the layered architecture:

1. **Database**: Design schema in MySQL (update `db/init_db.sql`)
2. **Server**:
   - Define routes in `routes/`
   - Create controller in `controllers/`
   - Implement business logic in `services/`
   - Add models if needed in `models/`
3. **Client**:
   - Create API functions in `client/src/api/`
   - Build components in `components/` or `pages/`
   - Update GameContext if needed for state
   - Add scene routes if creating new room
4. **Test**: Verify API integration, handle loading states and errors

### Best Practices & Teamwork

For detailed team collaboration guidelines, see [BestPractices.md](BestPractices.md)

## Resources

- **CLAUDE.md**: Detailed AI coding assistant instructions and project documentation
- **BestPractices.md**: Team collaboration and development guidelines
- **db/init_db.sql**: Database schema and initialization

## Project Status

This project is a fully functional cybersecurity education game with:
- ✅ Google OAuth authentication
- ✅ 3D game environments with Three.js
- ✅ Multiple educational rooms (Password, Privacy, Strength)
- ✅ AI-powered doll generation
- ✅ Robot companion system
- ✅ Point/coin economy with energy system
- ✅ Hand gesture controls via MediaPipe
- ✅ MySQL database persistence
- ✅ Layered server architecture

## Contributing

When contributing to this project:
1. Read [BestPractices.md](BestPractices.md) for team guidelines
2. Review [CLAUDE.md](CLAUDE.md) for architecture understanding
3. Follow the layered architecture patterns
4. Test both client and server changes
5. Ensure MySQL schema updates are reflected in `db/init_db.sql`
---
