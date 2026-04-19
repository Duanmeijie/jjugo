CREATE TABLE chatbot_qa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question VARCHAR(200) NOT NULL COMMENT '问题示例',
    answer TEXT NOT NULL COMMENT '回答内容',
    keywords VARCHAR(500) NOT NULL COMMENT '匹配关键词，逗号分隔，如"密码,忘记,找回"',
    category VARCHAR(50) DEFAULT 'common' COMMENT '分类：common通用/trade交易/publish发布/account账号',
    priority INT DEFAULT 0 COMMENT '优先级，数字越大越优先',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO chatbot_qa (question, answer, keywords, category, priority) VALUES
('忘记密码怎么办', '您可以在登录页面点击"忘记密码"进行重置，或联系管理员协助处理。', '密码,忘记,找回,重置', 'account', 10),
('如何发布商品', '点击顶部导航栏"发布"按钮，填写商品信息、上传图片、设置价格后提交即可。', '发布,卖,上架,怎么卖', 'publish', 10),
('交易码怎么用', '买家支付后会获得6位数字交易码，线下交易时向卖家出示，卖家核验后订单完成。', '交易码,怎么用,线下,核验', 'trade', 10),
('怎么联系卖家', '进入商品详情页，在下方留言区可以给卖家留言，或查看卖家信息线下联系。', '联系,卖家,沟通,聊天', 'trade', 9),
('支持退款吗', '本平台为校园线下交易平台，钱款不经过平台，交易前请当面确认商品，建议谨慎交易。', '退款,退货,售后,退钱', 'trade', 10),
('如何修改个人信息', '进入"个人中心"页面，可以修改昵称、头像等基础信息。', '修改,信息,资料,头像', 'account', 8),
('商品被下架了', '商品可能包含违规内容被系统自动拦截，或管理员手动下架，请修改后重新发布。', '下架,违规,删除,审核', 'publish', 9),
('怎么收藏商品', '在商品详情页点击心形图标即可收藏，可在个人中心"我的收藏"查看。', '收藏,喜欢,心愿单', 'common', 7),
('平台收费吗', '九院易购完全免费，不收取任何交易手续费。', '收费,钱,费用,手续费', 'common', 10),
('遇到骗子怎么办', '请立即在商品页面举报，或联系管理员处理。建议线下交易时选择校园公共场所。', '骗子,诈骗,举报,安全', 'trade', 10);