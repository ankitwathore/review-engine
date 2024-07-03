const NodeCache = require('node-cache');
const tokenCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

const setToken = (service, accessToken, refreshToken, expiresAt) => {
    tokenCache.set(service, { accessToken, refreshToken, expiresAt });
};

const getToken = (service) => {
    return tokenCache.get(service);
};

module.exports = { setToken, getToken };
