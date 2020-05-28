const db = require('./models');

module.exports = async () => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const targets = await db.Good.findAll({
            where: {
                soldId: null,
                createdAt: {
                    [db.Sequelize.Op.lt]: yesterday,
                },
            },
        });
        targets.forEach(async (target) => {
            const success = await db.Auction.findOne({
                where: { goodId: target.id },
                order: [['bid', 'DESC']],
            });
            await db.Good.update({ soldId: success.userId }, { where: { id: target.id } });
            await db.User.update({
                money: db.sequelize.literal(`money - ${success.bid}`),
            }, {
                where: { id: success.userId },
            });
        });
    }
    catch (e) {
        console.error(e);
    }
}
