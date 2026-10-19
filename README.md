

# **Shikshaarthi**

**Shikshaarthi** is a microservices-based MERN platform that centralizes campus services for students — including mess, rentals, laundry, medical, electrician, plumber, marketplace, and rewards modules.
It is designed and maintained end-to-end by a single developer with a focus on **scalability, reliability, and smooth user experience**.

---

##  **1. Tech Stack**

### **Frontend**

* React + Vite
* Dedicated **User Panel** and **Admin Panel**

### **Backend**

* Node.js, Express.js, REST APIs
* MongoDB with proper indexing

### **Architecture & Infrastructure**

* Microservices behind an **API Gateway**
* Internal communication via **API-key based authentication**
* **Nginx reverse proxy** on Hostinger VPS
* **SSH-based deployment**

### **Payments**

* Razorpay subscription model for service access and billing

---

##  **2. Core Features**

* Student web app to discover, book, and track all campus services in one place
* Admin dashboard to manage vendors, service requests, status updates, and issues
* Authentication & Authorization handled by a dedicated service
* Independent microservices per domain to allow isolated scaling and deployments
* Rewards system for student contributions (e.g., sharing mess photos, room details)

---

## 🗂️ **3. Repository Structure**

```
shikshaarthi_v2/
├── Frontend/
│   ├── admin-panel/        # React + Vite admin dashboard
│   └── user-panel/         # React + Vite student app
└── Backend/
    ├── api-gateway/        # Public entry point, service routing
    ├── auth-service/       # Login, signup, token validation
    ├── mess-service/       # Mess plans, menus, subscriptions, issues
    ├── rental-service/     # PG/room listings and bookings
    ├── laundry-service/    # Laundry orders & slot management
    ├── medical-service/    # Medical services & appointments
    ├── electrician-service/# Electrician tickets & resolutions
    ├── plumber-service/    # Plumbing requests
    ├── marketplace-service/# Marketplace for student items
    ├── notification-service# Email / notification events
    ├── rewards-service/    # Rewards, offers & referrals
    └── shared/             # Common models, utils, configs
```

---

##  **4. Getting Started**

### **4.1 Prerequisites**

* Node.js (LTS recommended)
* MongoDB (local or cloud)
* npm or yarn
* Razorpay keys (needed only for payment testing)

---

### **4.2 Clone the Repository**

```bash
git clone https://github.com/<your-username>/shikshaarthi_v2.git
cd shikshaarthi_v2
```

---

### **4.3 Run the Frontend (Example: User Panel)**

```bash
cd Frontend/user-panel
npm install
npm run dev
```

The app will start on the port configured in **vite.config.js**.

---

### **4.4 Run a Backend Service (Example: Mess Service)**

```bash
cd Backend/mess-service
npm install
npm start
```

Repeat similar steps for other services (`rental-service`, `laundry-service`, etc.).

---

##  **5. Environment Variables**

Each service (and frontend app) must maintain its own `.env` file.
Common environment variables include:

* `MONGODB_URI`
* `JWT_SECRET`
* `RAZORPAY_KEY_ID`
* `RAZORPAY_KEY_SECRET`
* Internal API base URLs
* Internal service-to-service API keys

---

##  **6. Deployment Overview**

Production deployment uses a **Hostinger VPS** with:

* Each microservice running as its own Node.js process
* React frontends built and served via **Nginx**
* Nginx reverse proxy to route API Gateway and frontend builds
* SSH-based deployments with emphasis on **zero downtime** and **low latency** for thousands of requests

---

## **7. Future Enhancements**

* Containerize all services using **Docker**
* Orchestrate with **Kubernetes**
* Add caching (Redis) and CDN for high performance
* Implement centralized logging and distributed tracing
* Add monitoring dashboards (Prometheus / Grafana)

---


