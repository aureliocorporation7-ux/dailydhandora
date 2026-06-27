if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const http = require('http');
const { URL } = require('url');
const axios = require('axios');

// Get arguments
const args = process.argv.slice(2);
const clientId = args[0] || process.env.BLOGGER_CLIENT_ID;
const clientSecret = args[1] || process.env.BLOGGER_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.log('\n❌ ERROR: Google OAuth2 Client ID and Client Secret are required.');
    console.log('Usage: node scripts/helpers/get-refresh-token.js <CLIENT_ID> <CLIENT_SECRET>\n');
    console.log('Or configure them in .env.local as BLOGGER_CLIENT_ID and BLOGGER_CLIENT_SECRET, then run without arguments.\n');
    process.exit(1);
}

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}`;

// Construct authorization URL
const scopes = ['https://www.googleapis.com/auth/blogger'];
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent`;

console.log('\n================================================================');
console.log('⚡ DailyDhandora Google OAuth2 Helper ⚡');
console.log('================================================================');
console.log('\n👉 Step 1: Open the link below in your browser and log in:');
console.log('\x1b[36m%s\x1b[0m', authUrl);
console.log('\n⏳ Waiting for you to authorize and redirect back...\n');

// Start temporary local server to listen for the redirect code
const server = http.createServer(async (req, res) => {
    try {
        const reqUrl = new URL(req.url, `http://${req.headers.host}`);
        const code = reqUrl.searchParams.get('code');

        if (code) {
            // Write visual success response in browser
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <html>
                    <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f7fafc; color: #2d3748;">
                        <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
                            <h1 style="color: #48bb78; margin-bottom: 10px;">✅ Authorization Successful!</h1>
                            <p style="font-size: 16px; margin-bottom: 20px;">You can now close this tab and return to the terminal/IDE.</p>
                        </div>
                    </body>
                </html>
            `);

            console.log('📥 Authorization code received! Exchanging for tokens...');

            // Exchange code for tokens
            const tokenParams = new URLSearchParams();
            tokenParams.append('client_id', clientId);
            tokenParams.append('client_secret', clientSecret);
            tokenParams.append('code', code);
            tokenParams.append('grant_type', 'authorization_code');
            tokenParams.append('redirect_uri', REDIRECT_URI);

            const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', tokenParams, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { refresh_token, access_token } = tokenResponse.data;

            console.log('\n================================================================');
            console.log('🎉 TOKENS OBTAINED SUCCESSFULLY!');
            console.log('================================================================');
            
            if (refresh_token) {
                console.log('\n🔑 Add this value to your .env.local file:');
                console.log('\x1b[32m%s\x1b[0m', `BLOGGER_REFRESH_TOKEN=${refresh_token}`);
                console.log('\n⚠️ Note: Keep this refresh token secret. It has lifetime access.');
            } else {
                console.log('\n⚠️ WARNING: Google did not return a refresh token.');
                console.log('This happens if you did not check all permissions, or you already authorized it recently.');
                console.log('Go to Google Account Settings -> Security -> Third-party apps with account access,');
                console.log('remove "Blogger Auto" access, and run this script again to prompt consent.');
            }
            console.log('================================================================\n');

            server.close(() => {
                console.log('🔌 Local helper server stopped. Exiting.');
                process.exit(0);
            });

        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing code parameter.');
        }
    } catch (err) {
        console.error('❌ Error handling redirect:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        process.exit(1);
    }
});

server.listen(PORT, () => {
    // Server is listening
});
