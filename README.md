<div align="center">
  <h1>Manzili</h1>
  <p>
    Where real craft finds its home - A specialized multi-vendor e-commerce platform for handmade Egyptian products.
  </p>
  <p>
    <a href="https://github.com/GreatStackDev/goCart/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/GreatStackDev/goCart?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/GreatStackDev/goCart/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome"></a>
    <a href="https://github.com/GreatStackDev/goCart/issues"><img src="https://img.shields.io/github/issues/GreatStackDev/goCart?style=for-the-badge" alt="GitHub issues"></a>
  </p>
</div>

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [🏗️ Project Structure](#-project-structure)
- [📜 License](#-license)

---

## ✨ Features

### 🎯 Core Platform
- **Handmade-Focused Marketplace**: Dedicated exclusively to authentic handmade products from Egyptian artisans
- **Multi-Vendor Architecture**: Verified artisans can register, manage their own stores, and sell products
- **Three-Tier User System**: Separate interfaces for customers, store owners, and platform administrators

### 👥 Customer Experience
- **Beautiful Storefront**: Responsive design with product browsing, filtering, and search
- **Secure Shopping Cart**: Add products from multiple artisans in a single cart
- **Order Tracking**: Real-time order status updates from ORDER_PLACED to DELIVERED
- **Product Ratings & Reviews**: Authentic feedback system with verified purchases
- **Multiple Payment Methods**: Support for COD (Cash on Delivery) and Stripe integration

### 🏪 Store Owner Dashboard
- **Store Management**: Complete control over store profile, branding, and product catalog
- **Product Management**: Add, edit, and manage handmade products with multiple images
- **Order Management**: Process customer orders, update status, and track sales
- **Sales Analytics**: Visual charts and reports for business insights
- **Inventory Management**: Stock tracking and availability controls

### 👑 Admin Panel
- **Vendor Verification**: Review and approve new artisan applications
- **Platform Oversight**: Monitor all stores, products, and transactions
- **Coupon Management**: Create and manage discount codes for promotions
- **Content Moderation**: Ensure quality and compliance across the platform

### 🔒 Security & Reliability
- **User Authentication**: Secure login and registration system
- **Address Management**: Multiple shipping addresses per user
- **Order History**: Complete purchase records for customers and store owners
- **Data Privacy**: Protected user information and secure transactions

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.2.4 with App Router
- **UI Library**: React 19.2.5
- **Styling**: Tailwind CSS 4 with PostCSS
- **Icons**: Lucide React
- **State Management**: Redux Toolkit with React Redux
- **Charts**: Recharts for data visualization
- **Notifications**: React Hot Toast

### Backend & Database
- **ORM**: Prisma with PostgreSQL
- **Database**: PostgreSQL with Prisma Client
- **Schema**: Comprehensive data models for users, products, orders, stores, ratings, and addresses

### Development Tools
- **Package Manager**: npm
- **Code Quality**: ESLint integration
- **Build Tool**: Turbopack for fast development
- **Environment Variables**: .env.local configuration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GreatStackDev/goCart.git
   cd goCart
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory with:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/manzili_db"
   DIRECT_URL="postgresql://username:password@localhost:5432/manzili_db"
   NEXT_PUBLIC_CURRENCY_SYMBOL="EGP"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Project Structure

```
Manzili/
├── app/                    # Next.js App Router pages
│   ├── (public)/          # Public-facing pages (home, shop, about, etc.)
│   ├── admin/             # Admin panel pages
│   ├── store/             # Store owner dashboard pages
│   └── layout.jsx         # Root layout with metadata
├── components/            # Reusable React components
│   ├── admin/             # Admin-specific components
│   ├── store/             # Store-specific components
│   └── shared/            # Shared UI components
├── lib/                   # Utility libraries and Redux store
│   └── features/          # Redux slices (cart, address, rating, etc.)
├── prisma/                # Database schema and Prisma client
│   └── schema.prisma      # Database models
├── assets/                # Static assets (images, logos, icons)
├── dummydata/             # Sample data for development
└── plans/                 # Project documentation and plans
```

## 📜 License

This project is license-free.

---

## 🌟 Why Manzili?

Manzili (meaning "my home" in Arabic) is more than just an e-commerce platform—it's a community dedicated to preserving and promoting Egyptian craftsmanship. We connect talented artisans with customers who value authenticity, quality, and the human touch behind every product.

By choosing Manzili, you're supporting:
- **Local Artisans**: Providing sustainable income for Egyptian craftspeople
- **Cultural Heritage**: Preserving traditional crafts and techniques
- **Sustainable Consumption**: Choosing handmade over mass-produced goods
- **Community Building**: Creating connections between makers and buyers