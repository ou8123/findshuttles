# Setting Up Netlify Identity for FindShuttles Admin

This document explains how to set up and configure Netlify Identity for your FindShuttles admin area.

## Overview

Netlify Identity provides authentication services that work seamlessly with Netlify-hosted sites. This implementation:

- Uses Netlify Identity for admin authentication
- Maintains backward compatibility with previous authentication methods
- Provides a streamlined login experience
- Handles role-based access (admin role)

## Step 1: Enable Netlify Identity in the Netlify Dashboard

1. Log in to your [Netlify Dashboard](https://app.netlify.com)
2. Select your FindShuttles site
3. Go to **Site settings** > **Identity**
4. Click **Enable Identity**

## Step 2: Configure Identity Settings

1. While in the Identity tab, configure the following settings:

### Registration Preferences
- Set to **Invite only** for security
- This prevents unauthorized users from signing up

### External Providers (Optional)
- You can enable providers like Google, GitHub, etc., if desired
- For simplicity, you may want to start with just email/password

### Email Templates
- Customize the invitation email template if desired

## Step 3: Invite Yourself as an Admin

1. In the Identity section, click **Invite users**
2. Enter your email address
3. Click **Send** to receive an invitation

## Step 4: Accept Invitation and Set Up Password

1. Check your email for the invitation
2. Click the link in the email to accept the invitation
3. When you click the link, you'll be redirected to the identity-callback page
4. The system will automatically detect the invite token and open the signup modal
5. Complete the signup form to set your password
6. After setting your password, you'll be redirected to the admin area

> **IMPORTANT**: If you click the invitation link and are directed to the homepage without a signup form, use one of these methods:
> - Try clicking the link again in a private/incognito browser window
> - Manually go to `/identity-callback#invite_token=YOUR_TOKEN` (replace YOUR_TOKEN with the token from your email link)
> - If all else fails, you can use the direct admin bypass page at `/emergency-admin` while we troubleshoot

## Step 5: Assign Admin Role

1. Go back to the Netlify Dashboard > Identity
2. Find your user in the list and click to view details
3. Under **Roles**, click **Edit roles**
4. Add the role `admin`
5. Save changes

This role is critical as the middleware checks for this role to grant admin access.

## Step 6: Test Login

1. Visit your site's secure login page (https://findshuttles.netlify.app/secure-access-9b1c3f5d7e)
2. Click "Sign In"
3. Enter your credentials
4. You should be redirected to the admin area upon successful authentication

## Troubleshooting

### Login Issues
- Make sure your user has the `admin` role assigned
- Check if the Netlify Identity service is enabled
- Try clearing cookies and cache if you're experiencing persistent issues

### Migration from Previous Auth
- The system supports both Netlify Identity and the previous authentication method
- If you encounter issues with Netlify Identity, you can use the "Try legacy login method" link on the login page

## Security Notes

- Netlify Identity tokens are stored in secure cookies handled by Netlify
- The admin area is protected by path obfuscation and role-based authentication
- All admin routes require authentication via the middleware

## Going Forward

Netlify Identity provides a reliable, managed authentication solution that works well with Netlify-hosted sites. As you become comfortable with this new auth method, the legacy authentication can eventually be removed.
