const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Prescription = sequelize.define('Prescription', {
    prescription_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    appointment_id: { type: DataTypes.INTEGER },
    uploaded_by: { type: DataTypes.INTEGER },
    document_url: { type: DataTypes.STRING(255) },
    notes: { type: DataTypes.TEXT },
    uploaded_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'prescriptions', timestamps: false });

  Prescription.associate = (models) => {
    Prescription.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'Appointment'
    });
    Prescription.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      as: 'UploadedBy'
    });
  };

  return Prescription;
};