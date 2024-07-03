import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { getJudgeMeProductId } from './products.js'; // Import the function from products.js
import * as dfd from 'danfojs-node';

dotenv.config();

const router = express.Router();

console.log('open ai key:', process.env.OPENAI_API_KEY); // Debugging

router.get('/:product_external_id/:num_reviews', async (req, res) => {
    const shopifyProductId = req.params.product_external_id;
    const numReviews = parseInt(req.params.num_reviews);

    try {
        const judgeMeProductId = await getJudgeMeProductId(shopifyProductId);
        console.log(`Using Judge.me product ID: ${judgeMeProductId}`);

        const accessToken = process.env.JUDGEME_ACCESS_TOKEN;
        const perPage = 100; // Adjust this based on API limits
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
                break; // No more reviews available
            }

            allReviews = allReviews.concat(response.data.reviews);
            page++;
        }

        console.log(`Retrieved ${allReviews.length} reviews successfully.`);

        // Perform sentiment analysis, score reviews, and get top X reviews
        const topReviews = await analyzeAndScoreReviews(allReviews, numReviews);
        
        res.json(dfd.toJSON(topReviews, { format: 'row' }));
    } catch (error) {
        console.error('Error retrieving reviews:', error.message);
        if (error.response) {
            console.error('API Response Error:', error.response.data); // Log the API response error details
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

    console.log("df:" + df )
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
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    const sentiment = parseFloat(response.data.choices[0].message.content.trim());
    return isNaN(sentiment) ? 0 : sentiment;
}

export default router;
