import express from 'express';
import { AuthorizationCode } from 'simple-oauth2';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const router = express.Router();
const { JUDGEME_API_KEY, JUDGEME_API_SECRET, JUDGEME_REDIRECT_URI } = process.env;

const client = new AuthorizationCode({
    client: {
        id: JUDGEME_API_KEY,
        secret: JUDGEME_API_SECRET,
    },
    auth: {
        tokenHost: 'https://judge.me',
        tokenPath: '/oauth/token',
        authorizePath: '/oauth/authorize',
    },
});

router.get('/judgeme', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const scopes = [
        'read_shops', 'write_shops',
        'read_widgets',
        'read_orders', 'write_orders',
        'read_products', 'write_products',
        'read_reviewers', 'write_reviewers',
        'read_reviews', 'write_reviews',
        'read_settings', 'write_settings'
    ].join(' ');

    const authorizationUri = `https://judge.me/oauth/authorize?response_type=code&client_id=${JUDGEME_API_KEY}&redirect_uri=${encodeURIComponent(JUDGEME_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&state=${state}`;

    console.log('Redirecting to Judge.me authorization URL:', authorizationUri);
    res.redirect(authorizationUri);
});

router.get('/judgeme/callback', async (req, res) => {
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
        redirect_uri: JUDGEME_REDIRECT_URI,
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
