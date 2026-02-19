import { DataTypes } from 'sequelize';

const UserModel = (sequelize) => {
    return sequelize.define('User', {
        user_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        first_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: { len: [2, 50] }
        },
        last_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: { len: [2, 50] }
        },
        email: {
            type: DataTypes.STRING(100),
            unique: true,
            allowNull: false,
            validate: { isEmail: true }
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        refreshToken: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        role: {
            type: DataTypes.ENUM('student', 'owner', 'admin'),
            defaultValue: 'student',
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('active', 'suspended', 'deleted'),
            defaultValue: 'active',
            allowNull: false
        },
        profile_image: {
            type: DataTypes.STRING,
            allowNull: true
        },
        password_reset_token: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        password_reset_expires: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'users',
        timestamps: true,
        underscored: true
    });
};

export default UserModel;
