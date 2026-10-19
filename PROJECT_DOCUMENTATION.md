# Shikshaarthi Project Documentation

This document describes the current Shikshaarthi project structure, frontend/backend communication, API routes, environment variables, local execution, VPS/domain deployment, and the changes made for `shikshaarthi.com`.

## 1. Project summary

Shikshaarthi is a React/Vite frontend with a Node.js/Express microservices backend for campus services:

- Authentication and user profiles
- Admin management
- Rental/PG listings
- Mess listings
- Medical services
- Plumber and electrician services
- Laundry services
- Rewards, submissions, coins, and notifications
- Razorpay subscription payments

Technology stack:

- Frontend: React 19, Vite, Axios, React Router
- Backend: Node.js, Express, REST APIs
- Database: MongoDB/Mongoose
- Gateway: `http-proxy-middleware`
- Authentication: JWT access and refresh tokens
- Payments: Razorpay
- Email: Nodemailer/SMTP
- Media: Cloudinary (Rewards service)
- Geocoding: LocationIQ
- Optional event infrastructure: Kafka

## 2. Repository structure

```text
shikshaarthi_v2/
├── Frontend/
│   ├── user-panel/       # Student-facing React/Vite application
│   └── admin-panel/      # Admin React/Vite application
├── Backend/
│   ├── api-gateway/      # Public API entry point and proxy
│   ├── auth-service/     # Authentication, users, admins, payments
│   ├── rewards-service/  # Rewards, submissions, coins, notifications
│   ├── rental-service/   # Rentals and rental interests
│   ├── mess-service/     # Mess listings and interests
│   ├── medical-service/  # Medical listings
│   ├── plumber-service/  # Plumber listings
│   ├── electrician-service/ # Electrician listings
│   ├── laundry-service/  # Laundry listings
│   ├── marketplace-service/ # Present in repository; not gateway-routed
│   ├── notification-service/# Present in repository; not gateway-routed
│   └── shared/           # Shared utilities and database helpers
└── PROJECT_DOCUMENTATION.md
```

## 3. Runtime architecture

```text
User panel ───────┐
                  ├── https://api.shikshaarthi.com
Admin panel ──────┘             │
                         API Gateway :3000
                                ├── Auth :3001
                                ├── Rewards :3002
                                ├── Rental :3003
                                ├── Mess :3004
                                ├── Medical :3005
                                ├── Plumber :3006
                                ├── Electrician :3007
                                └── Laundry :3008
```

In production, Nginx should expose only ports 80 and 443. The individual Node.js service ports should be bound privately on the VPS.

## 4. Frontend to backend communication

The main user-panel Axios client is in [Frontend/user-panel/src/services/api.js](./Frontend/user-panel/src/services/api.js).

Production frontend API values:

```env
VITE_API_GATEWAY_URL=https://api.shikshaarthi.com
VITE_BACKEND_URL=https://api.shikshaarthi.com
VITE_BACKEND_AUTH_URL=https://api.shikshaarthi.com
VITE_BACKEND_REWARDS_URL=https://api.shikshaarthi.com/api/rewards
VITE_RAZORPAY_KEY_ID=replace-with-your-public-razorpay-key
```

The user panel should use the API Gateway rather than calling ports 3001-3008 directly.

The admin panel currently contains some older direct-service fallbacks. Its production environment values point those variables to the gateway:

```env
VITE_API_GATEWAY_URL=https://api.shikshaarthi.com
VITE_BACKEND_URL=https://api.shikshaarthi.com
VITE_BACKEND_AUTH_URL=https://api.shikshaarthi.com
VITE_BACKEND_REWARDS_URL=https://api.shikshaarthi.com/api/rewards
VITE_RAZORPAY_KEY_ID=replace-with-your-public-razorpay-key
```

Vite embeds `VITE_*` variables at build time. Rebuild after changing them.

## 5. API Gateway routes

The gateway is implemented in [Backend/api-gateway/src/server.js](./Backend/api-gateway/src/server.js).

Base URL:

```text
Local:      http://localhost:3000
Production: https://api.shikshaarthi.com
```

| Gateway prefix | Target service | Target port |
|---|---|---:|
| `/api/auth/*` | Auth service | 3001 |
| `/api/admin/*` | Auth service | 3001 |
| `/api/rewards/*` | Rewards service | 3002 |
| `/api/rentals/*` | Rental service | 3003 |
| `/api/mess/*` | Mess service | 3004 |
| `/api/medical/*` | Medical service | 3005 |
| `/api/plumber/*` | Plumber service | 3006 |
| `/api/electrician/*` | Electrician service | 3007 |
| `/api/laundry/*` | Laundry service | 3008 |

