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
  
const mongodbConnectionUrl =  `mongodb://${configData.mongo.host}:${configData.mongo.port}/${configData.mongo.database}`;
mongoose.connect(mongodbConnectionUrl);
const sbCategoryModel = mongoose.model('sbcategory', forumSchema);
console.log('SB config Json: ', configData);
console.log('SB Mongo URL: ', mongodbConnectionUrl)
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
  'errorResCode': 'SERVER_ERROR',
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
function createSBForumFunc (req, res) {
  console.log("SB Forum Create Log: request payload=", req.body);
  const payload = { ...req.body.request };
  let resObj = {
    id: 'api.discussions.category.forum',
    status: 'successful',
    resCode: 'OK',
    data: null
  } 
  const SbObj = new sbCategoryModel(payload);
  if( payload ) {
  console.log("Creating the forum");
  SbObj.save().then(data => {
    console.log("forum created");
    resObj.data = data;
    res.send(responseMessage.successResponse(resObj))
  }).catch(error => {
    console.log("Error while Creating the forum");
    resObj.status = 'failed';
    resObj.resCode = 'SERVER_ERROR';
    resObj.err = error.status;
    resObj.errmsg = error.message;
    res.send(responseMessage.errorResponse(resObj));
  });
  }
}

/**
 * This function return the category id's based on the id and type.
 * @param {*} req 
 * @param {*} res 
 */
function getSBForumFunc (req, res) {
  console.log("SB Forum Get Log: request payload", req.body);
  const payload =  { ...req.body.request };
  const id = payload.identifier;
  const type = payload.type;
  let resObj = {
    id: 'api.discussions.category.forum',
    status: 'successful',
    resCode: 'OK',
    data: null
  } 
  
  if( id && type ) {
    console.log('Get forumId');
    sbCategoryModel.find({sbIdentifier: id, sbType: type}).then(data => {
    console.log('SB Forum Get Log: db operation success=>', data);
    resObj.data = data;
    res.send(responseMessage.successResponse(resObj))
  }).catch(error => {
    console.log('Error while getting the forumId');
    resObj.status = 'failed';
    resObj.resCode = 'SERVER_ERROR';
    resObj.err = error.status;
    resObj.errmsg = error.message;
    res.send(responseMessage.errorResponse(resObj));
  });
  } else {
    resObj.status = 'failed';
    resObj.resCode = 'Request payload error';
    resObj.err = 400;
    resObj.errmsg = 'Type and identifier required parameters';
    res.status(400);
    res.send(responseMessage.errorResponse(resObj));
  }
}

/**
 * This function will remove the  the category ids based on the sb_id and sb_type.
 * @param {*} req 
 * @param {*} res 
 */
function removeSBForumFunc (req, res) {
  console.log(" removing category: payload: ", req.body);
  const payload = { ...req.body.request };
  let resObj = {
    id: 'api.discussions.category.forum',
    status: 'successful',
    resCode: 'OK',
    data: null
  }
  if( payload ) {
  console.log("Removing the category id ");
  sbCategoryModel.deleteOne(payload).then(data => {
    if (data.deletedCount > 0) {
      console.log("category deleted");
      res.send(responseMessage.successResponse(resObj))
    } else {
      console.log("failed to delete category");
      resObj.status = "failed"
      resObj.resCode = 'SERVER_ERROR';
      resObj.errmsg = "Invalid input parameter | Data does not exist";
      resObj.err = "404"
      res.status(404);
      res.send(responseMessage.errorResponse(resObj));
    }
  }).catch(error => {
    console.log("Error while removing the category");
    resObj.status = 'failed';
    resObj.resCode = 'SERVER_ERROR';
    resObj.err = error.status;
    resObj.errmsg = error.message;
    res.send(responseMessage.errorResponse(resObj));
  });
  }
}

