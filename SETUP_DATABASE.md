# FoodMax - Database Setup Instructions

## Complete Your Setup

Your FoodMax application is ready! To finish the setup, you need to connect to a database.

### Step 1: Connect to Neon Database

1. Click [Connect to Neon](#open-mcp-popover) in the Builder.io interface
2. Follow the prompts to connect your Neon PostgreSQL database

### Step 2: Execute Database Schema

Once connected to Neon, execute the schema from `database/schema.sql` to create the required tables:

- `usuarios` - Main user table with authentication data
- `usuarios_contatos` - User contact information
- `login_attempts` - Track failed login attempts by IP
- `registration_attempts` - Track registrations by IP per day

### Step 3: Update Backend with Database Connection

After connecting to Neon, you'll need to update the authentication routes in `server/routes/auth.ts` to:

1. Replace placeholder database operations with actual SQL queries
2. Use the Neon connection for user registration, login, and onboarding
3. Implement proper session management

## Current Features

✅ **Complete UI/UX System**

- Modern, professional design with FoodMax branding
- Red, orange, yellow, white color scheme as requested
- Responsive design for all screen sizes

✅ **Authentication Pages**

- Login page with branding and form validation
- Registration with password requirements and reCAPTCHA
- Forgot password functionality
- Onboarding with user data completion and plan selection
- Dashboard with sidebar navigation

✅ **Security Features Ready**

- Password hashing with bcrypt
- IP-based registration limits (max 3 per day)
- Login attempt tracking (max 5 per day)
- Form validation and sanitization
- CAPTCHA verification

✅ **Database Schema**

- Complete table structure for users and contacts
- Indexes for performance optimization
- Automatic timestamp updates
- Sample admin user template

## Next Steps After Database Connection

1. Test user registration flow
2. Test login and authentication
3. Test onboarding process
4. Add email functionality for password reset
5. Implement session management and JWT tokens
6. Add more business-specific features

## Architecture Overview

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Express.js with type-safe API routes
- **Database**: PostgreSQL (via Neon)
- **Authentication**: bcrypt password hashing
- **Validation**: Zod schemas for type safety
- **Styling**: Custom FoodMax theme with Tailwind

The application follows best practices for security, type safety, and user experience as specified in your requirements.
