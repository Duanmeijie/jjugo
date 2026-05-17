const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const axios = require('axios');

const AI_SYSTEM_PROMPT = '你是九院易购校园二手交易平台的智能客服。请用简洁中文回答，50字以内。如果用户问非平台问题，礼貌引导回平台业务。';
const AI_TIMEOUT = 10000;

const AVAILABLE_MODELS = [
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'DeepSeek', default: true },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', default: false },
    { id: 'minimax-m2.5-free', name: 'MiniMax M2.5', provider: 'OpenCode', default: false }
];

let qaCache = [];
let cacheLoaded = false;

async function loadQACache() {
    if (cacheLoaded) return;
    try {
        const results = await query('SELECT * FROM chatbot_qa ORDER BY priority DESC');
        qaCache = results;
        cacheLoaded = true;
        console.log('[ChatBot] Q&A loaded:', qaCache.length);
    } catch (err) {
        console.error('[ChatBot] Load Q&A error:', err.message);
    }
}

function matchKeyword(userMessage) {
    const input = userMessage.toLowerCase().trim();
    if (!input) return null;
    
    const keywords = {
        '你好': '您好！我是九院小助手，请问有什么可以帮您？',
        'hello': 'Hi! 我是九院小助手，很高兴为您服务！',
        'hi': '您好！请问能帮您什么？',
        '发布': '点击顶部"发布"按钮，填写商品信息、上传图片、设置价格后提交即可发布商品。',
        '卖': '点击"发布"按钮即可卖商品，填写信息后提交，买家会联系您线下交易。',
        '上架': '在"发布"页面填写商品信息、上传图片、设置价格，提交后即上架成功。',
        '购买': '浏览商品后点击"立即购买"，获取交易码后与卖家线下交易。',
        '密码': '登录页点击"忘记密码"可重置，或联系管理员协助处理。',
        '交易码': '买家支付后获得6位交易码，线下交易时出示给卖家核验，核验后订单完成。',
        '退款': '本平台为校园线下交易平台，钱款不经过平台。建议交易前当面确认商品。',
        '联系': '进入商品详情页可以给卖家留言，或查看卖家信息线下联系。',
        '感谢': '不客气！请问还有其他问题吗？',
        '谢谢': '不客气！很高兴能帮到您！',
        '再见': '再见！祝您使用愉快，有需要随时找我！',
        '拜拜': '拜拜！有问题随时咨询~',
    };
    
    for (const [key, reply] of Object.entries(keywords)) {
        if (input.includes(key)) {
            return reply;
        }
    }
    return null;
}

function localFallback(userMessage) {
    const input = userMessage.toLowerCase().trim();
    
    if (input.length < 2) {
        return '您好！请问想问什么？';
    }
    
    const matched = matchKeyword(userMessage);
    if (matched) {
        return matched;
    }
    
    if (input.includes('怎么') || input.includes('如何')) {
        return '您可以：1.访问首页浏览商品 2.点击发布上传商品 3.个人中心管理订单。有具体问题吗？';
    }
    
    if (input.includes('吗') || input.includes('?')) {
        return '是的！九院易购支持二手商品交易，完全免费。有其他问题吗？';
    }
    
    return '抱歉未能理解您的问题。您可以咨询：如何发布商品、交易码怎么用、忘记密码怎么办等。';
}

