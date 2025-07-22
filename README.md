# 🏢 ERP System Backend

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>
<p align="center">
  A comprehensive Enterprise Resource Planning (ERP) system built with <strong>NestJS</strong> and <strong>MongoDB</strong>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
</p>
<p align="center">
  <strong>Welcome to our ERP system!</strong> 🚀
</p>

---

## 📋 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Installation](#-installation)
- [🔧 Environment Variables](#-environment-variables)
- [📡 API Endpoints](#-api-endpoints)
- [📧 Email System](#-email-system)
- [👤 User Roles & Permissions](#-user-roles--permissions)
- [🗄️ Database Schema](#️-database-schema)
- [🎯 Usage Examples](#-usage-examples)
- [🔒 Security Features](#-security-features)
- [📝 Development](#-development)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [📞 Support & Contact](#-support--contact)
- [📈 Roadmap](#-roadmap)

---

## 🌟 Overview

This ERP (Enterprise Resource Planning) system is a complete business management solution designed to streamline operations across multiple departments. Built with modern technologies, it provides role-based access control, automated workflows, and comprehensive reporting capabilities.

> "Hello in our ERP system!" - Where business efficiency meets cutting-edge technology.

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC) with 7 user roles
- Password reset with email verification codes
- Account suspension/reactivation
- Automated login notifications via email

### 👥 User Management
- CRUD operations for users
- Multiple roles: SuperAdmin, HR, Sales, Sales Manager, Inventory, Finance, Employee
- User status management (Active/Suspended)
- Salary tracking

### 👤 Customer Management
- Customer registration and profile management
- Sales person assignment
- Contact information tracking

### 📦 Product Management
- Product catalog management
- Real-time inventory tracking
- Stock quantity management
- Product categorization

### 📋 Order Management
- Complete order lifecycle: Pending → Confirmed → Shipped → Cancelled
- Order line items with quantity tracking
- Order status updates with notifications
- Sales person order assignment
- Order cancellation with reason tracking

### ⏰ Attendance System
- Check-in/Check-out functionality
- Daily attendance monitoring and reports
- Attendance editing (HR only)
- Automated email notifications
- Attendance statistics and analytics

### 🏖️ Leave Management
- Leave request submission with approval workflow
- HR approval/rejection with comments
- Leave balance tracking
- Multi-party email notifications
- Leave statistics and reports

### 💰 Finance Module
- Revenue tracking and reports
- Monthly/yearly revenue analysis
- Salary reports by role
- Profit & Loss calculations
- Sales performance metrics
- Attendance cost analysis

### 📊 Dashboard
- Role-specific dashboards
- Real-time statistics
- Quick access to key metrics
- Recent activity feeds

### 📧 Email Notification System
- Order status update notifications
- Attendance confirmation emails
- Leave request and approval notifications
- Login and security notifications
- Password reset verification emails

---

## 🛠️ Tech Stack

| Technology      | Purpose             |
|-----------------|--------------------|
| **NestJS**      | Backend Framework  |
| **MongoDB**     | Database           |
| **Mongoose**    | ODM                |
| **JWT**         | Authentication     |
| **Nodemailer**  | Email Service      |
| **EJS**         | Email Templates    |
| **Class Validator** | Input Validation |
| **Bcrypt**      | Password Hashing   |
| **Helmet**      | Security Headers   |

---

## 🚀 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB
- Gmail account for email notifications

### Step-by-Step Setup

```bash
git clone <repository-url>
cd erp-backend
npm install
cp .env.example .env
# Edit .env with your configs
npm run start:dev
```

### Verify Installation

```bash
curl http://localhost:5000
# Should return: "Hello in our ERP system!"
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/erp?retryWrites=true&w=majority
PORT=5000
JWT_SECRET_KEY=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

#### 📧 Gmail Setup for Email Notifications
- Enable 2FA on Gmail
- Generate an App-Specific Password
- Use it in `EMAIL_PASS`

---

## 📡 API Endpoints

### 🔐 Authentication

| Method | Endpoint                | Description                  | Access        |
|--------|------------------------|------------------------------|--------------|
| POST   | /auth/register         | Register new user            | SuperAdmin/HR|
| POST   | /auth/login            | User login                   | Public       |
| POST   | /auth/forget-password  | Request password reset       | Public       |
| POST   | /auth/reset-password   | Reset password with code     | Public       |
| GET    | /auth/me               | Get current user profile     | Authenticated|

### 👥 Users

| Method | Endpoint      | Description      | Access        |
|--------|--------------|------------------|--------------|
| POST   | /users       | Create user      | SuperAdmin/HR|
| GET    | /users       | Get all users    | SuperAdmin/HR|
| GET    | /users/:id   | Get user by ID   | SuperAdmin/HR|
| PUT    | /users/:id   | Update user      | SuperAdmin/HR|
| DELETE | /users/:id   | Delete user      | SuperAdmin/HR|

### 👤 Customers

| Method | Endpoint            | Description         | Access      |
|--------|---------------------|---------------------|------------|
| POST   | /api/customers      | Create customer     | Sales Team |
| GET    | /api/customers      | Get customers       | Sales Team |
| GET    | /api/customers/:id  | Get customer by ID  | Sales Team |
| PUT    | /api/customers/:id  | Update customer     | Sales Team |
| DELETE | /api/customers/:id  | Delete customer     | Manager+   |

### 📦 Products

| Method | Endpoint                      | Description         | Access             |
|--------|-------------------------------|---------------------|--------------------|
| POST   | /api/products                 | Create product      | Inventory/SuperAdmin|
| GET    | /api/products                 | Get all products    | Inventory/SuperAdmin|
| GET    | /api/products/:id             | Get product by ID   | Inventory/SuperAdmin|
| PUT    | /api/products/:id             | Update product      | Inventory/SuperAdmin|
| DELETE | /api/products/:id             | Delete product      | SuperAdmin         |
| PUT    | /api/products/:id/reduce-quantity | Reduce stock   | Inventory/SuperAdmin|

### 📋 Orders

| Method | Endpoint                  | Description         | Access         | Email Triggered      |
|--------|---------------------------|---------------------|----------------|----------------------|
| POST   | /api/orders               | Create order        | Sales Team     | ✅ Order Created     |
| GET    | /api/orders               | Get orders          | Role-based     | ❌                  |
| GET    | /api/orders/:id           | Get order by ID     | Role-based     | ❌                  |
| PUT    | /api/orders/:id           | Update order        | Sales Team     | ❌                  |
| PATCH  | /api/orders/:id/confirm   | Confirm order       | Manager+       | ✅ Order Confirmed   |
| PATCH  | /api/orders/:id/ship      | Ship order          | Inventory/SuperAdmin | ✅ Order Shipped |
| PATCH  | /api/orders/:id/cancel    | Cancel order        | Manager+       | ✅ Order Cancelled   |
| DELETE | /api/orders/:id           | Delete order        | SuperAdmin     | ❌                  |

### ⏰ Attendance

| Method | Endpoint                        | Description         | Access         | Email Triggered      |
|--------|---------------------------------|---------------------|----------------|----------------------|
| POST   | /api/attendance/check-in        | Check in to work    | All Users      | ✅ Check-in Confirmation |
| POST   | /api/attendance/check-out       | Check out from work | All Users      | ✅ Check-out Confirmation |
| GET    | /api/attendance                 | Get all attendance  | HR/SuperAdmin  | ❌                  |
| GET    | /api/attendance/my-attendance   | Get my attendance   | All Users      | ❌                  |
| GET    | /api/attendance/today           | Get today's attendance | HR/SuperAdmin | ❌                  |
| GET    | /api/attendance/stats           | Get attendance statistics | HR/SuperAdmin | ❌              |
| GET    | /api/attendance/:id             | Get attendance by ID| HR/SuperAdmin  | ❌                  |
| PUT    | /api/attendance/:id             | Edit attendance     | HR/SuperAdmin  | ❌                  |
| DELETE | /api/attendance/:id             | Delete attendance   | SuperAdmin     | ❌                  |

### 🏖️ Leaves

| Method | Endpoint                  | Description         | Access         | Email Triggered      |
|--------|---------------------------|---------------------|----------------|----------------------|
| POST   | /api/leaves               | Create leave request| All Users (except SuperAdmin) | ✅ Leave Request Submitted |
| GET    | /api/leaves               | Get all leaves      | HR/SuperAdmin  | ❌                  |
| GET    | /api/leaves/my-leaves     | Get my leaves       | All Users      | ❌                  |
| GET    | /api/leaves/stats         | Get leave statistics| HR/SuperAdmin  | ❌                  |
| GET    | /api/leaves/:id           | Get leave by ID     | HR/SuperAdmin/Owner | ❌              |
| PUT    | /api/leaves/:id           | Update leave request| Owner (if pending) | ❌               |
| PATCH  | /api/leaves/:id/approve   | Approve leave       | HR/SuperAdmin  | ✅ Leave Approved     |
| PATCH  | /api/leaves/:id/reject    | Reject leave        | HR/SuperAdmin  | ✅ Leave Rejected     |
| DELETE | /api/leaves/:id           | Delete leave        | SuperAdmin     | ❌                  |

### 💰 Finance

| Method | Endpoint                        | Description         | Access         |
|--------|---------------------------------|---------------------|----------------|
| GET    | /api/finance/revenue            | Get total revenue   | Finance/SuperAdmin |
| GET    | /api/finance/revenue/monthly    | Get monthly revenue | Finance/SuperAdmin |
| GET    | /api/finance/orders             | Get orders financial report | Finance/SuperAdmin |
| GET    | /api/finance/salaries           | Get salaries report | Finance/HR/SuperAdmin |
| GET    | /api/finance/profit             | Get profit & loss   | Finance/SuperAdmin |
| GET    | /api/finance/sales-performance  | Get sales performance | Finance/Manager/SuperAdmin |
| GET    | /api/finance/dashboard          | Get finance dashboard | Finance/SuperAdmin |
| GET    | /api/finance/attendance-costs   | Get attendance costs | Finance/HR/SuperAdmin |

### 📊 Dashboard

| Method | Endpoint         | Description                 | Access         |
|--------|------------------|-----------------------------|----------------|
| GET    | /api/dashboard   | Get role-specific dashboard | All Authenticated |

---

## 📧 Email System

The system sends automated emails for:

- **Login Notification**: User login alert
- **Password Reset**: 6-digit code for password reset
- **Order Created**: Sales team, manager, superadmin
- **Order Confirmed**: Inventory, sales person, superadmin
- **Order Shipped**: Sales team, manager, superadmin
- **Order Cancelled**: Sales team, manager, superadmin
- **Attendance Check-In/Out**: Employee, HR, superadmin
- **Leave Request Submitted**: Employee, HR, superadmin
- **Leave Approved/Rejected**: Employee, HR, superadmin

All emails use professional, responsive HTML templates with company branding and clear information.

### 📂 Email Templates

Located in [`src/mail/templates`](src/mail/templates):

- `login.ejs`
- `reset-password.ejs`
- `order-created.ejs`
- `order-confirmed.ejs`
- `order-shipped.ejs`
- `order-cancelled.ejs`
- `attendance-check-in.ejs`
- `attendance-check-out.ejs`
- `attendance-hr-notification.ejs`
- `leave-request.ejs`
- `leave-approved.ejs`
- `leave-rejected.ejs`

---

## 👤 User Roles & Permissions

| Role         | Description & Permissions |
|--------------|--------------------------|
| **SuperAdmin** | Full system access, user management, order management, data access, system config |
| **HR**         | User management (except SuperAdmin), attendance & leave management, HR reports |
| **Sales Manager** | Team management, order confirmation/cancellation, customer access, sales reports |
| **Sales**      | Customer management, order creation, own data access |
| **Inventory**  | Product management, stock updates, order shipping, inventory reports |
| **Finance**    | Financial reports, revenue/cost analysis, read-only access |
| **Employee**   | Personal attendance and leave management only |

---

## 🗄️ Database Schema

### Users

```js
{
  fullName: String,
  email: String,
  phone: String,
  password: String,
  salary: Number,
  status: String,
  role: String
}
```

### Customers

```js
{
  name: String,
  email: String,
  phone: String,
  userId: ObjectId
}
```

### Products

```js
{
  title: String,
  description: String,
  category: String,
  price: Number,
  qty: Number,
  createdBy: ObjectId
}
```

### Orders

```js
{
  customerId: ObjectId,
  createdBy: ObjectId,
  lines: [{ productId: ObjectId, qty: Number }],
  note: String,
  status: String,
  confirmedBy: ObjectId,
  shippedBy: ObjectId,
  cancelledBy: ObjectId,
  confirmedAt: Date,
  shippedAt: Date,
  cancelledAt: Date
}
```

### Attendance

```js
{
  userId: ObjectId,
  checkInTime: Date,
  checkOutTime: Date,
  date: String,
  editedBy: ObjectId,
  editedAt: Date,
  note: String
}
```

### Leaves

```js
{
  userId: ObjectId,
  startDate: Date,
  endDate: Date,
  reason: String,
  status: String,
  reviewedBy: ObjectId,
  reviewedAt: Date,
  reviewNote: String,
  totalDays: Number
}
```

---

## 🎯 Usage Examples

### Login

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "password123"}'
```

### Create Customer

```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "phone": "+1234567890"}'
```

### Check In to Work

```bash
curl -X POST http://localhost:5000/api/attendance/check-in \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note": "Started work on time"}'
```

### Create Leave Request

```bash
curl -X POST http://localhost:5000/api/leaves \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-02-15", "endDate": "2024-02-17", "reason": "Family vacation"}'
```

---

## 🔒 Security Features

- JWT authentication
- Role-based access control
- Rate limiting
- CORS protection
- Helmet security headers
- Password hashing (bcrypt)
- Input validation (class-validator)
- Secure email templates

---

## 📝 Development

### Running

```bash
npm run start:dev
npm run start:prod
```

### Testing

```bash
npm run test
npm run test:watch
npm run test:cov
```

### Linting & Formatting

```bash
npm run lint
npm run format
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

- Email: support@yourcompany.com
- API Docs: http://localhost:5000/api/docs

---

## 📈 Roadmap

- [ ] Real-time notifications with WebSockets
- [ ] Advanced reporting and analytics
- [ ] Mobile app integration
- [ ] Multi-tenant support
- [ ] Advanced workflow automation
- [ ] Integration with third-party services

---

<p align="center">
  <strong>Built with ❤️ using NestJS and MongoDB</strong><br>
  <em>"Hello in our ERP system!" - Where business efficiency meets cutting-edge technology</em>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Made%20with-TypeScript-blue?style=for-the-badge&logo=typescript" alt="Made with TypeScript" />
  <img src="https://img.shields.io/badge/Powered%20by-NestJS-red?style=for-the-badge&logo=nestjs" alt="Powered by NestJS" />
  <img src="https://img.shields.io/badge/Database-MongoDB-green?style=for-the-badge&logo=mongodb" alt="MongoDB" />
</p>
