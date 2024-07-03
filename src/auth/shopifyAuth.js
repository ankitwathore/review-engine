import express from 'express';
import { AuthorizationCode } from 'simple-oauth2';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_REDIRECT_URI } = process.env;

const client = new AuthorizationCode({
    client: {
        id: SHOPIFY_API_KEY,
        secret: SHOPIFY_API_SECRET,
    },
    auth: {
        tokenHost: 'https://shopify.com',
        tokenPath: '/oauth/token',
        authorizePath: '/oauth/authorize',
    },
});

router.get('/shopify', (req, res) => {
    const state = Math.random().toString(36).substring(7);
    const authorizationUri = `https://shopify.com/oauth/authorize?response_type=code&client_id=${SHOPIFY_API_KEY}&redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}&scope=read_reviews write_reviews&state=${state}`;

    console.log('Redirecting to Shopify authorization URL:', authorizationUri);
    res.redirect(authorizationUri);
});

router.get('/shopify/callback', async (req, res) => {
    console.log('Entered callback route');
    const { code, state } = req.query;
    console.log('Authorization code received:', code);
    console.log('State received:', state);

    if (!code) {
        console.error('No authorization code received');
        return res.status(400).send('No authorization code received');
    }

    const options = {
        code,
        redirect_uri: SHOPIFY_REDIRECT_URI,
    };

    try {
        const accessToken = await client.getToken(options);
        console.log('Access Token:', accessToken.token.access_token);
        console.log('Refresh Token:', accessToken.token.refresh_token);
        console.log('Expires At:', accessToken.token.expires_at);

        res.json({
            access_token: accessToken.token.access_token,
            refresh_token: accessToken.token.refresh_token,
            expires_at: accessToken.token.expires_at,
        });
    } catch (error) {
        console.error('Error during token retrieval:', error.message);
        console.error('Error details:', error.data);
        res.status(500).send('Failed to retrieve access token');
    }
});

export default router;
