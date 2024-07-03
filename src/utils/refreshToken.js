const { AuthorizationCode } = require('simple-oauth2');
const { getToken, setToken } = require('./tokenStore');
require('dotenv').config();

const { JUDGEME_API_KEY, JUDGEME_API_SECRET } = process.env;

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

const refreshAccessToken = async () => {
    try {
        const tokenRecord = getToken('judgeme');
        console.log('Retrieved token:', tokenRecord);
        if (!tokenRecord) {
            throw new Error('No token found for Judge.me');
        }

        const token = client.createToken({
            access_token: tokenRecord.accessToken,
            refresh_token: tokenRecord.refreshToken,
            expires_at: tokenRecord.expires_at,
        });

        if (token.expired()) {
            const refreshedToken = await token.refresh();

            // Update token in the in-memory store
            console.log('Refreshing token:', refreshedToken.token);
            setToken('judgeme', refreshedToken.token.access_token, refreshedToken.token.refresh_token, refreshedToken.token.expires_at);

            return refreshedToken.token.access_token;
        }

        return tokenRecord.accessToken;
    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw error;
    }
};

module.exports = refreshAccessToken;
