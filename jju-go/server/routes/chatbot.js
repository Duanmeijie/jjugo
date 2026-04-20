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
        console.error('[ChatBot] OPENCODE_API_KEY not configured');
        return null;
    }

    const endpoints = [
        'https://opencode.ai/zen/v1/chat/completions',
        'https://opencode.ai/zen/v1/responses'
    ];

    const models = ['minimax-m2.1', 'glm-4.7'];

    for (const endpoint of endpoints) {
        for (const model of models) {
            try {
                const messages = [
                    { role: 'system', content: AI_SYSTEM_PROMPT },
                    ...history.slice(-5).map(h => ({ role: h.isUser ? 'user' : 'assistant', content: h.text })),
                    { role: 'user', content: message }
                ];

                const response = await axios.post(
                    endpoint,
                    { model, messages, max_tokens: 300 },
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: AI_TIMEOUT
                    }
                );

                if (response.data) {
                    if (response.data.choices && response.data.choices[0]?.message?.content) {
                        return response.data.choices[0].message.content;
                    }
                    if (response.data.output?.text) {
                        return response.data.output.text;
                    }
                    if (response.data.content?.[0]?.text) {
                        return response.data.content[0].text;
                    }
                    if (response.data.error) {
                        console.error('[ChatBot] AI API error:', response.data.error);
                    }
                }
            } catch (err) {
                const status = err.response?.status;
                if (status === 401) {
                    console.error('[ChatBot] API Key 无效');
                    return null;
                }
                if (status === 429) {
                    console.error('[ChatBot] 速率限制，等待后重试...');
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                if (status === 404) {
                    console.log(`[ChatBot] 端点 ${endpoint} 不支持模型 ${model}，尝试下一个...`);
                    continue;
                }
                console.error(`[ChatBot] AI API 错误 (${status}):`, err.message);
            }
        }
    }

    console.error('[ChatBot] 所有 AI 端点和模型都已失败');
    return null;
}

function generateSmartReply(userMessage) {
    const input = userMessage.toLowerCase().trim();
    
    const platformGuides = {
        '怎么用': '九院易购使用很简单：1. 注册登录 2. 点击"发布"上传商品 3. 买家下单后线下交易 4. 使用交易码核验完成交易。',
        '是什么': '九院易购是九江学院学生专用的二手交易平台，可以买卖二手书、生活用品、电子产品等。支持线下交易和交易码核验，安全便捷！',
        '如何': '您可以：1. 访问首页浏览商品 2. 点击"发布"按钮上传商品 3. 在"个人中心"管理订单和收藏。有什么具体问题吗？',
        '可以': '可以的！平台支持二手商品交易，包括书籍、电子产品、生活用品等。交易需在线下完成，建议在校园内安全场所交易。',
        '能': '能的！您可以在这里买卖二手商品。发布商品完全免费，交易不收取手续费。',
        '好': '感谢您的支持！请问还有什么可以帮您？',
        '谢谢': '不客气！如有其他问题随时问我。',
    };

    for (const [key, reply] of Object.entries(platformGuides)) {
        if (input.includes(key)) {
            return reply;
        }
    }

    if (input.length < 4) {
        const greetings = ['您好！我是九院小助手，请问有什么可以帮您？', '收到！请问想问什么？'];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    return null;
}

const DEFAULT_ANSWER = '抱歉，我可能没理解您的问题。九院易购是九江学院二手交易平台，您可以尝试咨询：如何发布商品、交易码怎么用、忘记密码怎么办、怎么联系卖家等。或联系管理员人工处理。';

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
                    source: 'local'
                }
            });
        }

        const aiAnswer = await callOpenCodeAI(trimmed, history || []);

        if (aiAnswer) {
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

        const smartReply = generateSmartReply(trimmed);
        if (smartReply) {
            return res.status(200).json({
                code: 200,
                data: {
                    answer: smartReply,
                    matched: matchedQA ? true : false,
                    question: trimmed,
                    source: 'local'
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
                    source: 'local'
                }
            });
        }

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
    const aiEnabled = !!process.env.OPENCODE_API_KEY;
    res.status(200).json({
        code: 200,
        data: {
            ai_enabled: aiEnabled,
            model: process.env.AI_MODEL || 'minimax-m2.5-free'
        }
    });
});

module.exports = router;