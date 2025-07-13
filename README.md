# <img src="public/images/screenshots/icon.png" alt="Flow Balance Icon" width="48" style="vertical-align: middle;"> Flow Balance - Personal Finance Management System

[![CI](https://github.com/jomonylw/flow-balance/workflows/CI/badge.svg)](https://github.com/jomonylw/flow-balance/actions)
[![Docker Build](https://github.com/jomonylw/flow-balance/workflows/Docker%20Build%20and%20Release/badge.svg)](https://github.com/jomonylw/flow-balance/actions)

**Language:** [English](README.md) | [中文](README.zh_CN.md)

![Flow Balance](public/images/screenshots/og-image-en.png)

A professional personal finance management system built with modern web technologies, correctly
distinguishing between **stock** (assets/liabilities) and **flow** (income/expenses) concepts to
provide financial analysis and management tools for individuals.

## 🌟 Live Demo

**Try Flow Balance now:** [https://flow-balance.vercel.app](https://flow-balance.vercel.app)

**Demo Account:**

- Email: `demo@flowbalance.com`
- Password: `1234abcd`

> 💡 The demo account includes complete sample data so you can experience all features immediately.

## ✨ Core Features

### 📊 Professional Financial Concepts

- **Stock Concept**: Asset and liability accounts reflect financial position at specific points in
  time
- **Flow Concept**: Income and expense accounts reflect cash flows over specific periods
- **Standard Reports**: Provides balance sheet and cash flow statements

### 🚀 Smart Features

- **Smart Paste**: Excel-style batch data entry with copy-paste support and real-time validation
- **FIRE Calculator**: Financial independence path planning and timeline prediction
- **Recurring Transactions**: Automatically generate periodic transaction records
- **Loan Management**: Support for various repayment methods including equal installments and equal
  principal

### 💱 Multi-Currency Support

- **Global Currencies**: Support for major international currencies and custom currencies
- **Exchange Rate Management**: Manual entry or automatic API updates
- **Smart Conversion**: All amounts automatically converted to base currency for display

### 🎨 Modern Interface

- **Responsive Design**: Perfect adaptation for desktop and mobile devices
- **Theme Switching**: Light/dark themes with automatic system following
- **Internationalization**: Bilingual support (English/Chinese) with real-time switching

## 📸 Screenshots

### 💼 Dashboard Overview

<p align="center">
  <img src="public/images/screenshots/dashboard-overview-light-en.png" alt="Dashboard Overview" width="800"/>
</p>

### ⚡ Smart Paste Feature

<p align="center">
  <img src="public/images/screenshots/smart-paste-light-en.png" alt="Smart Paste Feature" width="800"/>
</p>

### 📊 Financial Reports

<p align="center">
  <img src="public/images/screenshots/financial-reports-light-en.png" alt="Financial Reports" width="800"/>
</p>

### 🎯 FIRE Calculator

<p align="center">
  <img src="public/images/screenshots/fire-calculator-light-en.png" alt="FIRE Calculator" width="800"/>
</p>

### 🌳 Tree Summary and Charts

<p align="center">
  <img src="public/images/screenshots/tree-summary-charts-en.png" alt="Tree Summary and Charts" width="800"/>
</p>

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15.3.3 (App Router)
- **UI**: React 19 + TypeScript 5 + Tailwind CSS 4
- **Charts**: ECharts 5.6.0
- **State Management**: React Context API
- **Data Validation**: Zod 3.25.67

### Backend

- **Runtime**: Node.js 20+
- **Database**: SQLite / PostgreSQL (Dynamic Detection)
- **ORM**: Prisma 6.9.0
- **Authentication**: JWT + bcryptjs
- **API**: Next.js API Routes

### Development Tools

- **Package Manager**: pnpm
- **Code Quality**: ESLint 9 + Prettier 3.5.3
- **Testing**: Jest 29.7.0 + Testing Library
- **Build**: Next.js Turbopack

## 🚀 Quick Deployment

### Docker Deployment (Recommended)

Flow Balance supports **dynamic database detection** - the same image can automatically choose
SQLite or PostgreSQL based on the `DATABASE_URL`.

#### SQLite Version (Personal Use)

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="file:/app/data/flow-balance.db" \
  -v flow-balance-data:/app/data \
  --restart unless-stopped \
  ghcr.io/jomonylw/flow-balance:latest
```

#### PostgreSQL Version (Production)

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@postgres:5432/flowbalance" \
  --restart unless-stopped \
  ghcr.io/jomonylw/flow-balance:latest
```

#### Docker Compose

```yaml
version: '3.8'
services:
  flow-balance:
    image: ghcr.io/jomonylw/flow-balance:latest
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=file:/app/data/flow-balance.db
    volumes:
      - flow-balance-data:/app/data
    restart: unless-stopped

volumes:
  flow-balance-data:
```

### Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)

#### Environment Variables

Configure the following environment variables in your Vercel project settings:

| Variable              | Description                                             | Example                                         |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| `DATABASE_URL`        | **Required** - PostgreSQL database connection string    | `postgresql://user:password@host:5432/database` |
| `JWT_SECRET`          | **Required** - JWT token signing secret (random string) | `your-super-secret-jwt-key-here`                |
| `NEXTAUTH_SECRET`     | **Required** - NextAuth.js authentication secret        | `your-nextauth-secret-key`                      |
| `NEXTAUTH_URL`        | **Required** - Complete application URL                 | `https://your-app.vercel.app`                   |
| `NEXT_PUBLIC_APP_URL` | **Required** - Public application URL                   | `https://your-app.vercel.app`                   |

#### Setup Steps

1. **Fork Project**: Click the "Deploy with Vercel" button above
2. **Configure Database**: Recommended to use free
   [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (Prisma-based)
3. **Set Environment Variables**: Add the above variables in Vercel project settings → Environment
   Variables
4. **Deploy Complete**: Vercel will automatically build and deploy the application

#### Vercel Postgres Configuration

1. In your Vercel project dashboard, go to the **Storage** tab
2. Click **Create Database** → Select **Postgres**
3. After creation, Vercel will automatically set the `DATABASE_URL` environment variable
4. Other environment variables need to be manually added to **Environment Variables**

#### Database Initialization

After first deployment, the database will automatically create table structure and seed data. For
manual initialization:

```bash
# Connect to production database locally
DATABASE_URL="your-production-database-url" pnpm db:migrate
DATABASE_URL="your-production-database-url" pnpm db:seed
```

> ⚠️ **Note**: Ensure the database URL includes correct SSL configuration, usually requires adding
> `?sslmode=require` parameter.

### Local Development

```bash
# Clone the project
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env.local

# Initialize database
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

---

**Flow Balance** - Visualize Your Personal Finance 🚀