Gateway health:

```http
GET /health
```

The gateway applies JWT authentication middleware to routed requests after the health and CORS preflight handling. Auth service public routes still need to be reachable through the gateway as configured by the current middleware behavior.

Marketplace and Notification services exist in the repository but currently have no gateway route in `api-gateway/src/server.js`.

## 6. Auth service routes

The Auth service mounts:

```text
/api -> api.js
/admin -> admin.routes.js (through api.js)
/internal -> internal.routes.js
```

Through the gateway, the normal public prefix is `/api/auth`.

### Public authentication and account routes

| Method | Gateway path | Purpose |
|---|---|---|
| GET | `/api/auth/colleges` | List colleges |
| POST | `/api/auth/validate-college` | Validate a college |
| POST | `/api/auth/check-email` | Check email availability |
| POST | `/api/auth/send-otp` | Send registration OTP |
| POST | `/api/auth/verify-otp` | Verify OTP and register |
| POST | `/api/auth/resend-otp` | Resend registration OTP |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Start password reset |
| POST | `/api/auth/verify-reset-otp` | Verify password-reset OTP |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/resend-reset-otp` | Resend password-reset OTP |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh-token` | Refresh access token |
| POST | `/api/auth/verify-token` | Verify a token |
| GET | `/api/auth/stats/platform` | Platform statistics |

### Authenticated user routes

| Method | Gateway path | Purpose |
|---|---|---|
| GET | `/api/auth/subscription/details` | Get subscription details |
| POST | `/api/auth/subscription/create-order` | Create Razorpay subscription order |
| POST | `/api/auth/subscription/verify-payment` | Verify payment and activate subscription |
| GET | `/api/auth/profile` | Get current profile |
| PUT | `/api/auth/profile` | Update current profile |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/auth/stats/user` | Current user statistics |
| PUT | `/api/auth/update-coins` | Update user coins |
| POST | `/api/auth/redeem-reward` | Redeem a reward |
| GET | `/api/auth/redeemed-rewards` | List redeemed rewards |
| GET | `/api/auth/spin/status` | Get available spins |
| POST | `/api/auth/spin/consume` | Consume a spin |
| GET | `/api/auth/spin/history` | Get spin history |

## 7. Admin routes

Admin routes are handled by the Auth service and exposed by the gateway under `/api/admin`.

| Method | Path | Authentication |
|---|---|---|
| POST | `/api/admin/login` | Public admin login |
| POST | `/api/admin/create` | JWT + admin role |
| GET | `/api/admin/users` | JWT + admin role |
| GET | `/api/admin/users/:userId` | JWT + admin role |
| PUT | `/api/admin/users/:userId` | JWT + admin role |
| DELETE | `/api/admin/users/:userId` | JWT + admin role |
| PATCH | `/api/admin/users/:userId/toggle-status` | JWT + admin role |
| PATCH | `/api/admin/users/:userId/toggle-verification` | JWT + admin role |
| POST | `/api/admin/send-reward-email` | JWT + admin role |
| GET | `/api/admin/users/:userId/redemption-history` | JWT + admin role |

## 8. Rewards service routes

Rewards routes are mounted in the service at `/api/rewards` and proxied through the gateway at the same path.

### Health and user submission routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/rewards/health` | Rewards health check |
| POST | `/api/rewards/submissions` | Submit data and image files |
| GET | `/api/rewards/submissions/me` | Get current user's submissions |
| GET | `/api/rewards/submissions/:submissionId` | Get submission details |
| GET | `/api/rewards/balance/me` | Get coin balance and history |

Submission uploads use `multipart/form-data`, accept up to six image files, and limit each file to 10 MB.

### Rewards admin routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/rewards/admin/submissions` | List submissions |
| GET | `/api/rewards/admin/submissions/:submissionId` | Get submission |
| PUT | `/api/rewards/admin/submissions/:submissionId` | Update submission |
| PATCH | `/api/rewards/admin/submissions/:submissionId/approve` | Approve submission |
| PATCH | `/api/rewards/admin/submissions/:submissionId/reject` | Reject submission |
| GET | `/api/rewards/admin/users/:userId/transactions` | Get user transactions |
| GET | `/api/rewards/admin/notifications/rental-interest` | List rental-interest notifications |
| GET | `/api/rewards/admin/notifications/rental-interest/:notificationId` | Get rental-interest details |
| GET | `/api/rewards/admin/notifications` | List admin notifications |
| PATCH | `/api/rewards/admin/notifications/:notificationId/read` | Mark notification as read |

