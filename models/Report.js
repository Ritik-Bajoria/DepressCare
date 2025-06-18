const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    report_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    report_type: { type: DataTypes.ENUM('UserStats', 'AppointmentStats', 'AssessmentSummary') },
    generated_by: { type: DataTypes.INTEGER },
    file_url: { type: DataTypes.STRING(255) },
    generated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'Reports', timestamps: false });

  return Report;
};