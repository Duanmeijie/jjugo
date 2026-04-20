const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

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

function generateSmartReply(userMessage) {
    const input = userMessage.toLowerCase().trim();
    
    const generalReplies = [
        '您好！我是九院小助手，请问有什么可以帮您？',
        '感谢您的咨询！请问还有什么可以帮助您的？',
        '收到！如果您有关于平台交易的问题，我可以为您解答。',
        '明白！九院易购是九江学院专属的二手交易平台，欢迎随时咨询。',
    ];

    const platformGuides = {
        '怎么用': '九院易购使用很简单：1. 注册登录 2. 点击"发布"上传商品 3. 买家下单后线下交易 4. 使用交易码核验完成交易。',
        '是什么': '九院易购是九江学院学生专用的二手交易平台，可以买卖二手书、生活用品、电子产品等。支持线下交易和交易码核验，安全便捷！',
        '如何': '您可以：1. 访问首页浏览商品 2. 点击"发布"按钮上传商品 3. 在"个人中心"管理订单和收藏。有什么具体问题吗？',
        '可以': '可以的！平台支持二手商品交易，包括书籍、电子产品、生活用品等。交易需在线下完成，建议在校园内安全场所交易。',
        '能': '能的！您可以在这里买卖二手商品。发布商品完全免费，交易不收取手续费。',
        '好': '很高兴为您服务！请问还有什么问题？',
        '谢谢': '不客气！如有其他问题随时问我。',
        '请问': '请问有什么可以帮助您？',
        '？': '您好，请问想问什么？',
        '吗': '您可以换个方式描述您的问题，我会尽力帮您解答。',
    };

    for (const [key, reply] of Object.entries(platformGuides)) {
        if (input.includes(key)) {
            return reply;
        }
    }

    if (input.length < 4) {
        return generalReplies[Math.floor(Math.random() * generalReplies.length)];
    }

    return null;
}

const DEFAULT_ANSWER = '抱歉，我可能没理解您的问题。九院易购是九江学院二手交易平台，您可以尝试咨询：如何发布商品、交易码怎么用、忘记密码怎么办、怎么联系卖家等。或联系管理员人工处理。';

router.post('/ask', async (req, res) => {
    try {
        await loadQACache();

        const { message } = req.body;

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
    res.status(200).json({
        code: 200,
        data: {
            ai_enabled: false,
            model: 'local-enhanced',
            mode: '智能匹配 + 智能回复'
        }
    });
});

module.exports = router;
