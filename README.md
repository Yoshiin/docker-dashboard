
# 🐳 Docker Dashboard

[![GitHub Release](https://img.shields.io/github/v/release/Yoshiin/docker-dashboard?style=flat-square&color=blue)](https://github.com/Yoshiin/docker-dashboard/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/yoshin/docker-dashboard?style=flat-square&color=emerald)](https://hub.docker.com/r/yoshin/docker-dashboard)
[![License](https://img.shields.io/github/license/Yoshiin/docker-dashboard?style=flat-square&color=orange)](LICENSE)

A lightweight, modern Docker container monitoring dashboard. No heavy frameworks, just speed and simplicity.

![Dashboard Screenshot](https://raw.githubusercontent.com/Yoshiin/docker-dashboard/main/assets/screenshot.png)

## ✨ Features

- 🚀 **Real-time Monitoring**: Powered by HTMX for smooth, partial page updates.
- 📦 **Stack Grouping**: Automatically groups containers by Docker Compose projects.
- 🔒 **Secure**: Simple environment-based authentication.
- 🪶 **Lightweight**: Minimal footprint, running on Hono and SQLite.

---

## 🚀 Quick Start

### Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
services:
  docker-dashboard:
    image: yoshin/docker-dashboard:latest
    container_name: docker-dashboard
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - data:/app/data
    environment:
      - ADMIN_USER=admin
      - ADMIN_PASSWORD=admin
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s

volumes:
  data:
```

Then run:

```bash
docker compose up -d
```

### Docker CLI

```bash
docker run -d \
  --name docker-dashboard \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v docker_dashboard_data:/app/data \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=admin \
  yoshin/docker-dashboard:latest
```

---


## 🛠️ Local Development

### Prerequisites

* **Node.js 24+**
* **Docker** (socket access required)

### Setup

1. **Clone & Install**
```bash
git clone git@github.com:Yoshiin/docker-dashboard.git
cd docker-dashboard
yarn
```


2. **Configuration**
Copy `.env.example` to `.env` and adjust your settings:
```env
ADMIN_USER=admin
ADMIN_PASSWORD=admin
REFRESH_TIME=60  # Dashboard poll interval (seconds)
CACHE_TIME=30    # Image update check cache (minutes)
```


3. **Launch**
* **Dev**: `yarn dev` (with hot-reload)
* **Prod**: `yarn build && yarn start`


---

## ⚙️ How it works

* **Backend**: [Hono](https://hono.dev/) framework for ultra-fast routing.
* **Frontend**: [HTMX](https://htmx.org/) for AJAX-like behavior without JavaScript complexity, [Alpine.js](https://alpinejs.dev/) for reactive UI components.
* **Data**: [Dockerode](https://github.com/apocas/dockerode) for Docker API interaction and SQLite for settings persistence.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.
