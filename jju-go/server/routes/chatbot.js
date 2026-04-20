const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const axios = require('axios');

const AI_SYSTEM_PROMPT = '你是九院易购校园二手交易平台的智能客服。请用简洁中文回答，50字以内。如果用户问非平台问题，礼貌引导回平台业务。';
const AI_TIMEOUT = 8000;

let qaCache = [];
let cacheLoaded = false;

const FREE_MODELS = [
    { model: 'minimax-m2.1-free', endpoint: 'https://opencode.ai/zen/v1/messages', apiFormat: 'anthropic' },
    { model: 'kimi-k2.5-free', endpoint: 'https://opencode.ai/zen/v1/chat/completions', apiFormat: 'openai' },
    { model: 'big-pickle', endpoint: 'https://opencode.ai/zen/v1/chat/completions', apiFormat: 'openai' },
    { model: 'glm-4.7-flash', endpoint: 'https://opencode.ai/zen/v1/chat/completions', apiFormat: 'openai' },
];

async function loadQACache() {
    if (cacheLoaded) return;
    try {
        const results = await query('SELECT * FROM chatbot_qa ORDER BY priority DESC');
        qaCache = results;
        cacheLoaded = true;
    } catch (err) {
        console.error('[ChatBot] Failed to load Q&A cache:', err);
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

async function callOpenCodeAI(message, history = []) {
    const apiKey = process.env.OPENCODE_API_KEY;
    if (!apiKey) {
        console.log('[ChatBot] No API key configured, using local mode');
        return { answer: null, modelName: '本地离线模式' };
    }

    for (const modelInfo of FREE_MODELS) {
        try {
            console.log(`[ChatBot] Trying model: ${modelInfo.model} at ${modelInfo.endpoint}`);

            const messages = [
                { role: 'system', content: AI_SYSTEM_PROMPT },
                ...history.slice(-3).map(h => ({ role: h.isUser ? 'user' : 'assistant', content: h.text })),
                { role: 'user', content: message }
            ];

            let requestBody;
            let responseExtractor;

            if (modelInfo.apiFormat === 'anthropic') {
                requestBody = { model: modelInfo.model, messages, max_tokens: 300 };
                responseExtractor = (res) => res.data?.content?.[0]?.text || res.data?.output?.[0]?.text;
            } else {
                requestBody = { model: modelInfo.model, messages, max_tokens: 300 };
                responseExtractor = (res) => res.data?.choices?.[0]?.message?.content || res.data?.output?.text;
            }

            const response = await axios.post(
                modelInfo.endpoint,
                requestBody,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: AI_TIMEOUT
                }
            );

            const answer = responseExtractor(response);
            if (answer) {
                console.log(`[ChatBot] Success with model: ${modelInfo.model}`);
                return { answer, modelName: modelInfo.model };
            }
        } catch (err) {
            const status = err.response?.status;
            const statusText = err.response?.statusText;
            if (status === 401) {
                console.log(`[ChatBot] API key invalid for ${modelInfo.model}`);
                return { answer: null, modelName: 'API密钥无效' };
            }
            if (status === 429) {
                console.log(`[ChatBot] Rate limited for ${modelInfo.model}, trying next...`);
                await new Promise(r => setTimeout(r, 500));
                continue;
            }
            if (status === 404) {
                console.log(`[ChatBot] Model ${modelInfo.model} not found at this endpoint`);
                continue;
            }
            if (status === 400) {
                console.log(`[ChatBot] Bad request for ${modelInfo.model}: ${statusText}`);
                continue;
            }
            console.log(`[ChatBot] Error ${status} with ${modelInfo.model}: ${err.message}`);
        }
    }

    console.log('[ChatBot] All free models failed, falling back to local');
    return { answer: null, modelName: '本地离线模式' };
}

function generateSmartReply(userMessage) {
    const input = userMessage.toLowerCase().trim();

    const replies = {
        '怎么用': '九院易购：1.注册登录 2.点击发布上传商品 3.线下交易 4.交易码核验。",
        '是什么': '九院易购是九江学院二手交易平台，买卖二手书、物品等，支持线下交易！',
        '如何': '访问首页浏览商品，或点击发布按钮上传商品。有什么具体问题？',
        '可以': '可以的！平台支持二手商品交易，完全免费。',
        '能': '能的！买卖二手商品，免费发布。',
        '好': '您好！请问有什么可以帮您？',
        '谢谢': '不客气！',
        'hello': 'Hi! 我是九院小助手，请问能帮您什么？',
        'hi': '您好！',
    };

    for (const [key, reply] of Object.entries(replies)) {
        if (input.includes(key)) return reply;
    }

    if (input.length < 4) return '您好！请问想问什么？';
    return null;
}

const DEFAULT_ANSWER = '抱歉未能理解您的问题。您可以咨询：如何发布商品、交易码怎么用、忘记密码怎么办等。';

router.post('/ask', async (req, res) => {
    try {
        await loadQACache();
        const { message, history } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ code: 400, msg: '请输入问题内容' });
        }

        const trimmed = message.trim();
        const matchedQA = findBestAnswer(trimmed);

        if (matchedQA && matchedQA.priority >= 5) {
            return res.status(200).json({
                code: 200,
                data: {
                    answer: matchedQA.answer,
                    matched: true,
                    question: matchedQA.question,
                    source: 'local',
                    modelName: '本地离线模式'
                }
            });
        }

        const aiResult = await callOpenCodeAI(trimmed, history || []);

        if (aiResult.answer) {
            return res.status(200).json({
                code: 200,
                data: {
                    answer: aiResult.answer,
                    matched: matchedQA ? true : false,
                    question: trimmed,
                    source: 'ai',
                    modelName: aiResult.modelName
                }
            });
        }

        const smartReply = generateSmartReply(trimmed);
        if (smartReply) {
            return res.status(200).json({
                code: 200,
                data: {
                    answer: smartReply,
                    matched: matchedQA ? true : false,
                    question: trimmed,
                    source: 'local',
                    modelName: '本地离线模���'
                }
            });
        }

        if (matchedQA) {
            return res.status(200).json({
                code: 200,
                data: {
                    answer: matchedQA.answer,
                    matched: true,
                    question: matchedQA.question,
                    source: 'local',
                    modelName: '本地离线模式'
                }
            });
        }

        return res.status(200).json({
            code: 200,
            data: {
                answer: DEFAULT_ANSWER,
                matched: false,
                question: trimmed,
                source: 'local',
                modelName: '本地离线模式'
            }
        });
    } catch (err) {
        console.error('[ChatBot] Error:', err);
        res.status(200).json({
            code: 200,
            data: {
                answer: DEFAULT_ANSWER,
                matched: false,
                source: 'local',
                modelName: '本地离线模式'
            }
        });
    }
});

router.get('/hot-questions', async (req, res) => {
    try {
        await loadQACache();
        const hotQuestions = qaCache.sort((a, b) => b.priority - a.priority).slice(0, 5).map(q => ({
            id: q.id,
            question: q.question,
            category: q.category
        }));
        res.status(200).json({ code: 200, data: hotQuestions });
    } catch (err) {
        res.status(500).json({ code: 500, msg: '服务器内部错误' });
    }
});

router.get('/mode', (req, res) => {
    const aiEnabled = !!process.env.OPENCODE_API_KEY;
    res.status(200).json({
        code: 200,
        data: {
            ai_enabled: aiEnabled,
            models: FREE_MODELS.map(m => m.model)
        }
    });
});

module.exports = router;