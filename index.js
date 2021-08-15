var Plugin = (module.exports = {})
const axios = require('axios')
const Categories = require.main.require('./src/categories')
const posts = require.main.require('./src/posts')
const Topics = require.main.require('./src/topics')
const Users = require.main.require('./src/user')
const Groups = require.main.require('./src/groups')
const db = require.main.require('./src/database')
const async = require('async')
const apiMiddleware = require('./middleware')
const responseMessage = require('./responseHandler')
const createTenantURL = '/api/org/v1/setup'
const createForumURL = '/api/forum/v1/create'
const createSectionURL = '/api/org/v1/sections/add'
const getForumURL = '/api/forum/v1/read'
const categoryList = '/api/category/list';
const requestPromise = require('request-promise');
const tagsList = '/api/tags/list'
const contextBasesTags = '/api/forum/tags'
const utils = require('./utils')
const allTopicsByCategoryURL = '/api/category/v1/topic'
const allPostsByTopicURL = '/api/topic/v1/posts'
const replyTopicURL = '/api/topic/v1/reply'
const createTopicURL = '/api/topic/v1/create'
const voteURL = '/api/:pid/vote'
const deletePostURL = '/api/post/v1/delete/:pid'
const deleteTopicURL = '/api/topic/v1/delete/:tid'
const purgePostURL = '/api/post/v1/purge/:pid'
const purgeTopicURL = '/api/topic/v1/purge/:tid'
const banUserURL = '/api/user/v1/ban'
const unbanUserURL = '/api/user/v1/unban'
const createCatwithSubcatURL = '/api/create'
const createSBForum= '/api/forum/v2/create';
const getSBForum= '/api/forum/v2/read';
const removeSBForum = '/api/forum/v2/remove';
const createRelatedDiscussions = '/api/forum/v3/create';
const privileges = require.main.require('./src/privileges');
const _ = require('lodash');
const copyPrivilages = '/api/privileges/v2/copy'
const getUids = '/api/forum/v2/uids';
const addUserIntoGroup = '/api/forum/v3/group/membership';
const groupsPriveleges = '/api/forum/v3/category/:cid/privileges';
const oidcPlugin = require.main.require('./node_modules/nodebb-plugin-sunbird-oidc/library.js');
const Settings = require.main.require('./src/settings');
const listOfGroupUsers = '/api/forum/v3/groups/users';
const configData = require.main.require('./config.json')
const mongoose = require('mongoose');
const { Schema } = mongoose;
const forumSchema = new Schema({ 
    sbType: String,
    cid: Number,
    sbIdentifier: String 
  });
const jsonConstants = require('./lib/constants');
const util = require('./lib/utils');  

// MongoDB connection 
if (_.get(configData, 'mongo.host')) {
  const mongodbConnectionUrl =  `mongodb://${_.get(configData, 'mongo.host')}:${_.get(configData, 'mongo.port')}/${_.get(configData,'mongo.database')}`;
  mongoose.connect(mongodbConnectionUrl);
  const sbCategoryModel = mongoose.model('sbcategory', forumSchema);
  console.log('SB config Json: ', configData);
  console.log('SB Mongo URL: ', mongodbConnectionUrl)
  
}

// Redis connection
const redisConnection = require.main.require('./src/database/redis/connection');
configData.redis.database = '2';
const redis = redisConnection.connect(configData.redis);
const redisClient = {'client' : redis};
require.main.require('./src/database/redis/hash')(redisClient);
require.main.require('./src/database/redis/main')(redisClient);
require.main.require('./src/database/redis/promisify')(redisClient.client);

const {
  createCategory,
  createCategory_check,
  createGroupDefault,
  addPrivileges,
  addSection,
  createForum,
  createGroup,
  getForum,
  createTopic,
  replyTopic
} = require('./library')

const { default: Axios } = require('axios')

