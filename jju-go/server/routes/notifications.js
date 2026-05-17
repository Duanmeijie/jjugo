const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const NOTIFICATION_TYPES = {
    ORDER_CREATED: 'order_created',
    ORDER_COMPLETED: 'order_completed',
    NEW_COMMENT: 'new_comment',
    GOODS_SOLD: 'goods_sold',
    SYSTEM: 'system'
};

router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, type, unread_only } = req.query;
        
        let sql = 'SELECT * FROM notifications WHERE user_id = ?';
        const params = [userId];
        
        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }
        
        if (unread_only === 'true') {
            sql += ' AND is_read = 0';
        }
        
        sql += ' ORDER BY created_at DESC';
        
        const pageNum = parseInt(page) || 1;
        const limitNum = Math.min(parseInt(limit) || 20, 50);
        const offset = (pageNum - 1) * limitNum;
        
        sql += ' LIMIT ? OFFSET ?';
        params.push(limitNum, offset);
        
        const notifications = await query(sql, params);
        
        const countSql = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?' +
            (type ? ' AND type = ?' : '') +
            (unread_only === 'true' ? ' AND is_read = 0' : '');
        const countParams = [userId];
        if (type) countParams.push(type);
        
        const countResult = await query(countSql, countParams);
        const total = countResult[0].total;
        
        const list = notifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            content: n.content,
            is_read: n.is_read === 1,
            related_id: n.related_id,
            created_at: n.created_at
        }));
        
        res.status(200).json({
            code: 200,
            data: { list, total, page: pageNum, limit: limitNum }
        });
    } catch (err) {
        console.error('[GET /notifications] Error:', err);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});

router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        
        res.status(200).json({
            code: 200,
            data: { count: result[0].count }
        });
    } catch (err) {
        console.error('[GET /notifications/unread-count] Error:', err);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});

router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;
        
        const notification = await query(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        
        if (notification.length === 0) {
            return res.status(404).json({ code: 404, msg: '通知不存在' });
        }
        
        await query(
            'UPDATE notifications SET is_read = 1 WHERE id = ?',
            [notificationId]
        );
        
        res.status(200).json({ code: 200, msg: '已标记为已读' });
    } catch (err) {
        console.error('[PUT /notifications/:id/read] Error:', err);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});

router.put('/read-all', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        await query(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        
        res.status(200).json({ code: 200, msg: '全部已标记为已读' });
    } catch (err) {
        console.error('[PUT /notifications/read-all] Error:', err);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;
        
        const notification = await query(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        
        if (notification.length === 0) {
            return res.status(404).json({ code: 404, msg: '通知不存在' });
        }
        
        await query('DELETE FROM notifications WHERE id = ?', [notificationId]);
        
        res.status(200).json({ code: 200, msg: '删除成功' });
    } catch (err) {
        console.error('[DELETE /notifications/:id] Error:', err);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});

async function createNotification(userId, type, title, content, relatedId = null) {
    try {
        await query(
            'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?)',
            [userId, type, title, content, relatedId]
        );
    } catch (err) {
        console.error('[createNotification] Error:', err);
    }
}

router.post('/test', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, title, content } = req.body;
        
        await createNotification(userId, type || 'system', title || '测试通知', content || '这是一条测试通知');
        
        res.status(200).json({ code: 200, msg: '测试通知已创建' });
    } catch (err) {
        console.error('[POST /notifications/test] Error:', err);
        res.status(500).json({ code: 500, msg: '服务器错误' });
    }
});

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.TYPES = NOTIFICATION_TYPES;
