const axios = require('axios');
require('dotenv').config();

const getReviews = async (productId, accessToken) => {
    const response = await axios.get(`https://judge.me/api/v1/reviews?product_id=${productId}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    return response.data.reviews;
};

const getTopReviews = async (productId, numberOfReviews, accessToken) => {
    const reviews = await getReviews(productId, accessToken);
    
    // Placeholder: Sort reviews by rating and take the top X.
    reviews.sort((a, b) => b.rating - a.rating);
    return reviews.slice(0, numberOfReviews);
};

module.exports = {
    getTopReviews
};
