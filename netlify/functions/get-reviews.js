/**
 * get-reviews.js
 * Public proxy endpoint: GET /.netlify/functions/get-reviews
 * Queries Supabase for approved reviews and returns them as JSON.
 * Supabase keys are never exposed to the client.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    try {
        const url = `${SUPABASE_URL}/rest/v1/reviews?approved=eq.true&order=created_at.desc&limit=50&select=id,name,rating,review_text,created_at`;

        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('get-reviews: Supabase error:', err);
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Failed to fetch reviews.' }),
            };
        }

        const reviews = await res.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                // Cache for 30 seconds to reduce Supabase calls
                'Cache-Control': 'public, max-age=30',
            },
            body: JSON.stringify(reviews),
        };

    } catch (err) {
        console.error('get-reviews: exception:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Internal server error.' }),
        };
    }
};