async function getListOfCategories(req, res) {
  const payload = { ...req.body.request };
  let resObj = {
    id: constants[categoryList],
    status: constants.statusSuccess,
    resCode: constants.resCode,
    data: null
  }

  if(!_.isEmpty(payload) && !_.isEmpty(payload.cids)) {
  const cids = payload.cids;
  const path = req.originalUrl.replace(constants.key, '');
  const url = `${req.protocol}://${req.get('host')}${path}`;
  let allCategories = [];
  for(let i = 0; i < cids.length; i++) {
    const options = {
      uri: url+cids[i],
      method: 'GET',
      json: true
    };
    console.log(options);
      try {
        const data = await requestPromise(options);
          allCategories.push(data);
          if (i === (cids.length -1)) {
            resObj.data = allCategories;
            res.send(responseMessage.successResponse(resObj));
          }
      } catch(error) {
        console.log({message: `Error while call the api ${options.url}`})
        console.log({message: `Error message:  ${error.message}`})
        res.statusCode = 404;
        resObj.status = constants.failed;
        resObj.resCode = constants.errorResCode;
        resObj.err = error.status;
        resObj.errmsg = `cid ${cids[i]} - ${error.message}`;
        res.send(responseMessage.errorResponse(resObj));
      }
    }
  } else {
    res.statusCode = 400;
    resObj.status = constants.failed;
    resObj.resCode = constants.errorResCode;
    resObj.err = 400;
    resObj.errmsg = "Cids is required parameter";
    res.send(responseMessage.errorResponse(resObj));
  }
}

async function getTagsRelatedTopics(req,res) {
  const payload = { ...req.body.request };
  let resObj = {
    id: constants[tagsList],
    status: constants.statusSuccess,
    resCode: constants.resCode,
    data: null
  }
  if (!_.isEmpty(payload) && !_.isEmpty(payload.tag) && !_.isEmpty(payload.cid)) {
    const tag = payload.tag;
    const cid = payload.cid;
    const path = req.originalUrl.replace(constants.key, '');
    const url = `${req.protocol}://${req.get('host')}${path}${tag}`;
    const options = {
      uri: url,
      method: 'GET',
      json: true
    };
    try {
      const data = await requestPromise(options);
      const releatedTopics = data.topics.filter(topic => cid.includes(topic.cid));
      resObj.data = releatedTopics;
      res.send(responseMessage.successResponse(resObj));
    } catch(error) {
      console.log({message: `Error while call the api ${options.url}`})
      console.log({message: `Error message:  ${error.message}`})
      res.statusCode = 404;
      resObj.status = constants.failed;
      resObj.resCode = constants.errorResCode;
      resObj.err = error.status;
      resObj.errmsg = error.message;
      res.send(responseMessage.errorResponse(resObj));
    }
  } else {
    res.statusCode = 400;
    resObj.status = constants.failed;
    resObj.resCode = constants.errorResCode;
    resObj.err = 400;
    resObj.errmsg = "Tag and Cid are required parameters";
    res.send(responseMessage.errorResponse(resObj));
  }
}

async function getUserIds(req,res) {
  const oAuthids = req.body.request.sbIdentifiers;
  const groupData = await privileges.categories.groupPrivileges(5, 'testg')
  try {
    const userIds = await userDetails(oAuthids);
    const data = {groupData: groupData, userIds:userIds}
    res.send(responseData(req,res, getUids ,data, null))
  } catch(error) {
    console.log(error)
    res.send(responseData(req,res, getUids ,null, error))
  }
}

async function userDetails(sbIds) {
  return new Promise((resolve, reject) => {
    let userIds= [];
    try {
      sbIds.forEach(async (sbId, index) => {
        const userId = await db.getObjectField(constants.name + 'Id:uid', sbId);
        if (userId === null) {
          const error = new Error("uid not found");
          error.statusCode = 400;
          reject(error);
        }
        userIds.push({nodebbUid: userId, sbUid: sbId})
        if(index === (sbIds.length -1)) {
          resolve(userIds)
        }
      })
    } catch(error) {
      error.statusCode = 500;
      reject(error);
    }
  })
}

/**
 * @param  {} req
 * @param  {} res
 * this the generalization of api for course and groups
 */
