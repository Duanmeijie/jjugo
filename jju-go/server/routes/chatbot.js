const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

let qaCache = [];
let cacheLoaded = false;

async function loadQACache() {
    if (cacheLoaded) return;
    try {
        const results = await query('SELECT * FROM chatbot_qa ORDER BY priority DESC');
        qaCache = results;
        cacheLoaded = true;
    } catch (err) {
        console.error('Failed to load Q&A cache:', err);
    }
}

function matchKeywords(userInput, keywords) {
    const input = userInput.toLowerCase();
    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    return keywordList.some(keyword => input.includes(keyword));
}

function findBestAnswer(userMessage) {
    const trimmed = userMessage.trim();
    if (!trimmed) return null;

    let bestMatch = null;

    for (const qa of qaCache) {
        if (matchKeywords(trimmed, qa.keywords)) {
            if (!bestMatch || qa.priority > bestMatch.priority) {
                bestMatch = qa;
            }
        }
    }

    return bestMatch;
}

router.post('/ask', async (req, res) => {
    try {
        await loadQACache();

        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ code: 400, msg: '请输入问题内容' });
        }

        const trimmed = message.trim();
        const matchedQA = findBestAnswer(trimmed);

        if (matchedQA) {
            return res.status(200).json({
                code: 200,
                data: {
                    answer: matchedQA.answer,
                    matched: true,
                    question: matchedQA.question
                }
            });
        } else {
            const defaultAnswer = '抱歉，我可能没理解您的问题。您可以尝试咨询：如何发布商品、交易码怎么用、忘记密码怎么办。或联系管理员人工处理。';
            return res.status(200).json({
                code: 200,
                data: {
                    answer: defaultAnswer,
                    matched: false,
                    question: trimmed
                }
            });
        }
    } catch (err) {
        console.error('Chatbot error:', err);
        res.status(500).json({ code: 500, msg: '服务器内部错误' });
    }
});

router.get('/hot-questions', async (req, res) => {
    try {
        await loadQACache();

        const hotQuestions = qaCache
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 5)
            .map(q => ({
                id: q.id,
                question: q.question,
                category: q.category
            }));

        res.status(200).json({ code: 200, data: hotQuestions });
    } catch (err) {
        console.error('Hot questions error:', err);
        res.status(500).json({ code: 500, msg: '服务器内部错误' });
    }
});

module.exports = router;