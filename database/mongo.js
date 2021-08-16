const mongoose = require('mongoose');
const { Schema } = mongoose;
const _ = require('lodash');
const configData = require.main.require('./config.json')
const forumSchema = new Schema({ 
    sbType: String,
    cid: Number,
    sbIdentifier: String 
  });
let sbCategoryModel = {};
// MongoDB connection 
if (_.get(configData, 'mongo')) {
  const mongodbConnectionUrl =  `mongodb://${_.get(configData, 'mongo.host')}:${_.get(configData, 'mongo.port')}/${_.get(configData,'mongo.database')}`;
  mongoose.connect(mongodbConnectionUrl);
  console.log('SB config Json: ', configData);
  console.log('SB Mongo URL: ', mongodbConnectionUrl);
  sbCategoryModel = mongoose.model('sbcategory', forumSchema);
}

module.exports = sbCategoryModel;