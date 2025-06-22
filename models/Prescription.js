const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Prescription = sequelize.define('Prescription', {
    prescription_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    appointment_id: { type: DataTypes.INTEGER },
    uploaded_by: { type: DataTypes.INTEGER },
    document_url: { type: DataTypes.STRING(255) },
    notes: { type: DataTypes.TEXT },
    uploaded_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'Prescriptions', timestamps: false });
  return Prescription;
};