async function relatedDiscussions (req, res) {
    const payload = { ...req.body.category };
    if (!_.isEmpty(payload)) {
          let privilegesError;
          // checking of both privileges and groups present
         if (!_.isEmpty(payload.groups) && !_.isEmpty(payload.privileges)) {
            privilegesError = new Error("Request have both groups and privileges but request should contain either groups or privileges");
            privilegesError.statusCode = 400;
            res.send(responseData(req,res,createRelatedDiscussions,null, privilegesError));
          } else {
            let finalResponse = {};
            // creating a category
            const body = {
              parentCid: payload.pid || 0,
              name: payload.name || constants.defaultCategory,
              description: _.get(payload, 'description') 
            };
            const cdata = await Categories.create(body);

           if(cdata) {
            console.log('Creating new category')
              const context = payload.context;
              // checking for context
              if(!_.isEmpty(context)) {
                // add category id with a context
                finalResponse['forums'] = await addContext(context, cdata.cid);
                
                // checking for privileges 
                if(payload.privileges && !_.isEmpty(payload.privileges.copyFromCategory)){
                  // coping privileges from selected category id
                  const result = await Categories.copyPrivilegesFrom(payload.privileges.copyFromCategory, cdata.cid);
                  // getting groups and users present in groups 
                  const members = await getMembers(cdata.cid);
                  finalResponse['groups'] = members;
                  try{
                    // check for sub categories
                    const subCategory = await checkSubcategories(payload.subcategories, cdata.cid);
                    finalResponse.subcategories = subCategory;
                    res.send(finalResponse)
                  } catch(error) {
                      res.send(responseData(req,res,createRelatedDiscussions,null, error));
                  }
                } else if(!_.isEmpty(payload.groups)) {  // checking for groups
                  const addPrivileges = await groupsAndPrivileges(cdata.cid, payload.groups);
                  const members = await getMembers(cdata.cid);
                  finalResponse['groups'] = members;
                  try{
                    // check for subcategories
                    const subCategory = await checkSubcategories(payload.subcategories, cdata.cid);
                    finalResponse.subcategories = subCategory;
                    res.send(finalResponse)
                  } catch(error) {
                    res.send(responseData(req,res,createRelatedDiscussions,null, error));
                  }
                } else {
                  res.send(finalResponse)
                }
              } else {
                const contextError = new Error("Bad context data");
                contextError.statusCode = 400;
                res.send(responseData(req,res,createRelatedDiscussions,null, contextError));
              }              
          } else {
            console.log('category creation failed')
            console.log('Error is', cdata.message)
            res.send(responseData(req,res,createRelatedDiscussions,null, cdata));
          }
      }
    } else {
      const dataError = new Error("Category is required parameter");
      dataError.statusCode = 400;
      res.send(responseData(req,res,createRelatedDiscussions,null, dataError));
    }
}

/**
 * @param  {} context
 * @param  {} cid
 * This method will map a category id with a context object and return's
 *  a response as array
 * Example:
 * [{
      "sbType": string,
      "sbIdentifier": string,
      "newCid": number,
      "cids": array
    }]
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
        const SbObj = new sbCategoryModel(mapObj);
        const mapResponse = await SbObj.save(); // save the request object into mongo collection
        // fetching already mapped category id's
        const mappedCids = await sbCategoryModel.find({sbIdentifier: contextData.identifier, sbType: contextData.type})
        const listOfCids = mappedCids.map(forum => forum.cid);
        // Preparing the response object
        const mapResObj = {
          "sbType": contextData.type,
          "sbIdentifier": contextData.identifier,
          "newCid": cid,
          "cids": listOfCids
        }
        forumIds.push(mapResObj);
        if(i === (context.length - 1)){ 
          resolve(forumIds)
        }
    });
  });
}

async function checkSubcategories(subcategories, cid) {
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

async function addSubcategories(subCategories, pid) {
  let subCategoryResponse =[];
  return new Promise((resolve, reject) => {
    subCategories.forEach(async (category, index) => {
      let privilegesError;
     if (!_.isEmpty(category.groups) && !_.isEmpty(category.privileges)) {
        privilegesError = new Error("Subcategories should contain either groups or privileges but not both");
        privilegesError.statusCode = 400;
        reject(privilegesError);
      } else {
          const categoryObj = {
            name: category.name,
            parentCid: pid,
            description: _.get(category, 'description') 
          };
          const creatSubCategory =  await Categories.create(categoryObj);
          const data = {
            name: creatSubCategory.name,
            cid: creatSubCategory.cid,
            pid: pid,
            groups: []
          };

          // Mapping the context if exists for sub category 
          if(!_.isEmpty(category.context)) {
            category.context.forEach(async (context) => {
              const addPropertyInCategory = await Categories.setCategoryField(creatSubCategory.cid, 'contextId', context.identifier);
              const contextObj = {
                "sbType": context.type,
                "sbIdentifier": context.identifier,
                "cid": creatSubCategory.cid
              }
              const SbObj = new sbCategoryModel(contextObj);
              const mapResponse = await SbObj.save();
            })
          }
          
          //  checking for privileges 
          if(category.privileges && category.privileges.copyFromParent){
            const result = await Categories.copyPrivilegesFrom(pid, creatSubCategory.cid);
            data['groups'] = await getMembers(creatSubCategory.cid);
            subCategoryResponse.push(data);
            if(index === (subCategories.length -1)) {
              resolve(subCategoryResponse)
            } 
          }else if(!_.isEmpty(category.groups)) {
            const addPrivileges = await groupsAndPrivileges(creatSubCategory.cid, category.groups);
            data['groups'] = await getMembers(creatSubCategory.cid);
            subCategoryResponse.push(data);
            if(index === (subCategories.length -1)) {
              resolve(subCategoryResponse)
            }
          } else {
            subCategoryResponse.push(data);
            if(index === (subCategories.length -1)) {
              resolve(subCategoryResponse)
            }
          }

      }
    });
  })
}

/**
 * @param  {} cid
 * This method will fetch groups added for a particuler category and users exists in a groups
 * Response 
 * Example
 * [
  * {
  * name: groupName(string),
  * members: [
  * {
  *   "uid": number,
      "userName": string,
      "sbUid": string
  * }
  ......
    ]
  * }
  ......
 * ]
 */
