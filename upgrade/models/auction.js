module.exports = (sequelize, DataTypes) => {
    const Auction = sequelize.define('auction', {
        bid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        msg: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
    }, {
        paranoid: true,
    });

    Auction.associate = (db) => {
        db.Auction.belongsTo(db.User);
        db.Auction.belongsTo(db.Good);
    };

    return Auction;
}