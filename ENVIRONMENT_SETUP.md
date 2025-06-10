# Environment Setup Guide

## ⚠️ Missing Environment Variables

Your server is failing to start because the required Supabase environment variables are missing.

## 🚀 Quick Fix

1. **Create a `.env` file** in your project root with the following content:

```env
# 7awel Crypto Wallet Backend - Environment Variables
NODE_ENV=development
PORT=3000

# Stytch Authentication (Required)
STYTCH_PROJECT_ID=your_stytch_project_id_here
STYTCH_SECRET=your_stytch_secret_here

# Supabase Database Configuration (Required)
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Optional Variables
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

2. **Get your Supabase credentials:**
   - Go to [supabase.com](https://supabase.com)
   - Sign in to your account
   - Select your project
   - Go to Settings → API
   - Copy the Project URL and API keys

3. **Get your Stytch credentials:**
   - Go to [stytch.com](https://stytch.com)
   - Sign in to your account
   - Copy your Project ID and Secret

## 🔧 Temporary Solution (For Testing Only)

If you want to test the server without Supabase, you can temporarily disable it by commenting out the Supabase imports in:

- `database/supabase.js`
- `services/activityLogger.js`
- `middleware/activityMiddleware.js`

## 📋 Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | ✅ Yes |
| `STYTCH_PROJECT_ID` | Your Stytch project ID | ✅ Yes |
| `STYTCH_SECRET` | Your Stytch secret key | ✅ Yes |
| `NODE_ENV` | Environment mode | ⚪ Optional |
| `PORT` | Server port | ⚪ Optional |

## 🚨 Current Error

```
Error: supabaseUrl is required.
```

This means `SUPABASE_URL` is not set in your environment variables.

## 🛠️ Next Steps

1. Create the `.env` file with your actual credentials
2. Restart the server with `npm run dev`
3. Your server should start successfully on port 3000

## 📞 Need Help?

Check the following guides in your project:
- `STYTCH_SETUP_GUIDE.md` - For Stytch configuration
- `IMPLEMENTATION_GUIDE.md` - For general setup
- `README.md` - For project overview 