async function getMembers(cid) {
  // getting the groups list added for a category
  const groupsList = await privileges.categories.list(cid);
  const categoryGroups = groupsList.groups.map(group => group.name);
  // fetching nodebb uids added in all groups 
  const groupsData = await Groups.getMembersOfGroups(categoryGroups);
  let userList = [];
  return new Promise((resolve, reject) => {
    if(!_.isEmpty(groupsData)) {
      groupsData.forEach(async (groupUsers, i) => {
        let data = {
          name: categoryGroups[i]
        };
        if(groupUsers && groupUsers.length > 0){
          // getting nodebb user details by passing nodebb uids
          data['members'] = await getUserDetails(groupUsers);
        } else {
          data['members'] = [];
        }
        userList.push(data);
        if(i === (groupsData.length -1)) {
          resolve(userList);
        }
      });
    } else {
      resolve(userList)
    }
  })
}

async function groupsAndPrivileges(cid, groups){
  return new Promise(async (resolve, reject) => {
    for (let i=0; i < groups.length; i++){
      const groupData = groups[i];
      const isGroupExists = await Groups.exists(groupData.name);
      if(!isGroupExists) {
        Groups.create({
          name: groupData.name
        });
      }
        const addGroupAndPrivileges = await privileges.categories.give(groupData.privileges, cid, groupData.name)
        try {
        const nodebbUids = await userDetails(groupData.sbUids);
        for(let j=0; j < nodebbUids.length; j++){
          const groupSlug = await Groups.getGroupField(groupData.name, 'slug');
         const addUserIntoGroups = await Groups.join(groupData.name, nodebbUids[j]['nodebbUid']);
        }
      } catch(error) {
        console.log(error)
        return;
      }
      if(i === (groups.length -1)) {
        resolve({code: 'ok'})
      }
    }
  })
}

function responseData(req,res, url,data,error) {
  let resObj = {
    id: constants[url] || req.originalUrl.split('/').join('.'),
    status: constants.statusSuccess,
    resCode: constants.resCode,
    data: null
  }
  if(error) {
    res.statusCode = error.statusCode || 500;
    resObj.status = constants.failed;
    resObj.resCode = constants.errorResCode;
    resObj.err = error.statusCode || 500;
    resObj.errmsg = error.message;
    return responseMessage.errorResponse(resObj);
  }
  resObj.data = data.result || data;
  return responseMessage.successResponse(resObj);
}

async function getResponseData(req, url, upstremUrl, payload, method) {
  try {
  console.log('Preparing request options')
  console.log('original url', req.originalUrl)
  const apiSlug = req.originalUrl.split(upstremUrl).join('');
  console.log('apiSlug', apiSlug)
  const baseUrl = `${constants.http_protocal}://${req.get('host')}${apiSlug}${constants.apiPrefix}`
  const options = {
          uri: baseUrl + url,
          method: method,
          headers: {
            "Authorization": req.headers['authorization']
          },
          json: true
        };
      if(payload) {
        options.body = payload;
      }
    console.log(options)
    const result  = await requestPromise(options);
    return result;
  } catch(error) {
    return error; 
  }
}

