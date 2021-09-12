/**
 * This file have 2 objects 
 * 1. requiredParams: Every api have some required params, and we need to validate that params are 
 *    present or not, so what every the required parms need that particuler api, you have to add it 
 *    here and follow the same structure.
 * 
 * 2. forumStrings: At some places we need some strings, instead of hard coading those string at every plase 
 *    add those string here and import the json where ever and use this strings.
 * 
 */

const Settings = require.main.require('./src/settings');
module.exports = {
    requiredParams: {
        '/api/forum/v3/category/:cid/privileges': [
            {
                type: 'array',
                name: 'groups'
            }
        ],
        '/api/forum/v3/groups/users': [
            {
                type: 'any',
                name: 'cid'
            }
        ],
        '/api/forum/v3/group/membership': [
            {
                type: 'array',
                name: 'groups'
            },
            {
                type: 'array',
                name: 'members'
            },
        ],
        '/api/privileges/v2/copy': [
            {
                type: 'any',
                name: 'pid'
            },
            {
                type: 'any',
                name: 'cid'
            }
        ],
        '/api/category/list': [
            {
                type: 'array',
                name: 'cids'
            }
        ],
        '/api/tags/list': [
            {
                type: 'array',
                name: 'cid'
            },
            {
                type: 'string',
                name: 'tag'
            }
        ],
        '/api/forum/v3/remove': [
            {
                type: 'string',
                name: 'sbType'
            },
            {
                type: 'string',
                name: 'sbIdentifier'
            },
            {
                type: 'array',
                name: 'cid'
            }
        ],
        '/api/forum/v2/read': [
            {
                type: 'string',
                name: 'type'
            },
            {
                type: 'string',
                name: 'identifier'
            }
        ],
        '/api/forum/v2/create': [
            {
                type: 'string',
                name: 'sbType'
            },
            {
                type: 'string',
                name: 'sbIdentifier'
            },
            {
                type: 'array',
                name: 'cid'
            }
        ],
        '/api/forum/v2/remove': [
            {
                type: 'string',
                name: 'sbType'
            },
            {
                type: 'string',
                name: 'sbIdentifier'
            },
            {
                type: 'array',
                name: 'cid'
            }
        ],
        '/api/forum/v2/uids': [
            {
                type: 'array',
                name: 'sbIdentifiers'
            }
        ],
        '/api/forum/v3/create': [
            {
                type: 'objet',
                name: 'category'
            }
        ],
        '/api/forum/v3/user/profile': [
            {
                name: 'fullname',
                type: 'string'
            },
            {
                name: 'sbIdentifier',
                type: 'string'
            }
        ]
    },
    forumStrings: {
        payloadError: 'Request payload error',
        statusSuccess: 'Success',
        resCode: 'OK',
        statusFailed: 'failed',
        serverError: 'SERVER_ERROR',
        http_protocal: 'http',
        apiPrefix: '/api',
        oAuthKey: 'sunbird-oidc',
        privilegesCopy: 'Privileges copied successfuly',
        emptyDataForGroups: 'You have to pass both sbUid and sbUserName',
        removeForumFailMsg: 'Invalid input parameter | Data does not exist',
        removeForumSuccessMsg: 'Forum remove for context success',
        contextError: 'Bad context data',
        categoryError: 'Category creation failed',
        subCategoryError: 'Subcategories should contain either groups or privileges but not both',
        privilegeGroupErrorMsg: 'Request have both groups and privileges but request should contain either groups or privileges',
        pluginSettings: new Settings('fusionauth-oidc', '1.0.0', {
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
        userFields: ['fullname'],
        userDataError: 'User not found.',
        userDataSave: 'User profile updated successfully.'
    }
}