var constants = {
  'name': 'sunbird-oidc',
  'key': 'list',
  'category': '/category',
  'tags': '/tags',
  'errorResCode': 'SERVER_ERROR',
  'payloadError': "Request payload error",
  'resCode': 'OK',
  'statusFailed': 'failed',
  'http_protocal': 'http',
  'statusSuccess': 'Success',
  '/api/category/list': 'api.discussions.category.list',
  'api/tags/list': 'api.discussion.tags.list',
  '/api/forum/v3/create': 'api.forum.v3.create',
  'createCategory': '/v2/categories',
  'createForum': '/forum/v2/create',
  'getForum': '/forum/v2/read',
  'addUserIntoGroup': '/v2/groups/:slug/membership/:uid',
  'createPrivileges': '/v2/categories/:cid/privileges',
  '/api/privileges/v2/copy': 'api.privileges.v2.copy',
  'defaultCategory': 'General Discussion',
  'post': 'POST',
  'get': 'GET',
  'put': 'PUT',
  'apiPrefix': '/api',
  'emptyGroupsMsg': "Groups and CID should not be empty",
  'incorrectCid': 'Category id ${cid} is not exists, Please use correct cid',
  'emptyDataFOrGroupsAndMembers': 'Groups and members should not be empty',
  'noGroupAddedMsg': '${group} was not added for the category id ${cid}, please add and try again.',
  'emptyDataForGroups':'You have to pass both sbUid and sbUserName',
  'pluginSettings': new Settings('fusionauth-oidc', '1.0.0', {
    // Default settings
    clientId: null,
    clientSecret: null,
    emailClaim: 'email',
    discoveryBaseURL: null,
    authorizationEndpoint: null,
    tokenEndpoint: null,
    ssoTokenEndpoint: null,
    userInfoEndpoint: null,
    emailDomain: null
  }, false, false),
}


