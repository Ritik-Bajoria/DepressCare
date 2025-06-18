const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    full_name: { type: DataTypes.STRING(100) },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20) },
    gender: { type: DataTypes.ENUM('Male', 'Female', 'Other') },
    date_of_birth: { type: DataTypes.DATEONLY },
    role: { type: DataTypes.ENUM('Patient', 'Psychiatrist', 'Admin', 'InternalManagement'), allowNull: false },
    profile_picture: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'Users', timestamps: false });

  return User;
};
