const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const axios = require('axios');

const AI_SYSTEM_PROMPT = '你是九院易购校园二手交易平台的智能客服。请用简洁中文回答，50字以内。如果用户问非平台问题，礼貌引导回平台业务。';
const AI_TIMEOUT = 8000;

let qaCache = [];
let cacheLoaded = false;

const_FREE_MODELS = [
    { model: 'minimax-m2.5-free', endpoint: 'https://opencode.ai/zen/v1/chat/completions', apiFormat: 'openai' },
    { model: 'glm-4-flash', endpoint: 'https://opencode.ai/zen/v1/chat/completions', apiFormat: 'openai' },
    { model: 'qwen-turbo', endpoint: 'https://opencode.ai/zen/v1/chat/completions', apiFormat: 'openai' },
    { model: 'nemotron-3-8b', endpoint: 'https://opencode.ai/zen/v1/chat/completions', apiFormat: 'openai' },
];

async function loadQACache() {
    if (cacheLoaded) return;
    try {
        const results = await query('SELECT * FROM chatbot_qa ORDER BY priority DESC');
        qaCache = results;
        cacheLoaded = true;
        console.log('[ChatBot] Q&A cache loaded:', qaCache.length);
    } catch (err) {
        console.error('[ChatBot] Load Q&A failed:', err.message);
    }
}

function findBestAnswer(userMessage) {
    const trimmed = userMessage.trim().toLowerCase();
    if (!trimmed) return null;
    let bestMatch = null;
    for (const qa of qaCache) {
        const keywords = qa.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
        if (keywords.some(k => trimmed.includes(k))) {
            if (!bestMatch || qa.priority > bestMatch.priority) {
                bestMatch = qa;
            }
        }
    }
    return bestMatch;
}

async function callOpenCodeAI(message, history = [], userModel = null) {
    const apiKey = process.env.OPENCODE_API_KEY;
    if (!apiKey) {
        return { success: false, error: 'API密钥未配置', modelName: '' };
    }

    let modelsToTry = _FREE_MODELS;
    
    if (userModel) {
        console.log('[ChatBot] User selected model:', userModel);
        const found = _FREE_MODELS.find(m => m.model === userModel);
        modelsToTry = found ? [found] : [{ model: userModel, endpoint: 'https://opencode.ai/zen/v1/chat/completions', apiFormat: 'openai' }];
    }

    for (const modelInfo of modelsToTry) {
        try {
            console.log('[ChatBot] Calling:', modelInfo.model);
            
            const messages = [
                { role: 'system', content: AI_SYSTEM_PROMPT },
                ...history.slice(-3).map(h => ({ role: h.isUser ? 'user' : 'assistant', content: h.text })),
                { role: 'user', content: message }
            ];

            const response = await axios.post(
                modelInfo.endpoint,
                { model: modelInfo.model, messages, max_tokens: 300 },
                {
                    headers: {
                        'Authorization': 'Bearer ' + apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: AI_TIMEOUT
                }
            );

            const answer = response.data?.choices?.[0]?.message?.content;
            if (answer) {
                console.log('[ChatBot] Success:', modelInfo.model);
                return { success: true, answer: answer, modelName: modelInfo.model };
            }
        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            console.error('[ChatBot] Error:', status, JSON.stringify(data || err.message));
            
            if (status === 401) {
                return { success: false, error: 'API密钥无效', modelName: '' };
            }
            if (status === 429) {
                continue;
            }
            if (status >= 400) {
                continue;
            }
        }
    }

    return { success: false, error: '所有模型均不可用', modelName: '' };
}

const DEFAULT_FALLBACK = '抱歉，AI模型暂未响应，请稍后再试或联系管理员。';

router.post('/ask', async (req, res) => {
    try {
        await loadQACache();
        const { message, history, model } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ code: 400, msg: '请输入问题内容' });
        }

        const trimmed = message.trim();
        const matchedQA = findBestAnswer(trimmed);
        const userSelectedModel = model || null;

        if (matchedQA && matchedQA.priority >= 5) {
            return res.status(200).json({
                code: 200,
                data: {
                    success: true,
                    answer: matchedQA.answer,
                    matched: true,
                    question: matchedQA.question,
                    source: 'local',
                    modelName: '本地离线模式'
                }
            });
        }

        const aiResult = await callOpenCodeAI(trimmed, history || [], userSelectedModel);

        if (aiResult.success) {
            return res.status(200).json({
                code: 200,
                data: {
                    success: true,
                    answer: aiResult.answer,
                    matched: matchedQA ? true : false,
                    question: trimmed,
                    source: 'ai',
                    modelName: aiResult.modelName
                }
            });
        }

        return res.status(200).json({
            code: 200,
            data: {
                success: false,
                answer: aiResult.error || DEFAULT_FALLBACK,
                matched: false,
                question: trimmed,
                source: 'error',
                modelName: aiResult.modelName || 'AI调用失败'
            }
        });
    } catch (err) {
        console.error('[ChatBot] Route error:', err);
        res.status(200).json({
            code: 200,
            data: {
                success: false,
                answer: DEFAULT_FALLBACK,
                matched: false,
                source: 'error',
                modelName: ''
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
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});

router.get('/mode', (req, res) => {
    res.status(200).json({
        code: 200,
        data: {
            ai_enabled: !!process.env.OPENCODE_API_KEY,
            models: _FREE_MODELS.map(m => m.model)
        }
    });
});

module.exports = router;