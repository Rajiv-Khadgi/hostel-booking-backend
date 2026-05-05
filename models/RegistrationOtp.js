import { DataTypes } from 'sequelize';

const RegistrationOtpModel = (sequelize) => {
    return sequelize.define('RegistrationOtp', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        otp: {
            type: DataTypes.STRING(6),
            allowNull: false
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'registration_otps',
        timestamps: true,
        underscored: true
    });
};

export default RegistrationOtpModel;
