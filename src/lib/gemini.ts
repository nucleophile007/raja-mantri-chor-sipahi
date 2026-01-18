// Gemini API Integration for word generation

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Word categories for variety
const CATEGORIES = [
    'common objects',
    'animals',
    'foods',
    'professions',
    'places',
    'activities',
    'household items',
    'vehicles'
];

// Fallback words in case API fails
const FALLBACK_WORDS = [
    'ELEPHANT', 'PIZZA', 'DOCTOR', 'GUITAR', 'BEACH',
    'DANCING', 'TELEPHONE', 'BICYCLE', 'ASTRONAUT', 'RAINBOW',
    'UMBRELLA', 'PENGUIN', 'SPAGHETTI', 'FIREMAN', 'LIBRARY',
    'SWIMMING', 'TOASTER', 'HELICOPTER', 'MAGICIAN', 'VOLCANO'
];

export async function generateWord(): Promise<string> {
    // Race between actual generation and 10-second timeout
    return Promise.race([
        generateWordInternal(),
        timeoutPromise(10000)
    ]).catch((error) => {
        console.error('Word generation failed or timed out:', error);
        return getRandomFallbackWord();
    });
}

async function generateWordInternal(): Promise<string> {
    // If no API key, use fallback
    if (!GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY not set, using fallback words');
        return getRandomFallbackWord();
    }

    try {
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Generate ONE random word from the category "${category}" for a word guessing party game. 
                   Requirements:
                   - Single word only (no phrases)
                   - Common enough that most people would know it
                   - Easy to describe or act out
                   - Not offensive
                   - All uppercase letters
                   
                   Respond with ONLY the word, nothing else.`
                    }]
                }],
                generationConfig: {
                    temperature: 1.0,
                    maxOutputTokens: 20,
                }
            }),
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status);
            return getRandomFallbackWord();
        }

        const data = await response.json();

        // Extract word from response
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return getRandomFallbackWord();
        }

        // Clean up the response - extract just the word
        const word = text.trim().toUpperCase().replace(/[^A-Z]/g, '');

        if (word.length < 3 || word.length > 15) {
            return getRandomFallbackWord();
        }

        return word;
    } catch (error) {
        console.error('Failed to generate word from Gemini:', error);
        return getRandomFallbackWord();
    }
}

// Timeout helper
function timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
}

function getRandomFallbackWord(): string {
    return FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
}

// Test function
export async function testGeminiConnection(): Promise<boolean> {
    if (!GEMINI_API_KEY) {
        return false;
    }

    try {
        const word = await generateWord();
        return word.length > 0;
    } catch {
        return false;
    }
}
