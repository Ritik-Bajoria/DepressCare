const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSession = sequelize.define('UserSession', {
    session_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER },
    login_time: { type: DataTypes.DATE },
    logout_time: { type: DataTypes.DATE },
    ip_address: { type: DataTypes.STRING(45) }
  }, { tableName: 'UserSessions', timestamps: false });

  return UserSession;
};
