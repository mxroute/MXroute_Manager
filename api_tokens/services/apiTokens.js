/*
# api_tokens/services/apiTokens.js                 Copyright 2019 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/io/uapi-request",
        "cjt/io/batch-request",
        "cjt/modules",
        "cjt/io/api",
        "cjt/io/uapi",
        "cjt/services/APICatcher"
    ],
    function(angular, _, LOCALE, APIRequest, BatchAPIRequest) {

        "use strict";

        var MODULE_NAMESPACE = "cpanel.apiTokens.services.apiTokens";
        var SERVICE_NAME = "APITokensService";
        var MODULE_REQUIREMENTS = [ "cjt2.services.apicatcher" ];
        var SERVICE_INJECTABLES = ["APICatcher", "$q", "$log"];

        var APIToken = function(id, unrestricted, features, createdOn) {
            this.id = id;
            this.new = false;
            this.label = id;
            this.unrestricted = unrestricted;
            if (!_.isBoolean(unrestricted)) {
                this.unrestricted = unrestricted && unrestricted.toString() === "1";
            }
            this.features = features;
            this.createdOn = parseInt(createdOn, 10);
        };

        /**
         *
         * Service Factory to generate the Account Preferences service
         *
         * @module ApiTokensService
         * @memberof cpanel.apiTokens
         *
         * @param {Object} APICatcher base service
         * @returns {Service} instance of the Domains service
         */
        var SERVICE_FACTORY = function(APICatcher, $q, $log) {

            var Service = function() {};

            Service.prototype = Object.create(APICatcher);

            _.assign(Service.prototype, {

                _featuresMetadata: null,

                _tokens: [],

                /**
                 * Wrapper for .promise method from APICatcher
                 *
                 * @param {Object} apiCall api call to pass to .promise
                 * @returns {Promise}
                 *
                 * @example $service._promise( $service._apiCall( "Tokens", "rename", { name:"OLDNAME", new_name:"NEWNAME" } ) );
                 */
                _promise: function _promise() {

                    // Because nested inheritence is annoying
                    return APICatcher.promise.apply(this, arguments);
                },

                /**
                 * Wrapper for building an apiCall
                 *
                 * @private
                 *
                 * @param {String} module module name to call
                 * @param {String} func api function name to call
                 * @param {Object} args key value pairs to pass to the api
                 * @returns {UAPIRequest} returns the api call
                 *
                 * @example _apiCall( "Tokens", "rename", { name:"OLDNAME", new_name:"NEWNAME" } )
                 */
                _apiCall: function _createApiCall(module, func, args) {
                    var apiCall = new APIRequest.Class();
                    apiCall.initialize(module, func, args);
                    return apiCall;
                },

                /**
                 * Wrapper for building an batch apiCall
                 *
                 * @private
                 *
                 * @param {Array<APIRequest>} apiCalls Api calls to process as a batch
                 * @returns {BatchAPIRequest} returns the api call
                 *
                 * @example _batchAPICall( [_apiCall("Tokens", "rename", { name:"OLDNAME", new_name:"NEWNAME" }), _apiCall("Tokens", "rename", { name:"OLDNAME", new_name:"NEWNAME" })] )
                 */
                _batchAPICall: function _createBatchAPICall(apiCalls) {
                    var batchAPICall = new BatchAPIRequest.Class(apiCalls);
                    return batchAPICall;

                },

                /**
                 * Process a single result of a fetchTokens call
                 *
                 * @private
                 *
                 * @param {Object} result single result item from a fetchTokens() call
                 * @returns {Object} sanitized result object
                 *
                 * @example fetchTokens()
                 */
                _processAPITokenResult: function _processAPITokenResult(apiTokenResult) {
                    var id = apiTokenResult.name;
                    var unrestricted = apiTokenResult.has_full_access;
                    var features = apiTokenResult.features;
                    var createdOn = apiTokenResult.create_time;
                    return new APIToken(id, unrestricted, features, createdOn);
                },

                /**
                 * Process the results of a fetchTokens call
                 *
                 * @private
                 *
                 * @param {Object} results fetchTokens() api results object with a .data param
                 * @returns {Array<Object>} returns an array of processed items
                 *
                 * @example _processAPITokensResults({data:[]})
                 */
                _processAPITokensResults: function _processAPITokensResults(results) {
                    var apiTokens = results.data;
                    this._tokens = apiTokens.map(this._processAPITokenResult.bind(this));
                    return this._tokens;
                },

                /**
                 * Create a fetchTokens api call, but don't process it
                 *
                 * @private
                 *
                 * @returns {APIRequest} returns the APIRequest for fetchTokens();
                 *
                 * @example _getAPITokens()
                 */
                _fetchTokens: function _getAPITokens() {
                    var apiCall = this._apiCall("Tokens", "list");
                    return apiCall;
                },

                /**
                 * Create a deleteToken api call, but don't process it
                 *
                 * @private
                 *
                 * @param {String} id token name to delete
                 * @returns {APIRequest} returns the APIRequest for fetchTokens();
                 *
                 * @example _deleteToken("mytokenhash")
                 */
                _deleteToken: function _deleteAPIToken(id) {
                    var apiCall = this._apiCall("Tokens", "revoke", {
                        name: id
                    });
                    return apiCall;
                },

                /**
                 * Process A Feature Result
                 *
                 * @param {string} installed perl boolean 1|0
                 * @param {string} featureKey id of the feature
                 * @param {string} featureLabel descriptive label of the feature
                 * @param {Array} badges array of badge strings associated with the feature
                 * @returns {object} feature object
                 */
                _processFeatureResult: function _processFeatureResult(installed, featureKey, featureLabel, badges) {
                    return {
                        label: featureLabel,
                        id: featureKey,
                        installed: installed && installed.toString() === "1",
                        badges: badges
                    };
                },

                /**
                 * For each feature item in the results, create a feature object
                 *
                 * @param {Object} results
                 * @returns {Array<Object>} array of feature objects
                 */
                _processFeaturesResults: function _processFeaturesResults(results) {
                    var self = this;
                    var data = results.data;
                    if (data) {
                        var features = [];
                        angular.forEach(data, function(installed, featureKey) {
                            var featureLabel = featureKey;
                            var badges = [];
                            if (self._featuresMetadata && self._featuresMetadata[featureKey]) {
                                var featureMeta = self._featuresMetadata[featureKey];
                                featureLabel = featureMeta.name;
                                if (featureMeta.is_cpaddon.toString() === "1") {
                                    badges.push( LOCALE.maketext("[asis,cPAddon]") );
                                }
                                if (featureMeta.is_plugin.toString() === "1") {
                                    badges.push( LOCALE.maketext("Plugin") );
                                }
                            }

                            features.push( self._processFeatureResult(installed, featureKey, featureLabel, badges ) );
                        });

                        // Only return the installed ones
                        var installedFeatures = features.filter(function(feature) {
                            return feature.installed;
                        });

                        // Always sort them by label
                        return _.sortBy(installedFeatures, function(feature) {
                            return feature.label;
                        });
                    }
                },

                /**
                 * Build the getFeatures APICall
                 *
                 * @returns {UAPIRequest} uapi request for Features list_features
                 */
                _getFeatures: function _getFeatures() {
                    var apiCall = this._apiCall("Features", "list_features");
                    return apiCall;
                },

                /**
                 * Process the result of a Features get_features_metadata call
                 *
                 * @param {Object} result object with a data parameter
                 */
                _processFeatureMetadataResult: function _processFeatureMetadataResult(result) {
                    var data = result.data;
                    this._featuresMetadata = {};
                    if (data) {
                        data.forEach(function(featureMetaItem) {
                            this._featuresMetadata[featureMetaItem.id] = featureMetaItem;
                        }, this);
                    }
                },

                /**
                 * Wrapper for building an fetchTokens apiCall
                 *
                 * @public
                 *
                 * @returns {Promise<Object>} returns the promise and then the processed api tokens
                 *
                 * @example fetchTokens()
                 */
                fetchTokens: function getAPITokens() {
                    var apiCall = this._fetchTokens();
                    return this._promise(apiCall).then(this._processAPITokensResults.bind(this));
                },

                /**
                 * Get the current list of tokens
                 *
                 * @returns {Array<APIToken>} array of APIToken objects
                 */
                getTokens: function getTokens() {
                    return this._tokens;
                },

                /**
                 * Wrapper for building an deleteTokens apiCall
                 *
                 * @public
                 *
                 * @param {Array<String>} tokens array of token hashes to delete
                 * @returns {Promise<Object>} returns the promise and then the updated api tokens
                 *
                 * @example deleteTokens(["tokenHASH","otherTokenHash"])
                 */
                deleteTokens: function deleteAPITokens(tokens) {
                    var self = this;
                    var tokenCalls = tokens.map( self._deleteToken.bind(self) ).map( self._promise.bind(self) );
                    return $q.all(tokenCalls).then( self.fetchTokens.bind(self) );
                },

                /**
                 * API Wrapper call for obtaining the features list
                 *
                 * @returns {Array<Object>} array of feature objects
                 */
                getFeatures: function getFeatures() {
                    var self = this;
                    var featuresAPICall = this._getFeatures();
                    var apiCalls = [featuresAPICall];
                    if (!self._featuresMetadata) {
                        apiCalls.unshift( this._apiCall("Features", "get_feature_metadata") );
                    }
                    var batchCall = self._batchAPICall(apiCalls);
                    return self._promise(batchCall).then(function _separateBatchResults(result) {
                        result.data = result.data.map(function _getParsedResponses(dataItem) {
                            return dataItem.parsedResponse;
                        });

                        if (apiCalls.length > 1) {

                            // Extract Feature Metadata for Processing
                            var featureMetadataResult = result.data.shift();
                            self._processFeatureMetadataResult.call(self, featureMetadataResult);
                        }
                        return result.data.pop();
                    }).then(self._processFeaturesResults.bind(self));
                },

                /**
                 * Process the results of a token creation API call
                 *
                 * @param {String} id name of the token created
                 * @param {Boolean} unrestricted whether the token is unrestricted
                 * @param {Array<String>} features added features
                 * @param {Object} results api results object
                 * @returns {String} newly created token
                 */
                _processTokenCreationResults: function _processTokenCreationResults(id, unrestricted, features, results) {
                    var data = results.data;
                    var newToken = new APIToken(id, unrestricted, features, new Date().getTime() / 1000);
                    newToken.new = true;
                    this._tokens.push(newToken);
                    return data.token;
                },

                /**
                 * API Wrapper call for createing tokens
                 *
                 * @param {String} id name of the token created
                 * @param {Boolean} unrestricted whether the token is unrestricted
                 * @param {Array<String>} features added features
                 * @returns {Promise<String>} promise and then the newly created token
                 */
                createToken: function createToken(id, unrestricted, features) {

                    var apiCall;

                    if (unrestricted) {
                        apiCall = this._apiCall("Tokens", "create_full_access", {
                            name: id
                        });
                    } else {
                        apiCall = this._apiCall("Tokens", "create_limited", {
                            name: id,
                            feature: features
                        });
                    }

                    return this._promise(apiCall).then(this._processTokenCreationResults.bind(this, id, unrestricted, features));

                },

                /**
                 * Get an API Token by id
                 *
                 * @param {String} id
                 * @returns {APIToken} api token with the matching id
                 */
                getTokenById: function getTokenById(id) {
                    var tokens = this.getTokens();
                    for (var i = 0; i < tokens.length; i++) {
                        if (tokens[i].id === id) {
                            return tokens[i];
                        }
                    }
                    return;
                },

                /**
                 * Update the Token restrictions for a token
                 *
                 * @param {String} tokenName id of the token to update
                 * @param {Boolean} unrestricted whether it should be treated as restricted
                 * @param {Array} features what features to restrict by
                 * @returns {Promise} restriction updating promise
                 */
                updateTokenRestrictions: function updateTokenRestrictions(tokenName, unrestricted, features) {
                    var apiCall;
                    var self = this;
                    if (unrestricted) {
                        apiCall = this._apiCall("Tokens", "set_full_access", {
                            name: tokenName
                        });
                    } else {
                        apiCall = this._apiCall("Tokens", "set_features", {
                            name: tokenName,
                            feature: features
                        });
                    }

                    return self._promise(apiCall).then(function() {
                        var token = self.getTokenById(tokenName);
                        token.unrestricted = unrestricted;
                        token.features = features;
                    });
                },

                /**
                 * Wrapper to call Token rename
                 *
                 * @param {String} tokenName old token name
                 * @param {Strng} newTokenName new token name
                 * @returns {Promise} rename token promise
                 */
                renameToken: function renameToken(tokenName, newTokenName) {
                    var apiCall = this._apiCall("Tokens", "rename", {
                        name: tokenName,
                        new_name: newTokenName
                    });

                    return this._promise(apiCall);
                }

            });

            return new Service();
        };

        SERVICE_INJECTABLES.push(SERVICE_FACTORY);

        var app = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        app.factory(SERVICE_NAME, SERVICE_INJECTABLES);

        return {
            "class": SERVICE_FACTORY,
            "serviceName": SERVICE_NAME,
            "namespace": MODULE_NAMESPACE
        };
    }
);
