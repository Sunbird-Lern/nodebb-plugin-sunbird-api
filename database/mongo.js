const mongoose = require('mongoose');
const { Schema } = mongoose;
const _ = require('lodash');
const forumSchema = new Schema({ 
    sbType: String,
    cid: Number,
    sbIdentifier: String 
  });
let client = {};

const mongo = {
  connect: (connectionObj) => {
    const mongodbConnectionUrl =  `mongodb://${_.get(connectionObj, 'mongo.host')}:${_.get(connectionObj, 'mongo.port')}/${_.get(connectionObj,'mongo.database')}`;
    mongoose.connect(mongodbConnectionUrl);
    console.log('SB config Json: ', connectionObj);
    console.log('SB Mongo URL: ', mongodbConnectionUrl);
    client = mongoose.model('sbcategory', forumSchema);
  
  },
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