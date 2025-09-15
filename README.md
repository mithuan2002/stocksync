
# FlowStock - Inventory Management System

## Quick Setup for New Replit Environment

1. **Fork or Import this repository** to your Replit workspace

2. **Set up PostgreSQL Database:**
   - Open a new tab in Replit and type "Database"
   - Click "Create a database" 
   - This will automatically create the `DATABASE_URL` environment variable

3. **Configure Email Settings (Optional):**
   - Go to Secrets tab in your Replit environment
   - Add `EMAIL_PASSWORD` with your Gmail App Password
   - Note: You need to generate an App Password from your Google Account settings

4. **Run the Application:**
   - Click the "Run" button or use `npm run dev`
   - The database schema will be automatically created on first run
   - A demo seller account will be created for testing

## Features

- Multi-tenant inventory management
- Low stock email notifications to suppliers
- CSV import from Amazon and Shopify
- Real-time stock tracking
- Automatic database setup and migrations

## Email Configuration

For email notifications to work:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password for "Mail" 
3. Add the App Password to Replit Secrets as `EMAIL_PASSWORD`

## Database

The application uses PostgreSQL with automatic schema creation. When you run the app for the first time, it will:
- Create all necessary tables
- Set up foreign key relationships
- Create a demo seller account for testing

No manual database setup required!
