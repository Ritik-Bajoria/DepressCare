const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DepressionForm = sequelize.define('DepressionForm', {
    form_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patient_id: { type: DataTypes.INTEGER },
    filled_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    total_score: { type: DataTypes.INTEGER },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'DepressionForms', timestamps: false });

  DepressionForm.associate = (models) => {
    DepressionForm.belongsTo(models.User, {
      foreignKey: 'patient_id',
      as: 'Patient' // Consistent naming
    });
    
    DepressionForm.hasMany(models.FormResponse, {
      foreignKey: 'form_id',
      as: 'Responses' // Singular vs plural consistency
    });
  };
  return DepressionForm;
};