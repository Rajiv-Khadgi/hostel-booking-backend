import { DataTypes } from 'sequelize';

const VisitModel = (sequelize) => {
    const Visit = sequelize.define('Visit', {
        visit_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        hostel_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        visit_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'REJECTED'),
            defaultValue: 'REQUESTED'
        }
    }, {
        tableName: 'visits',
        timestamps: true,
        underscored: true
    });

    return Visit;
};

export default VisitModel;
