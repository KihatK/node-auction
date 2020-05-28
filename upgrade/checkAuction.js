const schedule = require('node-schedule');

const db = require('./models');

module.exports = async () => {
    try {
        const targets = await db.Good.findAll({
            where: {
                soldId: null
            },
        });
        targets.forEach(async (target) => {
            const end = new Date(target.createdAt);
            end.setHours(end.getHours() + target.end);
            if (new Date() > end) {
                const success = await db.Auction.findOne({
                    where: { goodId: target.id },
                    order: [['bid', 'DESC']],
                });
                if (success) {
                    await db.Good.update({ soldId: success.userId }, { where: { id: target.id } });
                    await db.User.update({
                        money: db.sequelize.literal(`money - ${success.bid}`),
                    }, {
                        where: { id: success.userId },
                    });
                }
                else {
                    await db.Good.update({ soldId: target.ownerId }, { where: { id: target.id } });
                }
            }
            else {
                schedule.scheduleJob(end, async () => {
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
        });
    }
    catch (e) {
        console.error(e);
    }
}