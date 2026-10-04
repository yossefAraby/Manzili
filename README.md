# Manzili

<p align="center">
  <img src="assets/logo.png" alt="Manzili Logo" width="400" />
</p>

<p align="center">
  A multi-vendor marketplace for <strong>handmade Egyptian products</strong>, <em>where real craft finds its home</em>.
</p>

<p align="center">
  <a href="https://manzili-mis.vercel.app" target="_blank">🔗 Live Demo</a> •
  <a href="docs/Manzili-Documentation.pdf" target="_blank">📄 Full Documentation (PDF)</a> •
  <a href="https://www.youtube.com/watch?v=jK2qTUqlOd0" target="_blank">🎬 Watch Trailer</a> •
  <a href="docs/Manzili-Interactive-Presentation.html" target="_blank">🎯 Interactive Defense</a>
</p>

## 📝 Project Overview

Manzili is a comprehensive graduation project (MIS) that bridges the gap between Egyptian artisans and customers. It provides a platform for sellers to showcase and sell handmade products while offering buyers a seamless shopping experience with secure payments, order tracking, and real-time communication.

## 📁 Repository Structure

```text
manzili/
├── backend-dotnet/        # .NET 10 Web API (ASP.NET Core + EF Core + PostgreSQL)
├── frontend/              # Next.js 16 storefront (React 19 + Redux Toolkit + Tailwind)
├── docs/                  # Documentation, presentation, and BMC assets
└── assets/                # Logo, banners, and images
```

The frontend communicates with the backend via REST API (`/api/v1/*`). The backend uses PostgreSQL hosted on Supabase as its primary database.

## ✨ Key Features

- **Multi-vendor marketplace** - Independent seller accounts with dedicated storefronts
- **Product management** - Variants, images, inventory tracking, and categorization
- **Shopping experience** - Cart, wishlist, reviews & ratings, product search & filtering
- **Secure payments** - Stripe (cards) & Kashier (Egyptian mobile wallets: Vodafone/Orange/Etisalat)
- **Order management** - Order tracking, shipments via Bosta integration
- **Real-time communication** - Chat between buyers and sellers
- **Authentication** - JWT (httpOnly cookies) with BCrypt password hashing & Google Sign-In
- **Media management** - Cloudinary integration for product images
- **Admin panel** - System administration and oversight

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Redux Toolkit](https://redux-toolkit.js.org/), [Tailwind CSS](https://tailwindcss.com/) |
| **Backend** | [.NET 10](https://dotnet.microsoft.com/) (ASP.NET Core), [EF Core 10](https://learn.microsoft.com/en-us/ef/core/), [Npgsql](https://www.npgsql.org/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (Supabase) with schema `manzili` |
| **Authentication** | JWT (HS256) over httpOnly cookies, BCrypt, Google OAuth |
| **Payments** | [Stripe](https://stripe.com/) (Cards), [Kashier](https://www.kashier.io/) (Mobile Wallets) |
| **Integrations** | [Cloudinary](https://cloudinary.com/) (Images), [Bosta](https://bosta.co/) (Shipping) |
| **Deployment** | [Vercel](https://vercel.com/) (Frontend), Docker (Backend), Supabase (Database) |

## 🚀 Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/)
- PostgreSQL instance (or Supabase project)

### 1. Clone the Repository

```bash
git clone https://github.com/yossefAraby/Manzili.git
cd Manzili
```

### 2. Backend Setup

```bash
cd backend-dotnet
dotnet run --project src/Manzili.Api --urls http://localhost:5080
```

- **Swagger UI**: [http://localhost:5080/swagger](http://localhost:5080/swagger)
- **Health Check**: [http://localhost:5080/api/v1/health](http://localhost:5080/api/v1/health)

> Development configuration (`ConnectionStrings:Default`, JWT, Stripe, Kashier, Cloudinary, Bosta keys) is read from `backend-dotnet/src/Manzili.Api/appsettings.Development.json` (git-ignored).

### 3. Frontend Setup

```bash
cd frontend/Manzili
npm install
npm run dev
```

The API base URL is configured in `frontend/Manzili/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5080/api/v1
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

| Document | Description |
|---|---|
| **[Full Documentation (PDF)](docs/Manzili-Documentation.pdf)** | Complete 97-page project documentation covering all aspects |
| **[Backend Documentation](docs/backend-documentation.html)** | Architecture, endpoints, business logic, and implementation details |
| **[Frontend Documentation](docs/frontend-documentation.html)** | Frontend architecture, components, state management, and API integration |
| **[Database Documentation](docs/database-documentation.html)** | Database schema, ERD, relationships, and data models |
| **[Interactive Defense Presentation](docs/Manzili-Interactive-Presentation.html)** | Interactive presentation used for graduation project defense |
| **[BMC (PDF)](docs/BMC.pdf)** | Business Model Canvas detailed document |

## 🎬 Media

- **[Watch Trailer](https://www.youtube.com/watch?v=jK2qTUqlOd0)** - Manzili Trailer - MIS Graduation Project

## 🌐 Live Deployment

- **Frontend**: [https://manzili-mis.vercel.app](https://manzili-mis.vercel.app) (Deployed on Vercel)
- **Backend**: AWS Deployed as Docker container (`backend-dotnet/Dockerfile`)
- **Database**: PostgreSQL hosted on Supabase

## ⚙️ Deployment Notes

- **CORS**: Configure `Manzili__CorsOrigin` to allow your deployed frontend origin(s)
- **Environment Variables**: Use environment variables for all secrets (never commit `.env` files)
- **Google Sign-In**: Add deployed origins to Authorized JavaScript Origins in Google Cloud Console
- **Payments**: Configure webhook URLs for Stripe/Kashier in production
- **Before production**: Rotate all credentials (Supabase, Stripe, Kashier, Bosta, Cloudinary, Google)

## 📄 License

This project is licensed under the [MIT License](LICENSE.md).
