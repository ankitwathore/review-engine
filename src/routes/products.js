import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

console.log('Judge.me Access Token:', process.env.JUDGEME_ACCESS_TOKEN); // Debugging

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
            for (let product of products) {
                if (product.external_id == shopifyProductId) {
                    console.log(`Matched product ID: ${product.id} for Shopify product ID: ${shopifyProductId}`);
                    return product.id;
                }
            }

            // Check if there are more pages
            if (products.length < perPage) {
                break; // No more pages left
            }
            
            page++;
        } catch (error) {
            console.error('Error retrieving products:', error.message);
            if (error.response) {
                console.error('API Response Error:', error.response.data); // Log the API response error details
                throw new Error(error.response.data);
            } else {
                throw new Error('Failed to retrieve products');
            }
        }
    }

    throw new Error('Product not found.');
}

export { getJudgeMeProductId };