async function copyPrivilegeData(req, res) {
  const payload = { ...req.body.request };
  if (!_.isEmpty(payload) && !_.isEmpty(payload.pid) && !_.isEmpty(payload.cid)) {
    const fromCid = payload.pid;
    const toCid = payload.cid;
    const copyPrivilege = await Categories.copyPrivilegesFrom(fromCid, toCid);
    const result = "Privileges copied successfuly"
    res.send(responseData(req,res,copyPrivilages,result, null));
  } else{
    const error = new Error("Pid and cid required parameters");
    error.statusCode = 400;
    res.send(responseData(req,res,copyPrivilages,null, error))
  }
}

async function copyPrivilegesFromCategory(req, body, upstremUrl) {
 return new Promise(async (resolve, reject) =>{
  const payload = { ...body.request };
  const cid = payload.cid;
  const pid = payload.pid;
  const uid = payload.uid;
  const categoryPrivilages = await privileges.categories.list(pid);
  categoryPrivilages.groups.forEach(async (group, index) => {
    const groupPrivileges = group.privileges;
    const data = Object.keys(groupPrivileges).filter(x => groupPrivileges[x] === true);
    const reqObj = {
      privileges: data,
      groups: [group.name]
    }
    try {
    const result = await getResponseData(req, `${constants.createPrivileges}?_uid=${uid}`.replace(':cid', cid), upstremUrl, reqObj , constants.put);
    console.log('Privilege result: ',result)
      if(result && (result['statusCode'] === 401 || result['statusCode'] === 403) ) {
        const error = new Error(result);
        error['statusCode'] = result['statusCode'];
        throw error;
      }
      if(index === (categoryPrivilages.groups.length- 1)){
        resolve(result);
      }
    } catch(error) {
        reject(error);
  }
  });
 })
}

async function addUsers(req, res) {
  const payload = { ...req.body.request };
  const groupsList = payload.groups;
  const sunbirdUsers = payload.members;
  let userList = [];
    if(groupsList && groupsList.length > 0 && sunbirdUsers && sunbirdUsers.length > 0) {
      sunbirdUsers.forEach(async (user, index) => {
        let nodebbUid = await db.getObjectField(constants.name + 'Id:uid', user.sbUid);
        if(!nodebbUid) {
          try {
            nodebbUid = await createNewUser(user);
          } catch(error) {
            console.log(error)
            error.statusCode = 400;
            res.send(responseData(req,res,addUserIntoGroup,null, error));
            return false;
          }
        }
        console.log("Uid : ", nodebbUid)
        const addIntoGroups = await addUsersInGroup(groupsList, nodebbUid);
        if (index === (sunbirdUsers.length -1)) {
          const groupsData = await Groups.getMembersOfGroups(groupsList);
          if(groupsData && groupsData.length > 0) {
            groupsData.forEach(async (groupUsers, i) => {
              let data = {
                name: groupsList[i]
              };
              if(groupUsers && groupUsers.length > 0){
                data['members'] = await getUserDetails(groupUsers);
              } else {
                data['members'] = []
              }
              userList.push(data);
              if(i === (groupsData.length -1)) {
                const result = {
                  groups: userList
                };
                  res.send(responseData(req,res,addUserIntoGroup,result, null));
              }
            });
          }
        }
      }) 
    } else {
      const errorMsg = new Error(constants.emptyDataFOrGroupsAndMembers);
      errorMsg.statusCode = 400;
      res.send(responseData(req,res,addUserIntoGroup,null, errorMsg));
    }
}

// creating new user using nodebb-plugin-sunbird-oidc plugin
function createNewUser(user) {
  return new Promise((resolve, reject) => {
    if(user.sbUserName && user.sbUid) {
      const settings = constants.pluginSettings.getWrapper();
      var email = user.sbUserName + '@' + settings.emailDomain;
      const userPayload = {
        username: user.sbUserName,
        oAuthid: user.sbUid,
        email: email,
        rolesEnabled: settings.rolesClaim && settings.rolesClaim.length !== 0,
        isAdmin: false,
      }
      console.log(oidcPlugin)
      oidcPlugin.login(userPayload, (err, user) => {
        if(err && err === 'UserExists') {
          resolve(user.uid);
          return;
        } else if(user) {
          resolve(user.uid);
        } else {
          reject(err);
        }
      });
    } else {
      const errorMessage = {message: constants.emptyDataForGroups};
      reject(errorMessage)
    }
  })
}

