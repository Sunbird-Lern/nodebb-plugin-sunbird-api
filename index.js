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
    console.log("category deleted");
    res.send(responseMessage.successResponse(resObj))
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

Plugin.load = function (params, callback) {
  var router = params.router

  router.post(createSBForum, createSBForumFunc)
  router.post(getSBForum, getSBForumFunc)
  router.post(removeSBForum, removeSBForumFunc)

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