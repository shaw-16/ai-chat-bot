const { getEmbedding } = require('./embeddings');
const fs = require('fs');
const path = require('path');

class VectorStore {
    constructor() {
        this.store = [];
    }

    async addDocument(text) {
        try {
            const embedding = await getEmbedding(text);
            this.store.push({ text, embedding });
        } catch (err) {
            console.error(`Failed to embed document: ${text}`, err);
        }
    }

    async similaritySearch(query, k = 2) {
        try {
            const queryEmbedding = await getEmbedding(query);
            const results = this.store.map(doc => ({
                text: doc.text,
                score: this.cosineSimilarity(queryEmbedding, doc.embedding)
            }));

            // Sort descending
            results.sort((a, b) => b.score - a.score);
            return results.slice(0, k);
        } catch (err) {
            console.error("Similarity search failed:", err);
            return [];
        }
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async loadData(filePath) {
        try {
            if (!fs.existsSync(filePath)) return;
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);
            console.log("Loading and embedding data... this may take a moment.");
            for (const item of data) {
                if (item.content) {
                    await this.addDocument(item.content);
                }
            }
            console.log(`Loaded ${this.store.length} items from ${filePath}`);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }
}

module.exports = new VectorStore();
