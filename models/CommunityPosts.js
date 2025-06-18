const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityPost = sequelize.define('CommunityPost', {
    post_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    posted_by: { type: DataTypes.INTEGER },
    title: { type: DataTypes.STRING(255) },
    content: { type: DataTypes.TEXT },
    posted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'CommunityPosts', timestamps: false });

  return CommunityPost;
};