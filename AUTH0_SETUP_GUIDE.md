# Auth0 Setup Guide for FindShuttles Admin

This guide walks you through setting up Auth0 authentication for the FindShuttles admin system.

## Why Auth0?

- **Reliability**: Enterprise-grade authentication with 99.99% uptime
- **Security**: Modern security practices and regular updates
- **Easy Management**: User-friendly dashboard for managing users and access
- **Recommended by Netlify**: Auth0 is Netlify's recommended replacement for Netlify Identity

## Setup Instructions

### 1. Create an Auth0 Account

1. Go to [Auth0 Dashboard](https://auth0.com) and sign up for an account
2. Create a new tenant (organization) for your application

### 2. Create a New Application

1. In the Auth0 dashboard, go to "Applications" → "Create Application"
2. Name it "FindShuttles Admin"  
3. Select "Regular Web Application" as the application type
4. Click "Create"

### 3. Configure Application Settings

In the application settings page:

1. **Allowed Callback URLs**: 
   - Development: `http://localhost:3000/api/auth/callback`
   - Production: `https://findshuttles.netlify.app/api/auth/callback`

2. **Allowed Logout URLs**:
   - Development: `http://localhost:3000`
   - Production: `https://findshuttles.netlify.app`

3. **Allowed Web Origins**:
   - Development: `http://localhost:3000`
   - Production: `https://findshuttles.netlify.app`

4. Save the changes

### 4. Get Your Application Credentials

From the application settings page, note down:

- Domain (e.g., `your-tenant.auth0.com`)
- Client ID
- Client Secret

### 5. Configure Environment Variables

Add the following to your `.env` file and to your Netlify environment variables:

```
# Auth0 Configuration
AUTH0_SECRET='generate-a-32-char-hex-string'
AUTH0_BASE_URL='https://findshuttles.netlify.app'
AUTH0_ISSUER_BASE_URL='https://YOUR_AUTH0_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='your-client-id'
AUTH0_CLIENT_SECRET='your-client-secret'
AUTH0_AUDIENCE=''
AUTH0_SCOPE='openid profile email'
```

For the `AUTH0_SECRET`, you can generate a secure random value with:

```bash
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

### 6. Set Up Admin Role

1. Go to "User Management" → "Roles" in the Auth0 dashboard
2. Create a new role called "ADMIN"
3. Go to "User Management" → "Users"
4. Find your admin user (aiaffiliatecom@gmail.com)
5. Assign the "ADMIN" role to this user

### 7. Restart Your Application

- If running locally, restart your Next.js server
- If on Netlify, trigger a new deployment

## Testing the Auth0 Integration

1. Go to your application login page
2. Click "Sign in with Auth0"
3. You should be redirected to the Auth0 login page
4. After successful login, you should be redirected back to your admin area

## Troubleshooting

### Login Loop or Authentication Issues

- Check that your callback URLs are correctly configured in Auth0
- Verify all environment variables are set correctly 
- Try clearing your browser cookies and cache
- Check Auth0 logs for specific error messages

### Role Not Applied

- Make sure the user has been assigned the "ADMIN" role in Auth0
- Verify the role is being properly extracted in the Auth0 callback

## Migrating from Netlify Identity

The application is configured to try multiple authentication methods in sequence. 
Auth0 is now the primary method, but Netlify Identity and the legacy authentication 
will continue to work during the transition period.
