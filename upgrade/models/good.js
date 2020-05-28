module.exports = (sequelize, DataTypes) => {
    const Good = sequelize.define('good', {
        name: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        img: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        end: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 24,
        },
        price: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    }, {
        paranoid: true,
    });

    Good.associate = (db) => {
        db.Good.belongsTo(db.User, { as: 'owner' });
        db.Good.belongsTo(db.User, { as: 'sold' });
        db.Good.hasMany(db.Auction);
    };

    return Good;
}