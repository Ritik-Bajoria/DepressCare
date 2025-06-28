const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FormResponse = sequelize.define('FormResponse', {
    response_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    form_id: { type: DataTypes.INTEGER },
    question_id: { type: DataTypes.INTEGER },
    response_value: { type: DataTypes.INTEGER }
  }, { tableName: 'FormResponses', timestamps: false });

  FormResponse.associate = (models) => {
  FormResponse.belongsTo(models.FormQuestion, {
    foreignKey: 'question_id',
    as: 'Question' // This must match what you use in the include
  });
};
  return FormResponse;
};
