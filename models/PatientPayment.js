const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PatientPayment = sequelize.define('PatientPayment', {
    payment_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patient_id: { type: DataTypes.INTEGER },
    appointment_id: { type: DataTypes.INTEGER },
    amount: { type: DataTypes.DECIMAL(10, 2) },
    payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    payment_status: { type: DataTypes.ENUM('Paid', 'Pending', 'Failed'), defaultValue: 'Pending' }
  }, { tableName: 'PatientPayments', timestamps: false });
  
  PatientPayment.associate = (models) => {
    // Association with Patient
    PatientPayment.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'Patient'
    });

    // Association with Appointment
    PatientPayment.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'Appointment'
    });
  };
  return PatientPayment;
};