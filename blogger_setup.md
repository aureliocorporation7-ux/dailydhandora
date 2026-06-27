# Google Blogger API Setup Guide

This guide describes how to configure the Blogger API integration for DailyDhandora, allowing the bots and the admin panel to auto-post articles directly to your Blogspot blog.

---

## Step 1: Create your Blogger Blog
1. Visit [Blogger.com](https://www.blogger.com) and log in with your Gmail.
2. Create a new blog named **Daily Dhandora** (or choice of your name).
3. Choose a free subdomain URL, such as `dailydhandora.blogspot.com`.
4. Finish the blogger setup.

---

## Step 2: Set up Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with the same Gmail account.
3. Click the Project Selector dropdown at the top, select **New Project**, name it `Blogger Auto`, and create it.
4. Once created, make sure the project is active in the top dropdown.
5. In the top search bar, type `Blogger API v3`, click on it, and click the blue **Enable** button.

---

## Step 3: Configure the OAuth Consent Screen
*Google requires setting up a consent screen before creating credentials.*

1. In the left navigation menu, click **APIs & Services** > **OAuth consent screen**.
2. Select **External** and click **Create**.
3. Under **App Information**, enter:
   - **App name:** `Blogger Auto`
   - **User support email:** (select your Gmail)
   - **Developer contact information:** (enter your Gmail)
4. Click **Save and Continue** at the bottom.
5. On the **Scopes** screen, simply click **Save and Continue** (no action needed).
6. On the **Test Users** screen, click **+ ADD USERS**, type in **your own Gmail address**, and click **Add**. *(CRITICAL: Google only allows authorized test users to use the app in testing mode).*
7. Click **Save and Continue**, then click **Back to Dashboard** on the Summary screen.

---

## Step 4: Create OAuth Client Credentials
1. In the left navigation menu, click **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
3. Select **Web application** under **Application type**.
4. In the **Name** field, enter: `Blogger Auto Client`.
5. Scroll down to the **Authorized redirect URIs** section.
6. Click **ADD URI** and paste exactly:
   ```text
   http://localhost:3000
   ```
7. Click **Create** at the bottom.
8. A popup will display containing:
   - **Your Client ID** (a long string ending in `.apps.googleusercontent.com`)
   - **Your Client Secret** (a secret code string)
9. Copy both of these values!

---

## Step 5: Generate the Blogger Refresh Token
*Now we will run our helper script locally to generate the lifetime Refresh Token.*

1. Open your terminal or IDE terminal in the project directory.
2. Run the helper script with your Client ID and Client Secret as arguments:
   ```bash
   node scripts/helpers/get-refresh-token.js <YOUR_CLIENT_ID> <YOUR_CLIENT_SECRET>
   ```
3. The terminal will output a Google Login URL. Copy it and open it in your browser.
4. Go through the Google login process. *If Google warning displays "Google hasn't verified this app", click "Advanced" and then "Go to Blogger Auto (unsafe)" to proceed.*
5. Grant permissions to Blogger.
6. Once authorized, it will redirect to a blank page saying "Authorization Successful!"
7. Return to your terminal. The script will print the generated token line:
   ```text
   BLOGGER_REFRESH_TOKEN=1//09a...
   ```

---

## Step 6: Configure `.env.local`
Add the following four variables to your `/Users/abhishekabhishek/Documents/dailydhandora/.env.local` file:

```env
# Google Blogger Integration
BLOGGER_CLIENT_ID=your_client_id_here
BLOGGER_CLIENT_SECRET=your_client_secret_here
BLOGGER_REFRESH_TOKEN=your_refresh_token_here
BLOGGER_BLOG_ID=your_blogger_blog_id_here
```

### How to find your BLOGGER_BLOG_ID:
1. Open your [Blogger Dashboard](https://www.blogger.com).
2. Look at the browser URL in the address bar. It looks like:
   `https://www.blogger.com/blog/posts/6504285816999999999`
3. The number after `/posts/` (e.g., `6504285816999999999`) is your **Blog ID**. Copy it and use it.

---

## Setup Complete!
Once the keys are saved in `.env.local`, the next time the bots run or you publish/update an article from the admin panel, the system will automatically handle the posting on your blogspot blog in the background. If you want to disable or configure it, simply comment out or delete these environment variables from `.env.local` and it will fall back to off state automatically.