// Adding users into groups  
function addUsersInGroup(groups, uid) {
  console.log(groups, uid)
  return new Promise((resolve, reject) => {
    groups.forEach(async (group, i) => {
      const isGroupExists = await Groups.exists(group);
      if(!isGroupExists) {
        Groups.create({
          name: group
        });
      }
      const joinIntoGroup = await Groups.join([group], uid);
      if(i === (groups.length -1)) {
        resolve({code: "ok"})
      }
    })
  })
} 

// Fetch list of users added into a group
async function getUserGroups(req, res) {
  const payload = { ...req.body.request };
  const groups = payload.groups || [];
  const cid = payload.cid;
  const groupsList= await privileges.categories.list(cid);
  const cgroupd = groupsList.groups.map(group => group.name);
  const allGroups = Array.from(new Set(cgroupd.concat(groups)));
  console.log(allGroups)
  const groupsData = await Groups.getMembersOfGroups(allGroups);
  console.log(groupsData)
  let userList = [];
  if(groupsData && groupsData.length > 0) {
    groupsData.forEach(async (groupUsers, i) => {
      let data = {
        name: allGroups[i]
      };
      if(groupUsers && groupUsers.length > 0){
        data['members'] = await getUserDetails(groupUsers);
      } else {
        data['members'] = []
      }
      userList.push(data);
      if(i === (groupsData.length -1)) {
        const result = {
          groups: userList
        };
        res.send(responseData(req,res,listOfGroupUsers,result,null))
      }
    });
  }
}


/**
 * @param  {} groupUsers
 * input: groupUsers = [1,2,3] nodebb uids
 * response : [
 *  {
 *      uid: number,
 *      userName: string,
 *      sbUid: string
 *  }
 * ]
 */
async function getUserDetails(groupUsers) {
  const users = [];
  return new Promise((resolve, reject) => {
    groupUsers.forEach(async (uid, i) => {
      // fetching the user details bu passing uid
      const userDetails = await Users.getUserData(uid)
      const data = {
        "uid": userDetails.uid,
        "userName": userDetails.username,
        "sbUid": userDetails['sunbird-oidcId']
      }
      users.push(data)
      if(i === (groupUsers.length -1)) {
        resolve(users)
      }
    })
  })
}

async function getGroupPriveleges(req, res) {
  const payload = {...req.body.request};
  const groups = payload.groups;
  const cid = req.params.cid;
  if (cid && groups && groups.length > 0) {
    const isCidExist = await Categories.exists(cid);
    let groupsData = [];
    if(isCidExist) {
      const groupsList= await privileges.categories.list(cid);
      groups.forEach((group, index) => {
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
          res.send(responseData(req,res,groupsPriveleges,result,null));
        }
      })
    } else {
      const cidError = new Error(constants.incorrectCid.replace('${cid}', cid));
      cidError.statusCode = 400;
      res.send(responseData(req,res,groupsPriveleges,null,cidError));
    }
  } else {
    const dataError = new Error(constants.emptyGroupsMsg);
    dataError.statusCode = 400;
    res.send(responseData(req,res,groupsPriveleges,null,dataError));
  }
}

async function getCategories(req, res) {
  const payload = { ...req.body.request };
  const data = await Categories.getAllCategoryFields(['contextId', 'cid'])
  const result = data.filter(x => x.contextId === payload.identifier);
  res.send(result)
}


Plugin.load = function (params, callback) {
  var router = params.router

  router.post(createSBForum, createSBForumFunc)
  router.post(getSBForum, getSBForumFunc)
  router.post(removeSBForum, removeSBForumFunc)
  router.post(categoryList, getListOfCategories);
  router.post(tagsList, getTagsRelatedTopics);
  router.post(createRelatedDiscussions, relatedDiscussions);
  router.post(copyPrivilages, copyPrivilegeData);
  router.post(getUids, getUserIds);
  router.post(addUserIntoGroup, addUsers);
  router.post(listOfGroupUsers, getUserGroups);
  router.post(groupsPriveleges, getGroupPriveleges);
  router.post('/api/forum/v3/categories', getCategories);

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