Rewards admin routes require authentication and an admin role.

## 9. Domain service routes

These routes are proxied by the gateway. The direct service URLs below are for internal health checks only.

### Rental service

```text
Gateway prefix: /api/rentals
Service port:   3003
Health:         GET /health
```

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/rentals/nearby` | Find nearby rentals |
| GET | `/api/rentals/:id` | Get rental details |
| POST | `/api/rentals/:id/interest` | Express interest in a rental |

### Mess service

```text
Gateway prefix: /api/mess
Service port:   3004
Health:         GET /health
```

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/mess/nearby` | Find nearby messes |
| GET | `/api/mess/:id` | Get mess details |
| POST | `/api/mess/:id/interest` | Express interest in a mess |

### Medical service

```text
Gateway prefix: /api/medical
Service port:   3005
Health:         GET /health
```

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/medical/nearby` | Find nearby medical services |
| GET | `/api/medical/:id` | Get medical service details |

### Plumber service

```text
Gateway prefix: /api/plumber
Service port:   3006
Health:         GET /health
```

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/plumber/nearby` | Find nearby plumbers |
| GET | `/api/plumber/:id` | Get plumber details |

### Electrician service

```text
Gateway prefix: /api/electrician
Service port:   3007
Health:         GET /health
```

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/electrician/nearby` | Find nearby electricians |
| GET | `/api/electrician/:id` | Get electrician details |

### Laundry service

```text
Gateway prefix: /api/laundry
Service port:   3008
Health:         GET /health
```

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/laundry/nearby` | Find nearby laundries |
| GET | `/api/laundry/:id` | Get laundry details |

## 10. Internal Auth service routes

These routes are mounted directly by Auth at `/internal`, protected by `x-internal-api-key`, and are intended for service-to-service calls. They should not be exposed as public browser APIs.

| Method | Path | Purpose |
|---|---|---|
| GET | `/internal/users/:userId/details` | Get user details |
| POST | `/internal/users/:userId/stats/increment-submitted` | Increment submitted count |
| POST | `/internal/users/:userId/stats/increment-verified` | Increment verified count |
| POST | `/internal/users/:userId/stats/increment-rejected` | Increment rejected count |
| POST | `/internal/users/:userId/coins/update` | Add or subtract user coins |
| POST | `/internal/notify-redemption` | Create redemption notification |
| POST | `/internal/users/:userId/grant-spin` | Grant a spin |

The repository currently contains a duplicate user-details declaration in `internal.routes.js`; both declarations represent the same intended endpoint.

## 11. Environment variables

### Frontend

Frontend production files:

- [Frontend/user-panel/.env.production](./Frontend/user-panel/.env.production)
- [Frontend/admin-panel/.env.production](./Frontend/admin-panel/.env.production)

```env
VITE_API_GATEWAY_URL=https://api.shikshaarthi.com
VITE_BACKEND_URL=https://api.shikshaarthi.com
VITE_BACKEND_AUTH_URL=https://api.shikshaarthi.com
VITE_BACKEND_REWARDS_URL=https://api.shikshaarthi.com/api/rewards
VITE_RAZORPAY_KEY_ID=replace-with-your-public-razorpay-key
```

Only public values may use the `VITE_` prefix. Never put a database password, JWT secret, SMTP password, internal API key, or Razorpay secret in a Vite variable.

Backend production environment files have been created locally under the service directories. They are ignored by Git and must be transferred or recreated on the VPS. Start backend processes with `NODE_ENV=production` so services load `src/config/env/production.env`.

### API Gateway

The gateway configuration is in [Backend/api-gateway/src/config.js](./Backend/api-gateway/src/config.js).

