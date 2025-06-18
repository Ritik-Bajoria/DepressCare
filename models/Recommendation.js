const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recommendation = sequelize.define('Recommendation', {
    recommendation_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    psychiatrist_id: { type: DataTypes.INTEGER },
    patient_id: { type: DataTypes.INTEGER },
    content: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'Recommendations', timestamps: false });

  return Recommendation;
};