async function callDeepSeekApi(message, model, history) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    
    if (!apiKey) {
        console.log('[ChatBot] DeepSeek API key not configured');
        return { success: false, error: 'DeepSeek API密钥未配置' };
    }
    
    const messages = [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        ...history.slice(-5).map(h => ({ role: h.isUser ? 'user' : 'assistant', content: h.text })),
        { role: 'user', content: message }
    ];
    
    try {
        const response = await axios.post(
            apiUrl,
            { 
                model: model || 'deepseek-v4-flash', 
                messages: messages, 
                max_tokens: 500,
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
        
        const answer = response.data?.choices?.[0]?.message?.content;
        if (answer) {
            return { success: true, answer: answer, modelName: model || 'deepseek-v4-flash' };
        }
        return { success: false, error: 'AI返回为空' };
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        console.error('[ChatBot] DeepSeek API Error:', status, JSON.stringify(data || err.message));
        
        if (status === 401) {
            return { success: false, error: 'API密钥无效，请检查配置' };
        }
        if (status === 429) {
            return { success: false, error: '请求过于频繁，请稍后重试' };
        }
        if (status >= 500) {
            return { success: false, error: 'AI服务暂时不可用，请稍后重试' };
        }
        return { success: false, error: '网络错误: ' + (err.message || '未知错误') };
    }
}

async function callOpenCodeApi(message, model, history) {
    const apiKey = process.env.OPENCODE_API_KEY;
    const apiUrl = process.env.OPENCODE_API_URL || 'https://opencode.ai/zen/v1/chat/completions';
    
    if (!apiKey) {
        console.log('[ChatBot] OpenCode API key not configured');
        return { success: false, error: 'OpenCode API密钥未配置' };
    }
    
    const messages = [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        ...history.slice(-5).map(h => ({ role: h.isUser ? 'user' : 'assistant', content: h.text })),
        { role: 'user', content: message }
    ];
    
    try {
        const response = await axios.post(
            apiUrl,
            { model: model || 'minimax-m2.5-free', messages: messages, max_tokens: 500 },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: AI_TIMEOUT
            }
        );
        
        const answer = response.data?.choices?.[0]?.message?.content;
        if (answer) {
            return { success: true, answer: answer, modelName: model || 'minimax-m2.5-free' };
        }
        return { success: false, error: 'AI返回为空' };
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        console.error('[ChatBot] OpenCode API Error:', status, JSON.stringify(data || err.message));
        
        if (status === 401) {
            return { success: false, error: 'API密钥无效' };
        }
        if (status === 429) {
            return { success: false, error: '请求过于频繁，请稍后重试' };
        }
        if (status >= 400) {
            return { success: false, error: 'AI服务暂时不可用' };
        }
        return { success: false, error: '网络错误: ' + (err.message || '未知错误') };
    }
}

async function callAIApi(message, model, history) {
    const deepseekModels = ['deepseek-v4-flash', 'deepseek-chat'];
    const useModel = model || process.env.AI_MODEL || 'deepseek-v4-flash';
    
    if (deepseekModels.includes(useModel)) {
        return await callDeepSeekApi(message, useModel, history);
    } else {
        return await callOpenCodeApi(message, useModel, history);
    }
}

router.post('/ask', async (req, res) => {
    try {
        await loadQACache();
        
        const { message, history, model } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ code: 400, msg: '请输入问题内容' });
        }
        
        const userMessage = message.trim();
        const userSelectedModel = model || null;
        const defaultModel = process.env.AI_MODEL || 'deepseek-v4-flash';
        const useModel = userSelectedModel || defaultModel;
        
        console.log('[ChatBot] User:', userMessage, '| Model:', useModel);
        
        const aiResult = await callAIApi(userMessage, useModel, history || []);
        
        if (aiResult.success) {
            return res.status(200).json({
                code: 200,
                data: {
                    success: true,
                    reply: aiResult.answer,
                    source: 'ai',
                    modelName: aiResult.modelName || useModel
                }
            });
        }
        
        console.log('[ChatBot] AI failed, using local fallback');
        const localReply = localFallback(userMessage);
        
        return res.status(200).json({
            code: 200,
            data: {
                success: true,
                reply: localReply,
                source: 'local',
                modelName: '本地智能模式'
            }
        });
        
    } catch (err) {
        console.error('[ChatBot] Route error:', err);
        const fallbackReply = localFallback(req.body.message || '');
        res.status(200).json({
            code: 200,
            data: {
                success: true,
                reply: fallbackReply,
                source: 'local',
                modelName: '本地智能模式'
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
            .map(q => ({ id: q.id, question: q.question, category: q.category }));
        res.status(200).json({ code: 200, data: hotQuestions });
    } catch (err) {
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});

router.get('/models', (req, res) => {
    res.status(200).json({
        code: 200,
        data: {
            models: AVAILABLE_MODELS,
            default_model: process.env.AI_MODEL || 'deepseek-v4-flash'
        }
    });
});

router.get('/mode', (req, res) => {
    res.status(200).json({
        code: 200,
        data: {
            ai_enabled: !!(process.env.DEEPSEEK_API_KEY || process.env.OPENCODE_API_KEY),
            default_model: process.env.AI_MODEL || 'deepseek-v4-flash',
            deepseek_enabled: !!process.env.DEEPSEEK_API_KEY,
            opencode_enabled: !!process.env.OPENCODE_API_KEY
        }
    });
});

module.exports = router;
