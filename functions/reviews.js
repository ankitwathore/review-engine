const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const dfd = require('danfojs-node');
const serverless = require('serverless-http');

dotenv.config();

const app = express();
const router = express.Router();

router.get('/:product_external_id/:num_reviews', async (req, res) => {
    const shopifyProductId = req.params.product_external_id;
    const numReviews = parseInt(req.params.num_reviews);

    try {
        const judgeMeProductId = await getJudgeMeProductId(shopifyProductId);

        const accessToken = process.env.JUDGEME_ACCESS_TOKEN;
        const perPage = 100; 
        let page = 1;
        let allReviews = [];

        while (true) {
            const url = `https://judge.me/api/v1/reviews?product_id=${judgeMeProductId}&page=${page}&per_page=${perPage}`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.data.reviews.length === 0) {
                break; 
            }

            allReviews = allReviews.concat(response.data.reviews);
            page++;
        }

        console.log(`Retrieved ${allReviews.length} reviews successfully.`);

        if (allReviews.length === 0) {
            return res.status(404).json({ error: 'No reviews found' });
        }

        const topReviews = await analyzeAndScoreReviews(allReviews, numReviews);

        res.json(dfd.toJSON(topReviews));
    } catch (error) {
        console.error('Error retrieving reviews:', error.message);
        if (error.response) {
            console.error('API Response Error:', error.response.data); 
            res.status(error.response.status).send(error.response.data);
        } else {
            res.status(500).send('Failed to retrieve reviews');
        }
    }
});

async function analyzeAndScoreReviews(reviews, numReviews) {
    const df = new dfd.DataFrame(reviews);
    const maxLength = 500; // Define the maximum length for full score
    const sentimentScores = [];
    const finalScores = [];

    for (let i = 0; i < df.shape[0]; i++) {
        const reviewBody = df.at(i, 'body');
        const reviewTitle = df.at(i, 'title');
        const combinedText = `Review Title: ${reviewTitle}. Review Body: ${reviewBody}`;

        // Get sentiment score
        const sentimentScore = await getSentiment(combinedText);

        // Calculate length score
        const reviewLength = reviewBody.length;
        const lengthScore = (reviewLength >= maxLength) ? 10 : (reviewLength / maxLength) * 10;

        // Normalize rating to 0-10
        const rating = df.at(i, 'rating') * 2; // Assuming rating is out of 5

        // Calculate the final score with weightage
        const finalScore = (sentimentScore * 0.40) + (lengthScore * 0.35) + (rating * 0.25);

        // Log the scores
        console.log(`Review Title: ${reviewTitle}`);
        console.log(`Review Body: ${reviewBody}`);
        console.log(`Sentiment Score: ${sentimentScore}`);
        console.log(`Length Score: ${lengthScore}`);
        console.log(`Rating Score: ${rating}`);
        console.log(`Final Score: ${finalScore}`);

        sentimentScores.push(parseFloat(sentimentScore));
        finalScores.push(finalScore);
    }
    
    df.addColumn('sentiment_score', sentimentScores, { inplace: true });
    df.addColumn('final_score', finalScores, { inplace: true });

    // Sort DataFrame by final score and get top numReviews
    const sortedDf = df.sortValues('final_score', { ascending: false });
    return sortedDf.head(numReviews);
}

async function getSentiment(text) {
    if (!text) return 0;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: `Analyze the sentiment of the following product review and provide a score between 0 (very negative) to 10 (very positive) Upto 3 decimal places. Only give me the score as response. Nothing else. The text is "${text}"` }],
        temperature: 0.5,
        max_tokens: 10,
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    const sentiment = parseFloat(response.data.choices[0].message.content.trim());
    return isNaN(sentiment) ? 0 : sentiment;
}

async function getJudgeMeProductId(shopifyProductId) {
    const accessToken = process.env.JUDGEME_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error('No access token found. Please set the access token in the environment variables.');
    }

    let page = 1;
    const perPage = 10;
    const url = `https://judge.me/api/v1/products`;

    while (true) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: {
                    page,
                    per_page: perPage
                }
            });

            const products = response.data.products;
            if (!products || !Array.isArray(products)) {
                throw new Error('Invalid response format');
            }

            for (let product of products) {
                if (product.external_id == shopifyProductId) {
                    console.log(`Matched product ID: ${product.id} for Shopify product ID: ${shopifyProductId}`);
                    return product.id;
                }
            }

            if (products.length < perPage) {
                break;
            }

            page++;
        } catch (error) {
            console.error('Error retrieving products:', error.message);
            if (error.response) {
                console.error('API Response Error:', error.response.data);
                throw new Error(error.response.data);
            } else {
                throw new Error('Failed to retrieve products');
            }
        }
    }

    throw new Error('Product not found.');
}

app.use('/.netlify/functions/reviews', router);

module.exports.handler = serverless(app);