```env
NODE_ENV=production
PORT=3000
AUTH_SERVICE_URL=http://127.0.0.1:3001
REWARDS_SERVICE_URL=http://127.0.0.1:3002
RENTAL_SERVICE_URL=http://127.0.0.1:3003
MESS_SERVICE_URL=http://127.0.0.1:3004
MEDICAL_SERVICE_URL=http://127.0.0.1:3005
PLUMBER_SERVICE_URL=http://127.0.0.1:3006
ELECTRICIAN_SERVICE_URL=http://127.0.0.1:3007
LAUNDRY_SERVICE_URL=http://127.0.0.1:3008
INTERNAL_API_KEY=generate-a-production-secret
JWT_SECRET=generate-a-production-secret
TOKEN_ISSUER=Shikshaarthi
TOKEN_AUDIENCE=Shikshaarthi-users
FRONTEND_URL=https://shikshaarthi.com,https://www.shikshaarthi.com,https://admin.shikshaarthi.com
```

### Auth service

The Auth service reads `src/config/env/<NODE_ENV>.env`.

```env
NODE_ENV=production
PORT=3001
AUTH_MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/shikshaarthi_auth
JWT_SECRET=production-jwt-secret
JWT_REFRESH_SECRET=production-refresh-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
TOKEN_ISSUER=Shikshaarthi
TOKEN_AUDIENCE=Shikshaarthi-users
INTERNAL_API_KEY=the-same-production-internal-key
EMAIL_SERVICE=gmail
EMAIL_USER=real-email@example.com
EMAIL_PASSWORD=gmail-app-password
EMAIL_FROM=real-email@example.com
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=strong-admin-password
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
SUBSCRIPTION_PRICE=199
SUBSCRIPTION_DURATION_DAYS=365
LOCATIONIQ_API_KEY=your-locationiq-key
FRONTEND_URL=https://shikshaarthi.com
```

### Other services

The domain services generally require:

```env
NODE_ENV=production
PORT=<service-port>
MONGO_URI=mongodb+srv://...
AUTH_SERVICE_URL=http://127.0.0.1:3001
INTERNAL_API_KEY=the-same-production-internal-key
```

Mess, Medical, and Rental also use `REWARDS_DB_URI`.

Rewards additionally validates JWT values, Auth/Rental URLs, internal API key, Cloudinary credentials, multiple database URLs, LocationIQ, and Kafka configuration:

```env
REWARDS_DB_URI=mongodb+srv://...
MESS_DB_URI=mongodb+srv://...
RENTAL_DB_URI=mongodb+srv://...
PLUMBER_DB_URI=mongodb+srv://...
ELECTRICIAN_DB_URI=mongodb+srv://...
LAUNDRY_DB_URI=mongodb+srv://...
MEDICAL_DB_URI=mongodb+srv://...
AUTH_DB_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=shikshaarthi-rewards
KAFKA_SUBMISSION_TOPIC=submission_events
```

## 12. Required external services and keys

| Service | Required for |
|---|---|
| MongoDB or MongoDB Atlas | Application data |
| Razorpay | Subscription payments |
| SMTP/Gmail App Password | OTP and password-reset email |
| LocationIQ | Location/geocoding features |
| Cloudinary | Rewards image uploads |
| Kafka | Rewards event processing if enabled |

Rotate any credentials that were ever placed in source code. Keep production secrets only in environment files or a secrets manager.

## 13. Local development

Prerequisites:

- Node.js LTS
- npm
- MongoDB
- Kafka if required by Rewards

Install backend dependencies:

```powershell
cd "C:\Users\Kunal Bodkhe\OneDrive\Desktop\Shikhshaarthi\shikshaarthi_v2\Backend"
npm install
```

Install each service if needed:

```powershell
$services = @(
  "api-gateway", "auth-service", "rewards-service", "rental-service",
  "mess-service", "medical-service", "plumber-service",
  "electrician-service", "laundry-service"
)
foreach ($service in $services) {
  Push-Location $service
  npm install
  Pop-Location
}
```

Install frontends:

```powershell
cd "..\Frontend\user-panel"
npm install --legacy-peer-deps

cd "..\admin-panel"
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is currently needed because `react-lightbox@0.4.0` declares an outdated React peer range incompatible with React 19.

Start all configured backend services:

```powershell
cd "C:\Users\Kunal Bodkhe\OneDrive\Desktop\Shikhshaarthi\shikshaarthi_v2\Backend"
npm run dev
```

Start user panel:

```powershell
cd "..\Frontend\user-panel"
npm run dev
```

Start admin panel in another terminal:

```powershell
cd "..\admin-panel"
npm run dev
```

Typical local URLs:

```text
User panel:  http://localhost:5173
Admin panel: http://localhost:5174
Gateway:     http://localhost:3000
```

## 14. Production deployment with the domain

Recommended DNS records, all pointing to the VPS public IP:

| Type | Host | Value |
|---|---|---|
| A | `@` | VPS public IP |
| A | `www` | VPS public IP |
| A | `api` | VPS public IP |
| A | `admin` | VPS public IP |

Recommended URLs:

```text
https://shikshaarthi.com
https://www.shikshaarthi.com
https://api.shikshaarthi.com
https://admin.shikshaarthi.com
```

Build the frontends on the VPS:

```bash
cd Frontend/user-panel
npm install --legacy-peer-deps
npm run build

