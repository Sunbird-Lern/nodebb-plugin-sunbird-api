const mongoose = require('mongoose');
const { Schema } = mongoose;
const _ = require('lodash');
const configData = require.main.require('./config.json')
const forumSchema = new Schema({ 
    sbType: String,
    cid: Number,
    sbIdentifier: String 
  });
let client = {};
// MongoDB connection 
  const mongodbConnectionUrl =  `mongodb://${_.get(configData, 'mongo.host')}:${_.get(configData, 'mongo.port')}/${_.get(configData,'mongo.database')}`;
  mongoose.connect(mongodbConnectionUrl);
  console.log('SB config Json: ', configData);
  console.log('SB Mongo URL: ', mongodbConnectionUrl);
  client = mongoose.model('sbcategory', forumSchema);


const mongo = {
  save: async (context) => {
    try {
        context.cid = Array.isArray(context.cid) ? context.cid[0] : context.cid;
        const SbObj = new client(context);
        const mapResponse = await SbObj.save();
        return mapResponse;
    } catch(error) {
        throw error;
    }
  },
  getContext: async (context) => {
    try {
        const data = await client.find({sbIdentifier: context.identifier, sbType: context.type})
        return data;
    } catch(error) {
        throw error
    }
  },
  removeContext: async (context) => {
    try {
        const data = await client.deleteOne(context);
        return data.deletedCount > 0 ? 1 : 0;
    } catch(error){
        throw error;
    }
} 
}

module.exports = mongo;