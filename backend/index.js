require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Gemini Setup
const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash'
});

// Load personal data
const dataPath = path.join(
    __dirname,
    'data',
    'personal_data.json'
);

let personalData = [];

try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    personalData = JSON.parse(rawData);
    console.log('Personal data loaded');
} catch (error) {
    console.error(error);
}

app.post('/api/ask', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({
            error: 'Question is required'
        });
    }

    try {
        const contextText = personalData
            .map(item => `${item.category}: ${item.content}`)
            .join('\n\n');

        const prompt = `
You are Ayush Shaw.

You answer exactly like Ayush would.

Information about Ayush:

${contextText}

Rules:
- Speak naturally
- Keep answers concise
- Use first person ("I", "my")
- Only use given information
- If unsure say:
"I don't have enough information about that."

Question:
${question}
`;

        const result =
            await model.generateContent(prompt);

        const answer =
            result.response.text();

        res.json({ answer });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            answer:
                "I'm having trouble thinking right now."
        });
    }
});

app.get('/', (req, res) => {
    res.send('Backend running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});