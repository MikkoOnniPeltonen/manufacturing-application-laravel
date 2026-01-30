# Manufacturing Management System

A comprehensive production management system designed to streamline manufacturing workflows, manage customer relationships, and track production history. Built with a modern tech stack featuring Laravel 12 and React 19.

![Manufacturing Dashboard](https://img.shields.io/badge/Status-Production%20Ready-success)
![Laravel](https://img.shields.io/badge/Laravel-12.49-red)
![React](https://img.shields.io/badge/React-19.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Features

### Role-Based Access Control (RBAC)
- **Manager Role**: Full access to production workflows and line management
- **Admin Role**: Complete system access including customer database and historical analytics

### Production Management
- **Interactive Kanban Workflow**: Drag-and-drop interface for managing production stages
  - Sales Orders → Staging → In Production → Completed
- **Real-time Production Tracking**: Monitor active production lines with live status updates
- **Batch Processing**: Queue and process multiple orders sequentially
- **Production Velocity Analytics**: Visual charts showing completion rates and pending vs. delivered ratios

### Customer Relationship Management (Admin Only)
- **Customer Database**: Comprehensive customer information management
- **Advanced Search & Filtering**: Sortable tables with pagination
- **Customer Analytics**: Track order history and delivery performance per customer
- **Visual Charts**: Compare customer-specific metrics against production line averages

### Historical Analytics (Admin Only)
- **Time-Based Queries**: View production state at any point in time
- **Advanced Search**: Filter by product, customer, status, and quantity ranges
- **Read-Only History Mode**: Safely explore past production states without affecting live data

### User Experience
- **Modern Dark Theme**: Sleek slate-based UI with vibrant accent colors
- **Responsive Design**: Optimized for desktop workflows
- **Toast Notifications**: Consistent feedback for all user actions
- **Auto-animations**: Smooth transitions for enhanced UX

## 🏗️ Architecture

### Backend
- **Framework**: Laravel 12.49
- **Authentication**: Laravel Sanctum (Session-based)
- **Authorization**: Spatie Laravel Permission (RBAC)
- **Database**: SQLite
- **API**: RESTful architecture with resource controllers

### Frontend
- **Framework**: React 19 with Vite
- **Routing**: React Router DOM v7
- **State Management**: React Hooks & TanStack Query v5 (Server State)
- **Data Fetching**: TanStack Query v5
- **UI Components**: Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with custom design tokens
- **Charts**: Recharts for data visualization
- **HTTP Client**: Axios with interceptors

## 📋 Prerequisites

- **PHP**: ^8.2
- **Composer**: Latest version
- **Node.js**: ^18.0
- **SQLite**: (Built-in)
- **npm** or **yarn**

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd task_manager
```

### 2. Backend Setup (Laravel)
```bash
cd manufacturing-laravel-backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure your database in .env
# DB_CONNECTION=sqlite
# (No further configuration needed for SQLite)

# Run migrations and seeders
php artisan migrate --seed

# Start the Laravel development server
php artisan serve
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup (React)
```bash
cd ../manufacturing-app-frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 👥 Default User Accounts

The system comes with pre-configured test accounts:

| Role    | Email                        | Password          |
|---------|------------------------------|-------------------|
| Manager | manager@manufacturing.com    | SecurePass2026!   |
| Admin   | admin@manufacturing.com      | SecurePass2026!   |

## 🎯 Usage Guide

### Manager Workflow
1. **Login** with manager credentials
2. **View Dashboard**: See all active production lines and their status
3. **Access Manager View**: Click on any production line card
4. **Manage Production**:
   - Double-click sales orders to stage them
   - Reorder staged items using arrow buttons
   - Confirm to move items to production
   - Start production to process items sequentially
5. **Monitor Progress**: Real-time updates as items are processed

### Admin Workflow
1. **Login** with admin credentials
2. **Access All Manager Features**: Full production management capabilities
3. **Manage Customers**:
   - Navigate to `/customers` via the navbar
   - Add, edit, or view customer details
   - Analyze customer-specific metrics
4. **View Production History**:
   - Click "View History Mode" on the dashboard
   - Select date ranges or use advanced search
   - Explore historical production states

## 📁 Project Structure

```
task_manager/
├── manufacturing-laravel-backend/     # Laravel API Backend
│   ├── app/
│   │   ├── Http/Controllers/         # API Controllers
│   │   ├── Models/                   # Eloquent Models
│   │   └── Services/                 # Business Logic
│   ├── database/
│   │   ├── migrations/               # Database Migrations
│   │   └── seeders/                  # Data Seeders
│   └── routes/
│       └── api.php                   # API Routes
│
└── manufacturing-app-frontend/        # React Frontend
    ├── src/
    │   ├── components/               # Reusable Components
    │   │   ├── ui/                   # UI Primitives
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── contexts/
    │   │   └── AuthContext.jsx       # Authentication State
    │   ├── lib/
    │   │   └── api.js                # Axios Configuration
    │   └── pages/                    # Route Components
    │       ├── HomePage.jsx
    │       ├── LoginPage.jsx
    │       ├── ManagerViewPage.jsx
    │       ├── AllCustomersPage.jsx
    │       └── ProductionHistoryPage.jsx
    └── package.json
```

## 🔐 Security Features

- **Session-based Authentication**: Secure token management via Laravel Sanctum
- **CSRF Protection**: Built-in Laravel CSRF middleware
- **Role-based Authorization**: Spatie Permission package for granular access control
- **Protected Routes**: Frontend route guards based on user roles
- **Password Hashing**: Bcrypt encryption for user passwords
- **API Token Validation**: Automatic token verification on each request

## 🛠️ Development

### Backend Commands
```bash
# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Clear cache
php artisan cache:clear
php artisan config:clear

# Run tests
php artisan test
```

### Frontend Commands
```bash
# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## 📊 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get authenticated user

### Production Lines
- `GET /api/production-lines` - List all production lines
- `GET /api/production-lines/{id}/history` - Get historical data

### Sales
- `GET /api/sales` - List sales orders
- `GET /api/sales/{lineId}` - Get sales for specific line
- `POST /api/sales/generate` - Generate random sales (Admin)
- `DELETE /api/sales/clear/{lineId}` - Clear pending sales

### Production
- `PATCH /api/productions/{lineId}` - Update production status
- `POST /api/productions/process/{saleId}` - Process a sale item

### Customers (Admin Only)
- `GET /api/customers` - List all customers
- `GET /api/customers/{id}` - Get customer details
- `POST /api/customers` - Create new customer
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Delete customer

## 🎨 Design System

### Color Palette
- **Background**: Slate 900/950 (Dark theme)
- **Primary**: Blue 600 (Actions, Links)
- **Success**: Emerald 500 (Completed states)
- **Warning**: Amber 500 (Pending states)
- **Danger**: Red 500 (Errors)
- **Info**: Purple 500 (In-progress states)

### Typography
- **Headings**: Bold, White text
- **Body**: Slate 300/400
- **Labels**: Slate 500

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Laravel Team** - For the excellent PHP framework
- **React Team** - For the powerful UI library
- **Radix UI** - For accessible component primitives
- **Tailwind CSS** - For the utility-first CSS framework
- **Spatie** - For the Laravel Permission package

## 📧 Support

For support, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for efficient manufacturing management**
