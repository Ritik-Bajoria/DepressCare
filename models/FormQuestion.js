const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FormQuestion = sequelize.define('FormQuestion', {
    question_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    score_type: { type: DataTypes.ENUM('Likert', 'Binary', 'Scale'), allowNull: false }
  }, { tableName: 'formquestions', timestamps: false });

  FormQuestion.associate = (models) => {
    FormQuestion.hasMany(models.FormResponse, {
      foreignKey: 'question_id',
      as: 'Responses'
    });
  };
  return FormQuestion;
};