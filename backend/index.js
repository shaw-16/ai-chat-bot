require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');
const vectorStore = require('./vectorStore');
const { persona } = require('./personaPrompt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Initialize Vector Store
const dataPath = path.join(__dirname, 'data', 'personal_data.json');
vectorStore.loadData(dataPath);

// Helper for Chat Completion
function getChatCompletion(messages) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Promise.resolve("Configuration Error: No OpenAI API Key found in backend.");

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: "gpt-4o-mini", // or gpt-3.5-turbo
            messages: messages,
            temperature: 0.7
        });

        const options = {
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        console.error("LLM Error:", parsed.error);
                        resolve("I'm sorry, I'm having trouble thinking right now.");
                    } else {
                        resolve(parsed.choices[0].message.content);
                    }
                } catch (e) {
                    resolve("Error parsing response.");
                }
            });
        });

        req.on('error', (e) => resolve("Connection error."));
        req.write(postData);
        req.end();
    });
}

app.post('/api/ask', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    try {
        console.log(`User asked: ${question}`);

        // 1. Retrieve Context
        const contextDocs = await vectorStore.similaritySearch(question, 2);
        const contextText = contextDocs.map(c => c.text).join('\n---\n');
        console.log(`Retrieved context:\n${contextText}`);

        // 2. Construct Prompt
        const systemPrompt = persona.replace('{context}', contextText).replace('{question}', question);

        // 3. Call LLM
        const answer = await getChatCompletion([
            { role: "system", content: systemPrompt },
            // We put everything in system prompt as per user instructions "Strict system prompt", 
            // but typically user msg goes in user. 
            // The prompt template had "Question: {question}" inside it, so we can just send one system message 
            // or split it. The instruction said "Inject them into the LLM prompt".
            // Let's keep it simple: System has persona + context.
            // User message has the question.
            // Re-reading prompt template in personaPrompt.js: it ends with "Answer:".
            // So it's designed to be a completion-style prompt or a single system message.
            // I'll stick to passing it as a single system message for strict adherence, 
            // OR: System: Persona + Context. User: Question.
            // Let's refactor slightly to be more Chat-native.
        ]);

        // Correction: The persona string handles the full injection. 
        // So sending it as one block is fine for the "System" role or just "User" role if avoiding system 
        // constraints, but System is best for Persona.

        console.log(`Answer: ${answer}`);
        res.json({ answer });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
