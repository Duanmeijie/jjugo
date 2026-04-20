const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const axios = require('axios');

const AI_SYSTEM_PROMPT = '你是"九院易购"校园二手交易平台的智能客服助手。平台是九江学院学生专用的二手交易平台，支持商品发布、线下交易、交易码核验等功能。请用简洁友好的中文回答，控制在100字以内。如果用户问非平台相关问题，礼貌引导回平台业务。';
const AI_TIMEOUT = 8000;

let qaCache = [];
let cacheLoaded = false;

async function loadQACache() {
    if (cacheLoaded) return;
    try {
        const results = await query('SELECT * FROM chatbot_qa ORDER BY priority DESC');
        qaCache = results;
        cacheLoaded = true;
        console.log('[ChatBot] Loaded Q&A cache:', qaCache.length, 'records');
    } catch (err) {
        console.error('[ChatBot] Failed to load Q&A cache:', err);
    }
}

function matchKeywords(userInput, keywords) {
    const input = userInput.toLowerCase();
    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    const isMatch = keywordList.some(keyword => input.includes(keyword));
    console.log(`[ChatBot] Matching "${userInput}" with keywords [${keywords}]: ${isMatch}`);
    return isMatch;
}

function findBestAnswer(userMessage) {
    const trimmed = userMessage.trim();
    if (!trimmed) return null;

    let bestMatch = null;

    for (const qa of qaCache) {
        if (matchKeywords(trimmed, qa.keywords)) {
            console.log(`[ChatBot] Matched: ${qa.question} (priority: ${qa.priority})`);
            if (!bestMatch || qa.priority > bestMatch.priority) {
                bestMatch = qa;
            }
        }
    }

    console.log(`[ChatBot] Best match: ${bestMatch ? bestMatch.question : 'null'}, priority: ${bestMatch ? bestMatch.priority : 'N/A'}`);
    return bestMatch;
}

async function callAI(message) {
    const apiKey = process.env.OPENCODE_API_KEY;
    const apiUrl = process.env.OPENCODE_API_URL;
    const model = process.env.AI_MODEL;

    console.log('[ChatBot] AI Config - API Key:', apiKey ? 'set' : 'missing', 'API URL:', apiUrl ? 'set' : 'missing', 'Model:', model || 'missing');

    if (!apiKey || !apiUrl || !model) {
        console.error('[ChatBot] AI configuration missing, cannot call AI');
        return null;
    }

    try {
        console.log('[ChatBot] Calling AI API with message:', message);
        const response = await axios.post(
            apiUrl,
            {
                model: model,
                messages: [
                    { role: 'system', content: AI_SYSTEM_PROMPT },
                    { role: 'user', content: message }
                ],
                max_tokens: 300,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: AI_TIMEOUT
            }
        );

        console.log('[ChatBot] AI API response status:', response.status);
        console.log('[ChatBot] AI API response data:', JSON.stringify(response.data, null, 2));

        if (response.data && response.data.choices && response.data.choices[0]) {
            return response.data.choices[0].message.content;
        }
        console.error('[ChatBot] AI response format invalid');
        return null;
    } catch (err) {
        if (err.response) {
            console.error('[ChatBot] AI API error status:', err.response.status);
            console.error('[ChatBot] AI API error data:', err.response.data);
            if (err.response.status === 401) {
                console.error('[ChatBot] AI API Key is invalid');
            } else if (err.response.status === 429) {
                console.error('[ChatBot] AI API rate limit exceeded');
            }
        } else if (err.code === 'ECONNABORTED') {
            console.error('[ChatBot] AI API timeout after 8 seconds');
        } else {
            console.error('[ChatBot] AI API network error:', err.message);
        }
        return null;
    }
}

const DEFAULT_ANSWER = '抱歉，我可能没理解您的问题。您可以尝试咨询：如何发布商品、交易码怎么用、忘记密码怎么办。或联系管理员人工处理。';

router.post('/ask', async (req, res) => {
    try {
        await loadQACache();

        const { message } = req.body;
        console.log('[ChatBot] Received ask request:', message);

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ code: 400, msg: '请输入问题内容' });
        }

        const trimmed = message.trim();
        const matchedQA = findBestAnswer(trimmed);

        console.log('[ChatBot] Local match result:', matchedQA ? `${matchedQA.question} (priority: ${matchedQA.priority})` : 'none');

        if (matchedQA && matchedQA.priority >= 5) {
            console.log('[ChatBot] Returning high-priority local answer');
            return res.status(200).json({
                code: 200,
                data: {
                    answer: matchedQA.answer,
                    matched: true,
                    question: matchedQA.question,
                    source: 'local'
                }
            });
        }

        console.log('[ChatBot] No high-priority match, calling AI...');
        const aiAnswer = await callAI(trimmed);

        if (aiAnswer) {
            console.log('[ChatBot] AI answer received, returning AI answer');
            return res.status(200).json({
                code: 200,
                data: {
                    answer: aiAnswer,
                    matched: matchedQA ? true : false,
                    question: trimmed,
                    source: 'ai'
                }
            });
        }

        console.log('[ChatBot] AI call failed, checking fallback options...');

        if (matchedQA) {
            console.log('[ChatBot] Returning low-priority local answer as fallback');
            return res.status(200).json({
                code: 200,
                data: {
                    answer: matchedQA.answer,
                    matched: true,
                    question: matchedQA.question,
                    source: 'local'
                }
            });
        }

        console.log('[ChatBot] All options failed, returning default answer');
        return res.status(200).json({
            code: 200,
            data: {
                answer: DEFAULT_ANSWER,
                matched: false,
                question: trimmed,
                source: 'local'
            }
        });
    } catch (err) {
        console.error('[ChatBot] Chatbot error:', err);
        res.status(200).json({
            code: 200,
            data: {
                answer: DEFAULT_ANSWER,
                matched: false,
                source: 'local'
            }
        });
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

router.get('/mode', (req, res) => {
    const aiEnabled = !!(process.env.OPENCODE_API_KEY && process.env.OPENCODE_API_URL);
    res.status(200).json({
        code: 200,
        data: {
            ai_enabled: aiEnabled,
            model: process.env.AI_MODEL || null
        }
    });
});

module.exports = router;