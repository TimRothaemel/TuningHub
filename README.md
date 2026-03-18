# TuningHub (Open Source)

TuningHub was a specialized platform for moped and tuning enthusiasts with over 500 users.

Users were able to list parts with images and phone numbers and sell them directly without intermediaries.  
The platform mainly targeted Simson riders, 50cc enthusiasts, and tuning fans in the German-speaking region.

Note: The platform is currently offline and will most likely not return.

---

# Open Source

This project is now open source.

It is intended as:
- A learning resource for developers
- A real-world fullstack project example
- A base for similar marketplace platforms

You are free to explore, modify, and build upon this project.

---

# Vision

TuningHub aimed to create a simple, fast, and direct platform for buying and selling moped parts without unnecessary complexity.

---

# Tech Stack

## Frontend
- HTML
- CSS
- JavaScript
- Responsive Design
- Dark Mode

## Backend
- Supabase
  - Authentication
  - PostgreSQL Database
  - Storage (image uploads)
  - Tracking & Analytics

## Hosting
- Netlify (Frontend)
- Dedicated Supabase instances for:
  - Main App
  - Admin Dashboard

---

# Features

## User System
- Registration and login
- Phone number stored in `user_metadata`
- Account management and deletion
- Manage own listings

## Marketplace
- Create listings with:
  - Title
  - Description
  - Price
  - Condition
  - Phone number (select or add new)
  - Multiple image uploads
- Automatic user assignment
- Image compression for better performance

## Search & Discovery
- Fuzzy search
- Listing previews with images and price
- Direct contact via phone

## Admin Dashboard (TuningHubDashboard)
- Protected admin login
- Separate backend
- Tracks:
  - Logins
  - New users
  - Listings
  - Sales
  - Clicks
  - Deleted accounts

## Analytics Filters
- This hour
- Last 24 hours
- Last 7 days
- Last month
- Last year
- All time

---

# Security

- Supabase Auth (JWT)
- Row Level Security (RLS)
- Users can only access their own data
- Strict separation of admin access
- Separate Supabase instance for analytics

---

# Database Structure

## Table: parts
- id
- user_id
- title
- description
- price
- condition
- phone
- image_url
- created_at

## Table: events
- id
- type (login, part_created, click, purchase, delete_account, etc.)
- user_id
- metadata
- created_at

---

# Project Status

TuningHub is no longer actively maintained and is offline.

This repository exists to document the project and provide insight into its architecture and implementation.

---

# What You Can Learn From This Project

- Building a marketplace with Supabase
- Authentication & user data handling
- File uploads and optimization
- Tracking & analytics systems
- Structuring a real-world SaaS-style project

---

# Contributing

Contributions are welcome.

You can:
- Improve the code
- Refactor parts of the system
- Use it as a base for your own marketplace

---

# License

This project is licensed under the MIT License.

You are free to use, modify, and distribute this project.

---

# Contact

- GitHub: https://github.com/TimRothaemel
