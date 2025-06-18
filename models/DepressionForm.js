const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DepressionForm = sequelize.define('DepressionForm', {
    form_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patient_id: { type: DataTypes.INTEGER },
    filled_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    total_score: { type: DataTypes.INTEGER },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'DepressionForms', timestamps: false });

  return DepressionForm;
};