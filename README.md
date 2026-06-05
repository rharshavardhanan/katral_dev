# Kattral Academy

A learning management platform with live video classrooms. Teachers create
classrooms and sessions; students join with an invite code and attend live
sessions with real-time video, screen sharing, and chat.

## Tech stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, Tailwind CSS     |
| Backend    | .NET 8 (ASP.NET Core Web API)                        |
| Database   | MongoDB 8                                            |
| Auth       | NextAuth (Google OAuth) + JWT issued by the backend |
| Live video | LiveKit Cloud                                        |
| Storage    | Supabase (uploaded documents)                        |

## Repository layout

```
.
├── backend/
│   └── EduPlatform.Api/        # .NET 8 Web API (controllers, services, models)
├── frontend/
│   └── edu-web/                # Next.js application
├── docs/                       # Architecture notes and design references
├── docker-compose.yml          # MongoDB service
├── start.sh                    # Run the whole stack locally
├── share.sh                    # Run locally and expose the frontend via ngrok
└── ngrok.yml                   # ngrok tunnel config (used by share.sh)
```

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download) — `dotnet --version`
- [Node.js 20+](https://nodejs.org) and npm — `node --version`
- [Docker](https://www.docker.com) (for MongoDB). On macOS, [Colima](https://github.com/abiosoft/colima) works too.
- A [LiveKit Cloud](https://cloud.livekit.io) project (API key, secret, and URL)
- Optional: a Google OAuth client and a Supabase project

## Configuration

Secrets are never committed. Copy the templates and fill in your own values.

### Backend

```bash
cp backend/EduPlatform.Api/appsettings.json.example backend/EduPlatform.Api/appsettings.json
```

Then edit `backend/EduPlatform.Api/appsettings.json`:

| Key                        | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `MongoDB:ConnectionString` | `mongodb://localhost:27017` for local Docker    |
| `MongoDB:DatabaseName`     | Database name (e.g. `kattral_academy`)          |
| `Jwt:Secret`               | Random string, at least 32 characters           |
| `LiveKit:ApiKey`           | From your LiveKit Cloud project                 |
| `LiveKit:ApiSecret`        | From your LiveKit Cloud project                 |
| `LiveKit:Url`              | `wss://<your-project>.livekit.cloud`            |
| `Google:ClientId`          | Google OAuth client ID (optional)               |

### Frontend

```bash
cp .env.example frontend/edu-web/.env.local
```

Then edit `frontend/edu-web/.env.local`:

| Variable                          | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `LIVEKIT_API_KEY`                 | Same key as the backend                           |
| `LIVEKIT_API_SECRET`              | Same secret as the backend                        |
| `NEXT_PUBLIC_LIVEKIT_URL`         | `wss://<your-project>.livekit.cloud`              |
| `NEXTAUTH_SECRET`                 | Random string (e.g. `openssl rand -base64 32`)    |
| `NEXTAUTH_URL`                    | `http://localhost:3000` for local development     |
| `GOOGLE_CLIENT_ID`                | Google OAuth client ID (optional)                 |
| `GOOGLE_CLIENT_SECRET`            | Google OAuth client secret (optional)             |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL (optional, for uploads)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon key (optional, for uploads)         |

The frontend reaches the backend through Next.js rewrites (`/api/*` is proxied
to `http://localhost:5261`), so no separate API URL is required for local runs.

## Running locally

After configuring both files above:

```bash
./start.sh
```

This starts MongoDB (via Docker), the .NET backend, and the Next.js dev server,
then prints the URLs. Press `Ctrl+C` to stop everything.

| Service  | URL                       |
| -------- | ------------------------- |
| Frontend | http://localhost:3000     |
| Backend  | http://localhost:5261     |
| MongoDB  | mongodb://localhost:27017 |

Logs are written to `/tmp/backend-dev.log` and `/tmp/frontend-dev.log`.

### Running the services manually

If you prefer separate terminals instead of `start.sh`:

```bash
# 1. MongoDB
docker compose up -d

# 2. Backend (http://localhost:5261)
cd backend/EduPlatform.Api
dotnet run

# 3. Frontend (http://localhost:3000)
cd frontend/edu-web
npm install
npm run dev
```

## Sharing for external testing

`share.sh` runs the stack and exposes the frontend through an ngrok tunnel so
others can reach it. It requires [ngrok](https://ngrok.com) to be installed and
authenticated, and the public URL must be added to your Google OAuth client's
authorized origins and redirect URIs.

```bash
./share.sh
```

## Running tests

```bash
cd backend/EduPlatform.Api.Tests
dotnet test
```

## Trying the app

1. Open http://localhost:3000 and sign in.
2. Choose the teacher role, create a classroom, and copy its invite code.
3. Create a session and start it to enter the live room.
4. In another browser or profile, sign in as a student and join with the invite code.
