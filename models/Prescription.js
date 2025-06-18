const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Prescription = sequelize.define('FormResponse', {
    response_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    form_id: { type: DataTypes.INTEGER },
    question_id: { type: DataTypes.INTEGER },
    response_value: { type: DataTypes.INTEGER }
  }, { tableName: 'FormResponses', timestamps: false });

  return Prescription;
};