async function createTopicAPI (req, res) {
  var payload = { ...req.body.request }
  console.log('-----------payload ---------------', payload)
  payload.tags = payload.tags || []
  payload.uid = payload._uid ? payload._uid : req.user.uid

  return createTopic(payload)
    .then(topicObj => {
      let resObj = {
        id: 'api.discussions.topic.create',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: topicObj
      }
      return res.json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      console.log('--------------error 00000000', error)
      let resObj = {
        id: 'api.discussions.topic.create',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function allTopicsByCategory (req, res) {
  var payload = { ...req.body.request }

  axios
    .get(`http://localhost:4567/api/category/${payload.cid}`)
    .then(topicObj => {
      let resObj = {
        id: 'api.discussions.topic.all',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: topicObj.data
      }
      return res.json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      console.log(error)
      let resObj = {
        id: 'api.discussions.topic.all',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function allPostsByTopic (req, res) {
  var payload = { ...req.body.request }
  console.log('--------------------', payload)
  axios
    .get(`http://localhost:4567/api/topic/${payload.tid}`)
    .then(postObj => {
      // console.log('--------------------',postObj)
      let resObj = {
        id: 'api.discussions.reply.all',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: postObj.data
      }
      return res.json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.reply.all',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function replyTopicAPI (req, res) {
  let { body } = req

  var payload = {
    tid: body.request.tid,
    uid: req.user.uid,
    req: utils.buildReqObject(req), // For IP recording
    content: body.request.content,
    timestamp: body.request.timestamp || Date.now()
  }

  if (req.body.toPid) {
    payload.toPid = body.request.toPid
  }

  return replyTopic(payload)
    .then(topicObj => {
      let resObj = {
        id: 'api.discussions.topic.reply',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: topicObj
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.topic.reply',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    })
}

async function deletePostAPI (req, res) {
  let { body } = req
  posts.delete(req.params.pid, req.user.uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.delete.post',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.delete.post',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function deleteTopicAPI (req, res) {
  Topics.delete(req.params.tid, req.params._uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.delete.topic',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.delete.topic',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function purgeTopicAPI (req, res) {
  Topics.purgePostsAndTopic(req.params.tid, req.params._uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.purge.topic',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.purge.topic',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function purgePostAPI (req, res) {
  posts.purge(req.params.pid, req.user.uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.purge.post',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.purge.post',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function voteURLAPI (req, res) {
  let { body } = req

  if (body.request.delta > 0) {
    posts.upvote(req.params.pid, req.user.uid, function (error, data) {
      if (error) {
        let resObj = {
          id: 'api.discussions.post.vote',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.status(400).json(responseMessage.errorResponse(resObj))
      }
      let resObj = {
        id: 'api.discussions.post.vote',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: data
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    })
  } else if (body.request.delta < 0) {
    posts.downvote(req.params.pid, req.user.uid, function (error, data) {
      if (error) {
        let resObj = {
          id: 'api.discussions.post.vote',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.status(400).json(responseMessage.errorResponse(resObj))
      }
      let resObj = {
        id: 'api.discussions.post.vote',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: data
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    })
  } else {
    posts.unvote(req.params.pid, req.user.uid, function (error, data) {
      if (error) {
        let resObj = {
          id: 'api.discussions.post.vote',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.status(400).json(responseMessage.errorResponse(resObj))
      }
      let resObj = {
        id: 'api.discussions.post.vote',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: data
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    })
  }
}

async function banUserAPI (req, res) {
  let { body } = req

  Users.bans.ban(
    body.request.uid,
    body.request.until || 0,
    body.request.reason || '',
    function (error) {
      if (error) {
        let resObj = {
          id: 'api.discussions.user.ban',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.status(400).json(responseMessage.errorResponse(resObj))
      }
      let resObj = {
        id: 'api.discussions.user.ban',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: null
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    }
  )
}

async function unbanUserAPI (req, res) {
  let { body } = req

  Users.bans.unban(body.request.uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.user.ban',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.user.ban',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function setupOrgAPI (req, res) {
  let { body } = req
  var reqPrivileges = body.request.privileges
  return createCategory(body.request)
    .then(catResponse => {
      if (catResponse) {
        let allCatIds = []
        catResponse.sectionObj.map(section => {
          allCatIds.push(section.cid)
        })
        allCatIds.push(catResponse.categoryObj.cid)
        return addPrivileges(reqPrivileges, allCatIds)
          .then(privilegesResponse => {
            let resObj = {
              id: 'api.discussions.org.setup',
              msgId: req.body.params.msgid,
              status: 'successful',
              resCode: 'OK',
              data: catResponse
            }
            return res.json(responseMessage.successResponse(resObj))
          })
          .catch(error => {
            let resObj = {
              id: 'api.discussions.org.setup',
              msgId: req.body.params.msgid,
              status: 'failed',
              resCode: 'SERVER_ERROR',
              err: error.status,
              errmsg: error.message
            }
            return res.json(responseMessage.errorResponse(resObj))
          })
      }
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.org.setup',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function addSectionURL (req, res) {
  let { body } = req
  var reqPrivileges = body.request.privileges
  return addSection(body.request)
    .then(catResponse => {
      let allCatIds = []
      catResponse.sectionObj.map(section => {
        allCatIds.push(section.cid)
      })
      return addPrivileges(reqPrivileges, allCatIds)
        .then(privilegesResponse => {
          let resObj = {
            id: 'api.discussions.org.section.add',
            msgId: req.body.params.msgid,
            status: 'successful',
            resCode: 'OK',
            data: catResponse
          }
          return res.json(responseMessage.successResponse(resObj))
        })
        .catch(error => {
          let resObj = {
            id: 'api.discussions.org.section.add',
            msgId: req.body.params.msgid,
            status: 'failed',
            resCode: 'SERVER_ERROR',
            err: error.status,
            errmsg: error.message
          }
          return res.json(responseMessage.errorResponse(resObj))
        })
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.org.section.add',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function createForumAPI (req, res) {
  let { body } = req
  var reqPrivileges = body.request.privileges

  if (!body.request.organisationId && !body.request.context) {
    let resObj = {
      id: 'api.discussions.forum.create',
      msgId: req.body.params.msgid,
      status: 'failed',
      resCode: 'SERVER_ERROR',
      err: 401,
      errmsg: 'Please provide orgId or context! something is missing'
    }
    return res.json(responseMessage.errorResponse(resObj))
  } else {
    return createForum(body.request)
      .then(catResponse => {
        let allCatIds = []
        allCatIds.push(catResponse.cid)
        if (body.request.groups && body.request.privileges) {
          return createGroup(body.request, allCatIds)
            .then(groupObj => {
              return addPrivileges(reqPrivileges, allCatIds)
                .then(privilegesResponse => {
                  let resObj = {
                    id: 'api.discussions.forum.create',
                    msgId: req.body.params.msgid,
                    status: 'successful',
                    resCode: 'OK',
                    data: catResponse
                  }
                  return res.json(responseMessage.successResponse(resObj))
                })
                .catch(error => {
                  let resObj = {
                    id: 'api.discussions.forum.create',
                    msgId: req.body.params.msgid,
                    status: 'failed',
                    resCode: 'SERVER_ERROR',
                    err: error.status,
                    errmsg: error.message
                  }
                  return res.json(responseMessage.errorResponse(resObj))
                })
            })
            .catch(error => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'failed',
                resCode: 'SERVER_ERROR',
                err: error.status,
                errmsg: error.message
              }
              return res.json(responseMessage.errorResponse(resObj))
            })
        } else if (body.request.groups && !body.request.privileges) {
          return createGroup(body.request, allCatIds)
            .then(groupObj => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'successful',
                resCode: 'OK',
                data: catResponse
              }
              return res.json(responseMessage.successResponse(resObj))
            })
            .catch(error => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'failed',
                resCode: 'SERVER_ERROR',
                err: error.status,
                errmsg: error.message
              }
              return res.json(responseMessage.errorResponse(resObj))
            })
        } else if (!body.request.groups && body.request.privileges) {
          return addPrivileges(reqPrivileges, allCatIds)
            .then(privilegesResponse => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'successful',
                resCode: 'OK',
                data: catResponse
              }
              return res.json(responseMessage.successResponse(resObj))
            })
            .catch(error => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'failed',
                resCode: 'SERVER_ERROR',
                err: error.status,
                errmsg: error.message
              }
              return res.json(responseMessage.errorResponse(resObj))
            })
        } else {
          let resObj = {
            id: 'api.discussions.forum.create',
            msgId: req.body.params.msgid,
            status: 'successful',
            resCode: 'OK',
            data: catResponse
          }
          return res.json(responseMessage.successResponse(resObj))
        }
      })
      .catch(error => {
        let resObj = {
          id: 'api.discussions.forum.create',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.json(responseMessage.errorResponse(resObj))
      })
  }
}

async function getForumAPI (req, res) {
  let { body } = req
  return getForum(body.request)
    .then(forumResponse => {
      let resObj = {
        id: 'api.discussions.forum.read',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: forumResponse
      }
      return res.json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.forum.read',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }

      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function createCatwithSubcat (req, res) {
  let { body } = req
  return createCategory_check(body.request)
    .then(catResponse => {
      if (catResponse) {
        let allCatIds = []
        catResponse.sectionObj.map(section => {
          allCatIds.push(section.cid)
        })
        allCatIds.push(catResponse.categoryObj.cid)

        return createGroupDefault(body.request, req.user.uid, allCatIds)
          .then(groupObj => {
            let resObj = {
              id: 'api.discussions.forum.create',
              msgId: req.body.params.msgid,
              status: 'successful',
              resCode: 'OK',
              data: catResponse
            }
            return res.json(responseMessage.successResponse(resObj))
          })
          .catch(error => {
            let resObj = {
              id: 'api.discussions.forum.create',
              msgId: req.body.params.msgid,
              status: 'failed',
              resCode: 'SERVER_ERROR',
              err: error.status,
              errmsg: error.message
            }
            return res.json(responseMessage.errorResponse(resObj))
          })

        // let resObj = {
        //   id: 'api.discussions.org.setup',
        //   msgId: req.body.params.msgid,
        //   status: 'successful',
        //   resCode: 'OK',
        //   data: catResponse
        // }
        // return res.json(responseMessage.successResponse(resObj))
      }
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.org.setup',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

function commonObject (res, id, msgId, status, resCode, err, errmsg, data) {
  let resObj = null
  if (res === 0) {
    resObj = {
      id: id,
      msgId: msgId,
      status: status,
      resCode: resCode,
      err: err,
      errmsg: errmsg
    }
  } else {
    resObj = {
      id: id,
      msgId: msgId,
      status: status,
      resCode: resCode,
      data: data
    }
  }
  return resObj
}

/**
 * this function will store the forum object in the mapping table.
 * @param {*} req 
 * the request object having sbType, sbIdentifier, cid in the body.
 * @param {*} res 
 */
async function createSBForumFunc (req, res) {
  console.log("SB Forum Create Log: request payload=", req.body);
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  const SbObj = new sbCategoryModel(payload);
  if( isRequiredParamsMissing ) {
  console.log("Creating the forum");
  SbObj.save().then(async (data) => {
    console.log("forum created");
    const responseObj = await util.responseData(req, res, data, null);
    res.send(responseObj);
  }).catch(error => {
    console.log("Error while Creating the forum");
    util.generateError(req, res, error.message, 500);
  });
  }
}

/**
 * This function return the category id's from mongoDB based on the id and type.
 * @param {*} req 
 * @param {*} res 
 */
async function getSBForumFunc (req, res) {
  console.log("SB Forum Get Log: request payload", req.body);
  const payload =  { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if( isRequiredParamsMissing ) {
    const id = payload.identifier;
    const type = payload.type;
    console.log('Get forumId');
    sbCategoryModel.find({sbIdentifier: id, sbType: type}).then(async (data) => {
    console.log('SB Forum Get Log: db operation success', data);
    const responseObj = await util.responseData(req, res, data, null);
    res.send(responseObj);
  }).catch(error => {
    console.log('Error while getting the forumId');
    util.generateError(req, res, error.message, 500);
  });
  }
}

/**
 * This function will remove the  the category ids from mongoDB based on the sb_id and sb_type.
 * @param {*} req 
 * @param {*} res 
 */
async function removeSBForumFunc (req, res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if( isRequiredParamsMissing ) {
  console.log("Removing the category id ");
  sbCategoryModel.deleteOne(payload).then(async (data) => {
    if (data.deletedCount > 0) {
      console.log("category deleted");
      const responseObj = await util.responseData(req, res, jsonConstants.forumStrings.removeForumSuccessMsg, null);
      res.send(responseObj);
    } else {
      console.log("failed to delete category");
      util.generateError(req, res, jsonConstants.forumStrings.removeForumFailMsg, 400);
    }
  }).catch(error => {
    console.log("Error while removing the category");
    util.generateError(req, res, error.message, 500);
  });
  }
}
/**
 * @param {*} req 
 * @param {*} res
 * This method will take list of cids and return list of category details for a respective cid.
 */
async function getListOfCategories(req, res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if(isRequiredParamsMissing) {
    const cids = payload.cids;
    let allCategories = [];
    for(let i = 0; i < cids.length; i++) {
        try {
          const url = constants.category+ '/' + cids[i];
          const data = await util.getResponseData(req, url, categoryList, null, constants.get);
          allCategories.push(data);
            if (i === (cids.length -1)) {
              const responseObj = await util.responseData(req, res, allCategories, null);
              res.send(responseObj);
            }
        } catch(error) {
          console.log({message: `Error while call the api`})
          console.log({message: `Error message:  ${error.message}`})
          util.generateError(req, res, error.message, 404);
        }
      }
  }
}

/**
 * @param {*} req 
 * @param {*} res
 * This method will tag name and cid and return list of topics that contains that tag name under particuler cid.
 */
async function getTagsRelatedTopics(req,res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if (isRequiredParamsMissing) {
    try {
      const url = constants.tags+ '/' + payload.tag;
      const data = await util.getResponseData(req, url, tagsList, null, constants.get);
      const releatedTopics = data.topics.filter(topic => payload.cid.includes(topic.cid));
      const responseObj = await util.responseData(req, res, releatedTopics, null);
      res.send(responseObj);
    } catch(error) {
      console.log({message: `Error while call the api`})
      console.log({message: `Error message:  ${error.message}`})
      util.generateError(req, res, error.message, 500);
    }
  }
}



async function getContextBasedTags (req, res) {
  const payload = { ...req.body.request }
  let resObj = {
    id: constants[contextBasesTags],
    status: constants.statusSuccess,
    resCode: constants.resCode,
    data: null
  }
  if (payload) {
    const cids = payload.cids;
    let allTopics = [],
      allTags = []

    for (let i = 0; i < cids.length; i++) {
      try {
        const url = constants.category+ '/' + cids[i];
        const data = await util.getResponseData(req, url, contextBasesTags, null, constants.get);
        allTopics.push(...data.topics)
        if (i === cids.length - 1) {
          allTopics.filter((val, inx) => {
            if (val.tags.length) {
              allTags.push(...val.tags)
            }
          })

          const tagData = new Map(
            allTags.map(tag => [tag.value, { ...tag, score: 0 }])
          )
          for (const { value } of allTags) tagData.get(value).score++
          const result = Array.from(tagData.values())

          resObj.data = result
          res.send(responseMessage.successResponse(resObj))
        }
      } catch (error) {
        console.log({ message: `Error while call the api ${options.url}` })
        console.log({ message: `Error message:  ${error.message}` })
        res.statusCode = 404
        resObj.status = constants.failed
        resObj.resCode = constants.errorResCode
        resObj.err = error.status
        resObj.errmsg = error.message
        res.send(responseMessage.errorResponse(resObj))
      }
    }
  }
}

/**
 * @param {*} req 
 * @param {*} res
 * This method will take sunbird identifiers and return nodebb uid respectively.
 */
async function getUserIds(req,res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if (isRequiredParamsMissing) {
    try {
      const userIds = await util.userDetailsByoAuth(payload.sbIdentifiers);
      const data = {userIds:userIds};
      const responseObj = await util.responseData(req, res, data, null);
      res.send(responseObj);
    } catch(error) {
      util.generateError(req, res, error.message, 500);
    }
  }
}


/**
 * @param  {} req
 * @param  {} res
 * this the generalization of api for course and groups
 */
async function relatedDiscussions (req, res) {
    const reqPayload = { ...req.body };
    const requiredParams = jsonConstants.requiredParams[req.route.path];
    const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, reqPayload);
    if (isRequiredParamsMissing) {
          const payload = reqPayload.category;
          // check: is both privileges and groups present
         if (!_.isEmpty(payload.groups) && !_.isEmpty(payload.privileges)) {
           util.generateError(req, res, jsonConstants.forumStrings.privilegeGroupErrorMsg, 400, jsonConstants.forumStrings.payloadError);
          } else {
            let finalResponse = {};
            const body = {
              parentCid: payload.pid || 0,
              name: payload.name || constants.defaultCategory,
              description: _.get(payload, 'description') 
            };
            const cdata = await Categories.create(body); // creating new category.

           if(cdata) {
              const context = payload.context;
              if(!_.isEmpty(context)) {
                finalResponse['forums'] = await addContext(context, cdata.cid); // adding category with the context
                // check: is copyFromCategory present in privileges object, if yes copy prilileges from that category and apply on new category
                if(payload.privileges && !_.isEmpty(payload.privileges.copyFromCategory)){
                    const result = await Categories.copyPrivilegesFrom(payload.privileges.copyFromCategory, cdata.cid);
                    const members = await util.getMembers(cdata.cid);
                    finalResponse['groups'] = members;
                    try{
                      // check: is subcategories present.
                      const subCategory = await checkSubcategories(payload.subcategories, cdata.cid);
                      finalResponse.subcategories = subCategory;
                      const responseObj = await util.responseData(req, res, finalResponse, null);
                      res.send(responseObj);
                    } catch(error) {
                        util.generateError(req, res, error.message, 500);
                    }
                } else if(!_.isEmpty(payload.groups)) { // check: is groups present. if yes add users into group and attch group to catgory
                    try{
                      const addPrivileges = await util.groupsAndPrivileges(cdata.cid, payload.groups);
                      const members = await util.getMembers(cdata.cid);
                      finalResponse['groups'] = members;
                      const subCategory = await checkSubcategories(payload.subcategories, cdata.cid);
                      finalResponse.subcategories = subCategory;
                      const responseObj = await util.responseData(req, res, finalResponse, null);
                      res.send(responseObj);
                    } catch(error) {
                      util.generateError(req, res, error.message, 500);
                    }
                } else {
                    const responseObj = await util.responseData(req, res, finalResponse, null);
                    res.send(responseObj);
                }
              } else {
                  util.generateError(req, res, jsonConstants.forumStrings.contextError, 400);
              }              
          } else {
              console.log('category creation failed')
              console.log('Error is', cdata.message)
              util.generateError(req, res, jsonConstants.forumStrings.categoryError, 500);
          }
      }
    }
}

/**
 * @param {*} context 
 * @param {*} cid
 * This method will create new context along with mapped category id and add it in sbCategories collection  : Generalaiation.  
 */
async function addContext(context, cid) {
  const forumIds = [];
  return new Promise((resolve, reject) => {
    context.forEach(async (contextData, i) => {
      const addPropertyInCategory = await Categories.setCategoryField(cid, 'contextId', contextData.identifier);
      // Preparing request object
        let mapObj = {
          sbIdentifier: contextData.identifier,
          sbType: contextData.type,
          cid: cid
        }
        // TODO: if we use mongo then unconnent below 2 lines  
        // const SbObj = new sbCategoryModel(mapObj);
        // const mapResponse = await SbObj.save(); // save the request object into mongo collection

        // TODO: we are using reids here to store context
        const key = `sbCategory:${contextData.type}:${contextData.identifier}`;
        const setData = await redisClient.setObject(key , mapObj);

        // fetching already mapped category id's

        // TODO: if we use mongo then unconnent below 2 lines 
        // const mappedCids = await sbCategoryModel.find({sbIdentifier: contextData.identifier, sbType: contextData.type})
        // const listOfCids = mappedCids.map(forum => forum.cid);

        // TODO: we are using reids here to store context
        const listOfCids = await redisClient.getObject(key);

        // Preparing the response object
        const mapResObj = {
          "sbType": contextData.type,
          "sbIdentifier": contextData.identifier,
          "newCid": cid,
          "cids": [_.get(listOfCids, 'cid')]
        }
        forumIds.push(mapResObj);
        if(i === (context.length - 1)){ 
          resolve(forumIds)
        }
    });
  });
}

/**
 * @param {*} subCategories 
 * @param {*} cid
 * This method internally calls addSubcategories method and return category data after getting the response from addSubcategories method : Generalaiation.  
 */
async function checkSubcategories(subcategories, cid) {
  console.log('add checkSubcategories')
  return new Promise(async (resolve, reject) => {
    if(!_.isEmpty(subcategories)) {
      try {
        const addingSubcategory = await addSubcategories(subcategories, cid);
        resolve(addingSubcategory)
      } catch(error) {
        reject(error)
      }
    } else {
      resolve([]);
    }
  })
}

/**
 * @param {*} subCategories 
 * @param {*} pid
 * This method will create new categories. based on what ever the categories present in subcategories array: Generalaiation.  
 */
async function addSubcategories(subCategories, pid) {
  let subCategoryResponse =[];
  return new Promise(async (resolve, reject) => {
      for (let i = 0; i<subCategories.length; i++){ 
      let privilegesError;
     if (!_.isEmpty(subCategories[i].groups) && !_.isEmpty(subCategories[i].privileges)) {
        privilegesError = new Error(jsonConstants.forumStrings.subCategoryError);
        privilegesError.statusCode = 400;
        reject(privilegesError);
      } else {
          const categoryObj = {
            name: subCategories[i].name,
            parentCid: pid,
            description: _.get(subCategories[i], 'description') 
          };

          const creatSubCategory =  await Categories.create(categoryObj);

          const data = {
            name: creatSubCategory.name,
            cid: creatSubCategory.cid,
            pid: pid,
            groups: []
          };

          // Mapping the context if exists for sub category 
          if(!_.isEmpty(subCategories[i].context)) {
            subCategories[i].context.forEach(async (context) => {
              const addPropertyInCategory = await Categories.setCategoryField(creatSubCategory.cid, 'contextId', context.identifier);
              const contextObj = {
                "sbType": context.type,
                "sbIdentifier": context.identifier,
                "cid": creatSubCategory.cid
              }
              // TODO: if we use mongo then unconnent below 2 lines 
              // const SbObj = new sbCategoryModel(contextObj);
              // const mapResponse = await SbObj.save();

              // TODO: we are using reids here to store context
              const key = `sbCategory:${context.type}:${context.identifier}`;
              const setData = await redisClient.setObject(key , contextObj);
            })
          }
          
          //  checking for privileges 
          if(subCategories[i].privileges && subCategories[i].privileges.copyFromParent){
            await Categories.copyPrivilegesFrom(pid, creatSubCategory.cid);
          }else if(!_.isEmpty(subCategories[i].groups)) {
            await util.groupsAndPrivileges(creatSubCategory.cid, subCategories[i].groups);
          }
          data['groups'] = await util.getMembers(creatSubCategory.cid);
          if(!_.isEmpty(data.groups)) {
            subCategoryResponse.push(data);
            if(i === (subCategories.length -1)) {
              resolve(subCategoryResponse)
            }
          }         
      }
    }
  })
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * This will take pid and cid and do opy of privileges from pid and add those privileges to cid.
 */
async function copyPrivilegeData(req, res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if (isRequiredParamsMissing) {
    await Categories.copyPrivilegesFrom(payload.pid, payload.cid);
    const result = await util.responseData(req, res, _.get(jsonConstants.forumStrings, 'privilegesCopy'), null);
    res.send(result);
  }
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * This will take groups and members array and add the members into groups.
 */
async function addUsers(req, res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];;
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
    if(isRequiredParamsMissing) {
      const groupsList = payload.groups;
      const sunbirdUsers = payload.members;
      sunbirdUsers.forEach(async (user, index) => {
        let nodebbUid = await db.getObjectField(constants.name + 'Id:uid', user.sbUid);
        if(!nodebbUid) {
          try {
            nodebbUid = await util.createNewUser(user);
          } catch(error) {
            util.generateError(req, res, error.message, 400);
            return false;
          }
        }
        await util.addUsersInGroup(groupsList, nodebbUid);
        if (index === (sunbirdUsers.length -1)) {
          const userList = await util.getMembers(null, groupsList);
          const result = { groups: userList };
          const responseObj = await util.responseData(req, res, result, null);
          res.send(responseObj);
        }
      }) 
    }
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * This api will take cid and groups names and return list of groups and users added to a category.
 * groups array is optional if you pass groups array it will return list of users added in those groups.
 */
async function getContextUserGroups(req, res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];;
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if (isRequiredParamsMissing) {
    const groups = payload.groups || [];
    const cid = payload.cid;
    const userList = await util.getMembers(cid, groups);
    const result = { groups: userList };
    const responseObj = await util.responseData(req, res, result, null);
    res.send(responseObj);
  }
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * This api will take cid and groups names and return list of users added in those groups for a category.
 */
async function getContextGroupPriveleges(req, res) {
  const payload = {...req.body.request};
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if (isRequiredParamsMissing){
    const groups = payload.groups;
    const cid = req.params.cid;
      const isCidExist = await Categories.exists(cid);
      let groupsData = [];
      if(isCidExist) {
        const groupsList= await privileges.categories.list(cid);
        groups.forEach(async (group, index) => {
          const cgroup = groupsList.groups.filter(data => data.name.toLowerCase() === group.toLowerCase());
          if (cgroup && cgroup.length > 0) {
            groupsData.push(cgroup[0])
          } else {
            const noGroup = {
              name: group,
              message: (constants.noGroupAddedMsg.replace('${group}', group)).replace('${cid}', cid)
            }
            groupsData.push(noGroup);
          }
          if(index === (groups.length -1)) {
            const result = {
              groups: groupsData
            }
           const responseObj = await util.responseData(req, res, result, null);
           res.send(responseObj);
          }
        })
      } else {
          util.generateError(req, res, constants.incorrectCid.replace('${cid}', cid), 400);
      }
  }
}


// async function getCategories(req, res) {
//   const payload = { ...req.body.request };
//   const data = await Categories.getAllCategoryFields(['contextId', 'cid'])
//   const result = data.filter(x => x.contextId === payload.identifier);
//   res.send(result)
// }

async function getUserDetails(req, res) {
  const userslug = req.params.userslug;
  if (!_.isEmpty(userslug)) {
    const uid = await Users.getUidByUserslug(userslug);
    const userDetails = await Users.getUserData(uid);
    res.send(userDetails);
  } else {
    util.generateError(req, res, "Userslug is mandatory", 400);
  }
}

/**
 * this function will store the forum object in the mapping table in Redis .
 * @param {*} req 
 * the request object having sbType, sbIdentifier, cid in the body.
 * @param {*} res 
 */
async function redisCreateForum(req, res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if( isRequiredParamsMissing ) {
    const key = `sbCategory:${payload.sbType}:${payload.sbIdentifier}`;
    payload.cid = Array.isArray(payload.cid) ? JSON.stringify(payload.cid) : payload.cid;
    const setData = await redisClient.setObject(key , payload);
    const data = await redisClient.getObject(key);
    const responseObj = await util.responseData(req, res, data, null);
    res.send(responseObj);
  }
}

/**
 * This function return the category id's from redis based on the id and type.
 * @param {*} req 
 * @param {*} res 
 */
async function redisGetForum(req, res) {
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if( isRequiredParamsMissing ) {
    const id = Array.isArray(payload.identifier) ? payload.identifier[0] : payload.identifier;
    const key = `sbCategory:${payload.type}:${id}`;
    const getData = await redisClient.getObject(key) || {};
    const responseObj = await util.responseData(req, res, getData, null);
    res.send(responseObj);
  }
}

/**
 * This function will remove the  the category ids from Redis based on the sb_id and sb_type.
 * @param {*} req 
 * @param {*} res 
 */
async function redisDeleteForum(req, res) {
  const input = req.body.request;
  const payload = { ...req.body.request };
  const requiredParams = jsonConstants.requiredParams[req.route.path];
  const isRequiredParamsMissing = await util.checkRequiredParameters(req, res, requiredParams, payload);
  if( isRequiredParamsMissing ) {
    const id = Array.isArray(input.sbIdentifier) ? input.sbIdentifier[0] : input.sbIdentifier;
    const key = `sbCategory:${input.sbType}:${id}`;
    const deleteForum = await redisClient.client.async.del(key);
    redisClient.objectCache.del(key);
    const responseObj = await util.responseData(req, res, jsonConstants.forumStrings.removeForumSuccessMsg, null);
    res.send(responseObj);
  }
}


Plugin.load = function (params, callback) {
  var router = params.router

  router.post(createSBForum, createSBForumFunc)
  // TODO: if we use mongo the to get form data use getSBForumFunc
  // router.post(getSBForum, getSBForumFunc)

  // TODO: if we use redis then we have to use redisGetForum to get forum data
  router.post(getSBForum, redisGetForum)

  // TODO: if we use mongo the to remove form data use removeSBForumFunc
  // router.post(removeSBForum, removeSBForumFunc)

  // TODO: if we use redis then we have to use redisDeleteForum to delete forum data
  router.post(removeSBForum, redisDeleteForum)

  router.post(categoryList, getListOfCategories);
  router.post(tagsList, getTagsRelatedTopics);
  router.post(contextBasesTags, getContextBasedTags)
  router.post(createRelatedDiscussions, relatedDiscussions);
  router.post(copyPrivilages, copyPrivilegeData);
  router.post(getUids, getUserIds);
  router.post(addUserIntoGroup, addUsers);
  router.post(listOfGroupUsers, getContextUserGroups);
  router.post(groupsPriveleges, getContextGroupPriveleges);

  router.get('/api/forum/test/user/:userslug', getUserDetails);

  router.post(
    createForumURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    createForumAPI
  )
  router.post(
    allTopicsByCategoryURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    allTopicsByCategory
  )
  router.post(
    allPostsByTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    allPostsByTopic
  )
  router.post(
    getForumURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    getForumAPI
  )
  router.post(
    createTenantURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    setupOrgAPI
  )
  router.post(
    createSectionURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    addSectionURL
  )
  router.put(
    banUserURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    banUserAPI
  )
  router.delete(
    unbanUserURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    unbanUserAPI
  )
  router.post(
    createTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    createTopicAPI
  )
  router.post(createCatwithSubcatURL, createCatwithSubcat)
  router.post(
    replyTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    replyTopicAPI
  )
  router.post(
    voteURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    voteURLAPI
  )
  router.delete(
    deletePostURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    deletePostAPI
  )
  router.delete(
    deleteTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    deleteTopicAPI
  )
  router.delete(
    purgeTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    purgeTopicAPI
  )
  router.delete(
    purgePostURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    purgePostAPI
  )
  callback()
}