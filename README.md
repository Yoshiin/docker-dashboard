# Docker Dashboard

A lightweight Docker container monitoring dashboard built with Hono, HTMX, Alpine.js, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 24+
- Docker (socket access required)

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:Yoshiin/docker-dashboard.git
   cd docker-dashboard
   ```

2. Install dependencies:
   ```bash
   yarn
   ```

3. Configure environment variables (optional):
   Rename `.env.example` to `.env` and edit it:
   ```env
   ADMIN_USER=admin
   ADMIN_PASSWORD=admin
   REFRESH_TIME=10
   CACHE_TIME=30
   ```

4. Run the dashboard:

#### Development
```bash
yarn dev
```

#### Production
Build the vendor/style files and start the server:
```bash
yarn build
yarn start
```

5. Access via `http://localhost:3000`. Default login is `admin` / `admin` or ones defined in `.env`.

## Configuration

Settings can be managed directly in the dashboard:
- **Refresh Interval**: How often the dashboard polls for container status in seconds.
- **Update Cache**: Lifespan of the image update check cache in minutes.

## Stack Support
The dashboard automatically groups containers by their Docker Compose project name using the `com.docker.compose.project` label. Containers without this label are grouped under "Standalone".

## Tech Stack
- **Backend**: [Hono](https://hono.dev/) on Node.js
- **Frontend**: [HTMX](https://htmx.org/), [Alpine.js](https://alpinejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3))
- **Docker**: [Dockerode](https://github.com/apocas/dockerode)
