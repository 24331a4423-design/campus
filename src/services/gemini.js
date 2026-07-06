const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

/**
 * Compares a lost item and a found item using Gemini 1.5 Flash API.
 * Returns similarity, differences, match score, and recommendations.
 * 
 * @param {object} lost - The lost item details.
 * @param {object} found - The found item details.
 * @returns {Promise<{matchScore: number, similarities: string, differences: string, confidence: 'Low'|'Medium'|'High', recommendation: string}>}
 */
export const compareItems = async (lost, found) => {
  if (!API_KEY) {
    console.warn('Gemini API key is not configured. Falling back to local heuristic matching.');
    return getLocalFallbackMatch(lost, found);
  }

  const prompt = `
You are an AI matching assistant for the Campus Guardian Lost & Found system.
Compare the following Lost Item and Found Item details:

LOST ITEM:
- Name: ${lost.item_name}
- Category: ${lost.category}
- Brand: ${lost.brand || 'N/A'}
- Color: ${lost.color || 'N/A'}
- Description: ${lost.description}
- Date Lost: ${lost.date_lost}
- Location: ${lost.location}

FOUND ITEM:
- Name: ${found.item_name}
- Category: ${found.category}
- Brand: ${found.brand || 'N/A'}
- Color: ${found.color || 'N/A'}
- Description: ${found.description}
- Date Found: ${found.date_found}
- Location: ${found.location}

Analyze their similarity. Return a JSON object with EXACTLY the following structure (no markdown formatting, just raw JSON, and no other text outside of this JSON):
{
  "matchScore": <number between 0 and 100>,
  "similarities": "<detailed description of similarities>",
  "differences": "<detailed description of differences>",
  "confidence": "<Low | Medium | High>",
  "recommendation": "<detailed action recommendation>"
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('Gemini API error response:', errBody);
      throw new Error(`Gemini API ${response.status}: ${errBody?.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonText) {
      console.error('Gemini full response:', JSON.stringify(result));
      throw new Error('Empty response from Gemini API');
    }

    const matchData = JSON.parse(jsonText.trim());
    return {
      matchScore: Number(matchData.matchScore) || 0,
      similarities: matchData.similarities || 'No similarities detailed.',
      differences: matchData.differences || 'No differences detailed.',
      confidence: matchData.confidence || 'Low',
      recommendation: matchData.recommendation || 'No recommendation provided.'
    };
  } catch (error) {
    console.error('Gemini call failed — falling back to local heuristic. Reason:', error.message);
    // Return heuristic match if API call fails
    return getLocalFallbackMatch(lost, found);
  }
};

/**
 * Local heuristic matching for fallback mode (when key is missing or request fails).
 */
const getLocalFallbackMatch = (lost, found) => {
  let score = 0;
  const similarities = [];
  const differences = [];

  // Name similarity (simple token check)
  const lostTokens = lost.item_name.toLowerCase().split(/\s+/);
  const foundTokens = found.item_name.toLowerCase().split(/\s+/);
  const commonTokens = lostTokens.filter(token => foundTokens.includes(token));

  if (commonTokens.length > 0) {
    score += commonTokens.length * 15;
    similarities.push(`Item names share common keywords: "${commonTokens.join(', ')}".`);
  } else {
    differences.push('Item names do not have matching keywords.');
  }

  // Category match
  if (lost.category.toLowerCase() === found.category.toLowerCase()) {
    score += 35;
    similarities.push(`Both items are categorized under "${lost.category}".`);
  } else {
    differences.push(`Different categories: Lost is "${lost.category}", Found is "${found.category}".`);
  }

  // Brand match
  if (lost.brand && found.brand && lost.brand.toLowerCase() === found.brand.toLowerCase()) {
    score += 20;
    similarities.push(`Both items are of the brand "${lost.brand}".`);
  } else if (lost.brand || found.brand) {
    differences.push(`Brand mismatch: Lost is "${lost.brand || 'N/A'}", Found is "${found.brand || 'N/A'}".`);
  }

  // Color match
  if (lost.color && found.color && lost.color.toLowerCase() === found.color.toLowerCase()) {
    score += 15;
    similarities.push(`Both items are color "${lost.color}".`);
  } else if (lost.color || found.color) {
    differences.push(`Color mismatch: Lost is "${lost.color || 'N/A'}", Found is "${found.color || 'N/A'}".`);
  }

  // Cap score at 95 for fallback heuristic, min at 0
  score = Math.max(0, Math.min(95, score));

  // Determine confidence
  let confidence = 'Low';
  if (score >= 70) confidence = 'High';
  else if (score >= 40) confidence = 'Medium';

  let recommendation = 'No matches recommended. Descriptions are dissimilar.';
  if (score >= 70) {
    recommendation = '[Demo Mode Suggestion] Highly likely match. The student is advised to initiate a manual verification claim.';
  } else if (score >= 40) {
    recommendation = '[Demo Mode Suggestion] Potential match. Review color and description fields before claiming.';
  }

  return {
    matchScore: score,
    similarities: similarities.join(' ') || 'No significant keyword similarities found.',
    differences: differences.join(' ') || 'No significant structural differences identified.',
    confidence,
    recommendation
  };
};
