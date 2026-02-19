/**
 * submission-created.js
 * Netlify event-triggered function — fires automatically when a verified
 * (non-Akismet-spam) form submission arrives for any form on the site.
 * We filter for our "reviews" form, run extra spam checks, then save to Supabase.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Server-side spam keyword list
const SPAM_KEYWORDS = [
  'viagra', 'casino', 'poker', 'bitcoin investment', 'crypto profit',
  'click here', 'buy now', 'free money', 'earn cash', 'make money fast',
  'lose weight', 'diet pill', 'payday loan', 'cheap meds', 'online pharmacy',
];

function isSpam(text) {
  if (!text) return false;
  const lower = text.toLowerCase();

  // 1. Contains any URL
  if (/https?:\/\/|www\./i.test(text)) return true;

  // 2. Matches a spam keyword
  if (SPAM_KEYWORDS.some(kw => lower.includes(kw))) return true;

  // 3. Excessive caps (>60% uppercase letters, min 10 chars)
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 10) {
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    if (upperCount / letters.length > 0.6) return true;
  }

  // 4. Repeated characters (e.g., "aaaaaaa")
  if (/(.)\1{6,}/.test(text)) return true;

  return false;
}

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body);

    // Only handle our "reviews" form
    if (payload.payload?.form_name !== 'reviews') {
      return { statusCode: 200, body: 'Not a reviews form — ignored.' };
    }

    const data = payload.payload?.data || {};
    const name = (data.name || 'Anonymous').trim().slice(0, 80);
    const rating = parseInt(data.rating, 10);
    const reviewText = (data['review-text'] || '').trim().slice(0, 800);

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      console.log('submission-created: invalid rating, skipping.');
      return { statusCode: 200, body: 'Invalid rating.' };
    }

    // Validate review text
    if (reviewText.length < 5) {
      console.log('submission-created: review too short, skipping.');
      return { statusCode: 200, body: 'Review too short.' };
    }

    // Server-side spam check
    if (isSpam(reviewText) || isSpam(name)) {
      console.log('submission-created: spam detected, not saving.');
      return { statusCode: 200, body: 'Spam detected.' };
    }

    // Save to Supabase via REST API (no npm package needed)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        name: name || 'Anonymous',
        rating,
        review_text: reviewText,
        approved: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('submission-created: Supabase error:', err);
      return { statusCode: 500, body: 'DB error.' };
    }

    console.log(`submission-created: saved review — "${name}" (${rating}★)`);
    return { statusCode: 200, body: 'Review saved.' };

  } catch (err) {
    console.error('submission-created: exception:', err);
    return { statusCode: 500, body: 'Internal error.' };
  }
};
