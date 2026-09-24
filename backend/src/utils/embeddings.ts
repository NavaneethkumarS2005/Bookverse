export const generateEmbedding = async (text: string): Promise<number[]> => {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            console.warn('No valid Gemini API Key found. Returning zero vector.');
            return new Array(768).fill(0);
        }

        // Debug: print key prefix to verify correct key is loaded
        console.log(`Using key starting with: ${apiKey.substring(0, 8)}...`);

        // text-embedding-004 is on the v1beta endpoint
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/text-embedding-004',
                    content: { parts: [{ text }] }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(data?.error || data));
        }

        const values: number[] = data?.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
            return values;
        }

        return new Array(768).fill(0);
    } catch (error) {
        console.error('Failed to generate embedding:', error);
        return new Array(768).fill(0);
    }
};