cd ../admin-panel
npm install --legacy-peer-deps
npm run build
```

Use Nginx to serve the two `dist` directories and proxy `api.shikshaarthi.com` to `127.0.0.1:3000`.

Example Nginx layout:

```nginx
server {
    listen 80;
    server_name shikshaarthi.com www.shikshaarthi.com;
    root /var/www/shikshaarthi/Frontend/user-panel/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name admin.shikshaarthi.com;
    root /var/www/shikshaarthi/Frontend/admin-panel/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api.shikshaarthi.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable HTTPS with Certbot:

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx \
  -d shikshaarthi.com \
  -d www.shikshaarthi.com \
  -d api.shikshaarthi.com \
  -d admin.shikshaarthi.com
sudo certbot renew --dry-run
```

Run backend services with PM2 rather than Nodemon:

```bash
sudo npm install -g pm2
pm2 start Backend/api-gateway/src/server.js --name shikshaarthi-gateway
pm2 start Backend/auth-service/src/server.js --name shikshaarthi-auth
pm2 start Backend/rewards-service/src/server.js --name shikshaarthi-rewards
pm2 start Backend/rental-service/src/server.js --name shikshaarthi-rental
pm2 start Backend/mess-service/src/server.js --name shikshaarthi-mess
pm2 start Backend/medical-service/src/server.js --name shikshaarthi-medical
pm2 start Backend/plumber-service/src/server.js --name shikshaarthi-plumber
pm2 start Backend/electrician-service/src/server.js --name shikshaarthi-electrician
pm2 start Backend/laundry-service/src/server.js --name shikshaarthi-laundry
pm2 save
pm2 startup
```

Do not expose service ports 3000-3008, MongoDB port 27017, or Kafka port 9092 publicly. Only Nginx ports 80 and 443 should be internet-facing.

## 15. Changes made for `shikshaarthi.com`

### Frontend environment files added

Added:

- [Frontend/user-panel/.env.production](./Frontend/user-panel/.env.production)
- [Frontend/admin-panel/.env.production](./Frontend/admin-panel/.env.production)

These point frontend requests to:

```text
https://api.shikshaarthi.com
```

They also define the public Razorpay key placeholder. The placeholder must be replaced with the real public key before a payment-enabled production build.

### API Gateway CORS updated

Updated [Backend/api-gateway/src/server.js](./Backend/api-gateway/src/server.js):

- Added `https://shikshaarthi.com`
- Added `https://www.shikshaarthi.com`
- Added `https://admin.shikshaarthi.com`
- Retained local development origins
- Added optional comma-separated `FRONTEND_URL` origins
- Changed proxy/error CORS handling to return headers only for allowed origins

### Builds and validation

Both frontend production builds completed successfully:

```text
Frontend/user-panel/dist
Frontend/admin-panel/dist
```

The API Gateway passed Node.js syntax validation.

The builds still report existing non-blocking Vite warnings about legacy script tags and unresolved asset references. These warnings did not prevent successful builds and are separate from the domain configuration.

## 16. Current limitations to address later

1. Marketplace and Notification services are not exposed by the API Gateway.
2. Some admin source files still contain direct-service fallback URLs; production environment values now point them to the gateway, but standardizing all API calls to one client would be cleaner.
3. The frontend dependency `react-lightbox@0.4.0` is incompatible with React 19 peer declarations and currently requires `--legacy-peer-deps`.
4. Some services have service-specific environment loaders under `src/config/env`; those files must exist on the VPS.
5. Razorpay, email, Cloudinary, LocationIQ, Kafka, and MongoDB production credentials still need to be supplied.
6. Hardcoded fallback credentials in legacy source should be removed and rotated before production.
7. The API Gateway required-variable list should include `LAUNDRY_SERVICE_URL` for stricter validation.
