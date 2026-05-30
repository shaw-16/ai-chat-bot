const https = require('https');

async function getEmbedding(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("No OPENAI_API_KEY found.");
        // Return a random vector for testing if no key (so app doesn't crash immediately)
        // But actually for RAG we need real embeddings.
        // throw new Error("Missing OPENAI_API_KEY");
        return new Array(1536).fill(0).map(() => Math.random());
    }

    const postData = JSON.stringify({
        model: "text-embedding-3-small",
        input: text
    });

    const options = {
        hostname: 'api.openai.com',
        path: '/v1/embeddings',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        console.error("OpenAI Embedding Error:", parsed.error);
                        reject(parsed.error);
                    } else {
                        resolve(parsed.data[0].embedding);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

module.exports = { getEmbedding };
