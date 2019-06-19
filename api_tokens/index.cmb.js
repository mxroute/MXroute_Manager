/*
# api_tokens/services/apiTokens.js                 Copyright 2019 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'app/services/apiTokens',[
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

/*
# api_tokens/directives/tableShowingDirecitve.js                        Copyright 2019 cPanel, L.L.C.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/tableShowing',[
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        "use strict";

        /**
         * Directive to render the "Showing 1 - 4 of 10"
         *
         * @module table-showing
         * @memberof cpanel.apiTokens
         *
         * @param  {Number} start first number in range ([1]-4)
         * @param  {Number} limit second number in range (1-[4])
         * @param  {Number} total total number of items (10)
         *
         * @example
         * <table-showing start="1" limit="4" total="10"></table-showing>
         *
         */

        var TEMPLATE = "directives/tableShowing.ptt";
        var RELATIVE_PATH = "api_tokens/" + TEMPLATE;
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE;
        var MODULE_NAMESPACE = "cpanel.apiTokens.tableShowing.directive";
        var module = angular.module(MODULE_NAMESPACE, []);

        var CONTROLLER = function($scope) {

            /**
             * Get the rendered string from LOCALE
             *
             * @method getShowingText
             * @public
             *
             * @return {String} localized string
             *
             */

            $scope.getShowingText = function getShowingText() {
                return LOCALE.maketext("[_1] - [_2] of [_3]", $scope.start, $scope.limit, $scope.total);
            };

        };

        module.directive("tableShowing", function tableShowing() {

            return {
                templateUrl: TEMPLATE_PATH,
                restrict: "EA",
                scope: {
                    start: "=",
                    limit: "=",
                    total: "="
                },
                transclude: true,
                controller: ["$scope", CONTROLLER]
            };

        });

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "template": TEMPLATE
        };
    }
);

/*
# cjt/decorators/paginationDecorator.js             Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/decorators/paginationDecorator',[
        "angular",
        "cjt/core",
        "cjt/util/locale",
        "uiBootstrap"
    ],
    function(angular, CJT, LOCALE) {

        "use strict";

        var module;
        var MODULE_NAMESPACE = "cpanel.emailAccounts";
        var TEMPLATE_PATH = "decorators/pagination.phtml";
        var RELATIVE_PATH = "email_accounts/" + TEMPLATE_PATH;

        try {
            module = angular.module(MODULE_NAMESPACE);
        } catch (e) {
            module = angular.module(MODULE_NAMESPACE, ["ui.bootstrap.pagination"]);
        }

        module.config(["$provide", function($provide) {

            // Extend the ngModelDirective to interpolate its name attribute
            $provide.decorator("uibPaginationDirective", ["$delegate", function($delegate) {

                var uiPaginationDirective = $delegate[0];

                /**
                 * Update the ids in the page collection
                 *
                 * @method updateIds
                 * @param  {Array} pages
                 * @param  {string} id    Id of the directive, used as a prefix
                 */
                var updateIds = function(pages, id) {
                    if (!pages) {
                        return;
                    }

                    pages.forEach(function(page) {
                        page.id = id + "_" + page.text;
                    });
                };

                /**
                 * Update aria labels page collection
                 *
                 * @method updateIds
                 * @param  {Array} pages
                 */
                var updateAriaLabel = function(pages) {
                    if (!pages) {
                        return;
                    }

                    pages.forEach(function(page) {
                        page.ariaLabel = LOCALE.maketext("Go to page “[_1]”.", page.text);
                    });
                };

                /**
                 * Update current selected text
                 *
                 * @method updateCurrentSelectedText
                 * @param  {string} page - Current page number
                 * @param  {string} totalPages - Total pages
                 * @returns {string} Text to display
                 */
                var updateCurrentSelectedText = function(page, totalPages) {
                    return LOCALE.maketext("Page [numf,_1] of [numf,_2]", page, totalPages);
                };

                // Use a local template
                uiPaginationDirective.templateUrl = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH;

                // Extend the page model with the id field.
                var linkFn = uiPaginationDirective.link;

                /**
                 * Compile function for uiPagination Directive
                 *
                 * @method uiPaginationDirective.compile
                 */
                uiPaginationDirective.compile = function() {
                    return function(scope, element, attrs, ctrls) {
                        var paginationCtrl = ctrls[0];

                        linkFn.apply(this, arguments);

                        scope.parentId = attrs.id;
                        scope.ariaLabels = {
                            title: LOCALE.maketext("Pagination"),
                            firstPage: LOCALE.maketext("Go to first page."),
                            previousPage: LOCALE.maketext("Go to previous page."),
                            nextPage: LOCALE.maketext("Go to next page."),
                            lastPage: LOCALE.maketext("Go to last page."),
                        };

                        scope.updateCurrentSelectedText = updateCurrentSelectedText;

                        var render = paginationCtrl.render;
                        paginationCtrl.render = function() {
                            render.apply(paginationCtrl);
                            updateIds(scope.pages, scope.parentId);
                            updateAriaLabel(scope.pages);
                        };

                    };
                };

                return $delegate;
            }]);
        }]);

        return {
            namespace: MODULE_NAMESPACE,
            template: TEMPLATE_PATH
        };
    }
);

/*
# api_tokens/directives/itemLister.js                                   Copyright 2019 cPanel, L.L.C.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/itemLister',[
        "angular",
        "lodash",
        "cjt/core",
        "app/directives/tableShowing",
        "app/decorators/paginationDecorator",
        "ngSanitize",
        "ngRoute",
        "cjt/modules",
        "cjt/directives/pageSizeButtonDirective",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/directives/indeterminateState",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(angular, _, CJT, TableShowingDirective, PaginationDecorator) {

        "use strict";

        /**
         * Item Lister combines the typical table functions, pageSize,
         * showing, paginator, search, and allows you to plug in multiple
         * views.
         *
         * @module item-lister
         * @memberof cpanel.apiTokens
         * @restrict EA
         *
         * @param  {String} id disseminated to other objects
         * @param  {Array} items Items that will be paginated, array of objs
         * @param  {Array} header-items represents the columns of the table
         *
         * @example
         * <item-lister
         *      id="MyItemLister"
         *      items="[a,b,c,d,e]"
         *      create-route="/create"
         *      can-select-all
         *      header-items="[{field:"blah",label:"Blah",sortable:false}]">
         *   <my-item-lister-view></my-item-lister-view>
         * </item-lister>
         *
         */

        var MODULE_REQUIREMENTS = [
            TableShowingDirective.namespace,
            PaginationDecorator.namespace,
            "ngRoute",
            "ngSanitize",
            "cjt2.filters.startFrom"
        ];
        var MODULE_NAMESPACE = "cpanel.apiTokens.itemLister.directive";
        var CSSS_COMPONENT_NAME = "apiTokensItemLister";

        var CONTROLLER_INJECTABLES = ["$routeParams", "$scope", "$filter", "$log", "$window", "componentSettingSaverService", "ITEM_LISTER_CONSTANTS"];
        var CONTROLLER = function itemListerController($routeParams, $scope, $filter, $log, $window, $CSSS, ITEM_LISTER_CONSTANTS) {

            $scope.viewCallbacks = [];
            $scope.checkAll = {
                indeterminate: false,
                all: false
            };

            var filters = {
                filter: $filter("filter"),
                orderBy: $filter("orderBy"),
                startFrom: $filter("startFrom"),
                limitTo: $filter("limitTo")
            };

            /**
             *
             * Filter items based on filterValue
             *
             * @private
             *
             * @param {Array} filteredItems items to filter
             * @returns {Array} filtered items
             */
            $scope._filter = function _filter(filteredItems) {

                // filter list based on search text
                if ($scope.filterValue !== "") {
                    return filters.filter(filteredItems, $scope.filterValue, false);
                }

                return filteredItems;
            };

            /**
             *
             * Sort items based on sort.sortDirection and sort.sortBy
             *
             * @private
             *
             * @param {Array} filteredItems items to sort
             * @returns {Array} sorted items
             */
            $scope._sort = function _sort(filteredItems) {

                // sort the filtered list
                if ($scope.sort.sortDirection !== "" && $scope.sort.sortBy !== "") {
                    return filters.orderBy(filteredItems, $scope.sort.sortBy, $scope.sort.sortDirection !== "asc");
                }

                return filteredItems;
            };

            /**
             *
             * Paginate the items based on pageSize and currentPage
             *
             * @private
             *
             * @param {Array} filteredItems items to paginate
             * @returns {Array} paginated items
             */
            $scope._paginate = function _paginate(filteredItems) {

                // filter list based on page size and pagination
                if ($scope.totalItems > _.min($scope.pageSizes)) {
                    var start = ($scope.currentPage - 1) * $scope.pageSize;
                    var limit = $scope.pageSize;

                    filteredItems = filters.startFrom(filteredItems, start);
                    filteredItems = filters.limitTo(filteredItems, limit);
                    $scope.showPager = true;

                    // table statistics
                    $scope.start = start + 1;
                    $scope.limit = start + filteredItems.length;

                } else {

                    // hide pager and pagination
                    $scope.showPager = false;

                    if (filteredItems.length === 0) {
                        $scope.start = 0;
                    } else {

                        // table statistics
                        $scope.start = 1;
                    }

                    $scope.limit = filteredItems.length;
                }

                return filteredItems;
            };

            /**
             *
             * Update the NVData stored settings for the directive
             *
             * @private
             *
             * @param {String} lastInteractedItem last item interacted with
             */
            $scope._updatedListerState = function _updatedListerState(lastInteractedItem) {

                if ($scope.loadingInitialState) {
                    return;
                }

                var storedSettings = {
                    pageSize: $scope.pageSize,
                    sort: {
                        sortDirection: $scope.sort.sortDirection,
                        sortBy: $scope.sort.sortBy
                    }
                };

                $CSSS.set(CSSS_COMPONENT_NAME, storedSettings);
            };

            /**
             *
             * Event function called on interaction with an item
             *
             * @private
             *
             * @param {Object} event event object
             * @param {Object} parameters event parameters {interactionID:...}
             */
            $scope._itemInteracted = function _itemInteracted(event, parameters) {
                if (parameters.interactionID) {
                    $scope._updatedListerState(parameters.interactionID);
                }
            };

            /**
             * Register a callback to call on the update of the lister
             *
             * @method registerViewCallback
             *
             * @param  {Function} callback function to callback to
             *
             */

            this.registerViewCallback = function registerViewCallback(callback) {
                $scope.viewCallbacks.push(callback);
                callback($scope.filteredItems);
            };

            /**
             * Get the header items
             *
             * @method getHeaderItems
             *
             * @return {Array} returns array of objects containing labels
             *
             */
            this.getHeaderItems = function getHeaderItems() {
                return $scope.headerItems;
            };

            /**
             * Deregister a callback (useful for view changes)
             *
             * @method deregisterViewCallback
             *
             * @param  {Function} callback callback to deregister
             *
             */

            this.deregisterViewCallback = function deregisterViewCallback(callback) {
                for (var i = $scope.viewCallbacks.length - 1; i >= 0; i--) {
                    if ($scope.viewCallbacks[i] === callback) {
                        $scope.viewCallbacks.splice(i, 1);
                    }
                }
            };

            /**
             * Function called to rebuild the view from internal components
             *
             * @return {Array} filtered items
             */
            $scope.fetch = function fetch() {

                var filteredItems = [];

                filteredItems = $scope._filter($scope.items);

                // update the total items after search
                $scope.totalItems = filteredItems.length;

                filteredItems = $scope._sort(filteredItems);
                filteredItems = $scope._paginate(filteredItems);

                $scope.filteredItems = filteredItems;

                $scope._updatedListerState();

                angular.forEach($scope.viewCallbacks, function updateCallback(viewCallback) {
                    viewCallback($scope.filteredItems);
                });

                $scope.$emit(ITEM_LISTER_CONSTANTS.ITEM_LISTER_UPDATED_EVENT, { meta: { filterValue: $scope.filterValue }, items: filteredItems });

                $scope._updateSelectAllState();

                return filteredItems;

            };

            /**
             * Return the focus of the page to the search at the top and scroll to it
             *
             */
            $scope.focusSearch = function focusSearch() {
                angular.element(document).find("#" + $scope.parentID + "_search_input").focus();
                $window.scrollTop = 0;
            };

            /**
             *
             * Event function for a table configuration being clicked
             *
             * @param {Object} config which config was clicked
             */
            $scope.tableConfigurationClicked = function tableConfigurationClicked(config) {
                $scope.$emit(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, { actionType: "tableConfigurationClicked", config: config });
            };

            $scope._updateSelectAllState = function _updateSelectAllState() {
                $scope.selectedItems = $scope.filteredItems.filter(function filterSelectedItems(item) {
                    return item.selected;
                });

                if ($scope.selectedItems.length && $scope.filteredItems.length && $scope.selectedItems.length === $scope.filteredItems.length) {
                    $scope.checkAll.all = true;
                } else {
                    $scope.checkAll.all = false;
                }
            };

            $scope.getIndeterminateState = function getIndeterminateState() {
                return $scope.selectedItems.length && $scope.filteredItems.length && $scope.filteredItems.length !== $scope.selectedItems.length;
            };

            $scope.toggleSelectAll = function toggleSelectAll() {

                if ($scope.selectedItems.length < $scope.filteredItems.length) {
                    $scope.filteredItems.forEach(function selectAll(item) {
                        item.selected = true;
                    });
                    $scope.$emit(ITEM_LISTER_CONSTANTS.ITEM_LISTER_SELECT_ALL, { items: $scope.filteredItems });
                } else {
                    $scope.filteredItems.forEach(function selectAll(item) {
                        item.selected = false;
                    });
                    $scope.$emit(ITEM_LISTER_CONSTANTS.ITEM_LISTER_DESELECT_ALL, { items: $scope.filteredItems });
                }

                $scope._updateSelectAllState();

            };

            $scope.$on(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, $scope._itemInteracted);
            $scope.$on(ITEM_LISTER_CONSTANTS.TABLE_ITEM_SELECTED, $scope._updateSelectAllState);
            $scope.$on(ITEM_LISTER_CONSTANTS.TABLE_ITEM_DESELECTED, $scope._updateSelectAllState);

            angular.extend($scope, {
                maxPages: 5,
                totalItems: $scope.items.length,
                filteredItems: [],
                currentPage: 1,
                pageSize: 20,
                pageSizes: [20, 100, 500],

                start: 0,
                limit: 20,

                filterValue: "",
                sort: {
                    sortDirection: "asc",
                    sortBy: $scope.headerItems.length ? $scope.headerItems[0].field : ""
                }
            }, {
                filterValue: $routeParams["q"]
            });

            /**
             *
             * Initiate CSSS saved state is loaded
             *
             * @private
             *
             * @param {Object} initialState saved state for directive
             */
            $scope._savedStateLoaded = function _savedStateLoaded(initialState) {
                angular.extend($scope, initialState, {
                    filterValue: $routeParams["q"]
                });
            };

            var registerSuccess = $CSSS.register(CSSS_COMPONENT_NAME);
            if ( registerSuccess ) {
                $scope.loadingInitialState = true;
                registerSuccess.then($scope._savedStateLoaded, $log.error).finally(function() {
                    $scope.loadingInitialState = false;
                    $scope.fetch();
                });
            }

            $scope.$on("$destroy", function() {
                $CSSS.unregister(CSSS_COMPONENT_NAME);
            });

            $scope.fetch();
            $scope.$watch("items", $scope.fetch);

        };

        var TEMPLATE_PATH = "directives/itemLister.ptt";
        var RELATIVE_PATH = "api_tokens/" + TEMPLATE_PATH;
        var TEMPLATE_URL = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH;
        var DIRECTIVE_INJECTABLES = ["$window", "$log", "componentSettingSaverService"];
        var DIRECTIVE_LINK = function(scope, element, attrs) {

            if (!_.isUndefined(attrs.canSelectAll) && attrs.canSelectAll !== "0") {
                scope.canSelectAll = true;
            }

            scope.controlsBlock = null;
            scope.contentBlock = null;

            /**
             *
             * Attach controls to the view
             *
             * @private
             *
             * @param {HTMLElement} elem html element to transclude as controls
             */
            scope._attachControls = function _attachControls(elem) {
                scope.controlsBlock.append(elem);
            };

            /**
             *
             * Attach Other items to view
             *
             * @private
             *
             * @param {HTMLElement} elem element to treat as the table body
             */
            scope._attachOthers = function _attachOthers(elem) {
                elem.setAttribute("id", scope.parentID + "_transcludePoint");
                elem.setAttribute("ng-if", "filteredItems.length");
                scope.contentBlock.replaceWith(elem);
            };

            /**
             *
             * Attach a transclude item
             *
             * @private
             *
             * @param {HTMLElement} elem html element to determine attachment point for
             */
            scope._attachTransclude = function _attachTransclude(elem) {
                if (angular.element(elem).hasClass("lister-controls")) {
                    scope._attachControls(elem);
                } else {
                    scope._attachOthers(elem);
                }
            };

            /**
             *
             * Find transclude items to attach to the view
             *
             */
            scope._findTranscludes = function _findTranscludes() {

                // *cackles maniacally*
                // *does a multi-transclude anyways*
                scope.controlsBlock = element.find("#" + scope.parentID + "_transcludedControls");
                scope.contentBlock = element.find("#" + scope.parentID + "_transcludePoint");
                var transcludedBlock = element.find("div.transcluded");
                var transcludedItems = transcludedBlock.children();
                angular.forEach(transcludedItems, scope._attachTransclude, scope);
                transcludedBlock.remove();
            };

            /* There is a dumb race condition here */
            /* So we have to delay to get the content transcluded */
            setTimeout(scope._findTranscludes, 2);
        };
        var DIRECTIVE = function itemLister($window, $log, $CSSS) {

            return {
                templateUrl: TEMPLATE_URL,
                restrict: "EA",
                scope: {
                    parentID: "@id",
                    items: "=",
                    headerItems: "=",
                    tableConfigurations: "=",
                    createRoute: "@"
                },
                transclude: true,
                replace: true,
                link: DIRECTIVE_LINK,
                controller: CONTROLLER_INJECTABLES.concat(CONTROLLER)
            };

        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);

        module.directive("itemLister", DIRECTIVE_INJECTABLES.concat(DIRECTIVE));

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "link": DIRECTIVE_LINK,
            "template": TEMPLATE_PATH
        };
    }
);

/*
# api_tokens/filters/htmlSafeString.js               Copyright 2019 cPanel, L.L.C.
#                                                             All rights Reserved.
# copyright@cpanel.net                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/filters/htmlSafeString',[
        "angular",
        "lodash"
    ],
    function(angular, _) {

        "use strict";

        /**
         * Wrapper for lodash escape
         *
         * @module htmlSafeString
         * @memberof cpanel.apiTokens
         *
         * @example
         * {{ domain.domain | htmlSafeString }}
         *
         */

        var MODULE_NAMESPACE = "cpanel.apiTokens.htmlSafeString.filter";
        var MODULE_REQUIREMENTS = [ ];

        var CONTROLLER_INJECTABLES = [];
        var CONTROLLER = function CopyFieldController() {
            return _.escape;
        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        module.filter("htmlSafeString", CONTROLLER_INJECTABLES.concat(CONTROLLER));

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE
        };
    }
);

/*
# api_tokens/directives/itemListerView.js                               Copyright 2019 cPanel, L.L.C.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/itemListerView',[
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "app/filters/htmlSafeString",
    ],
    function(angular, _, CJT, LOCALE, HTMLSafeString) {

        "use strict";

        /**
         * Item Lister View is a view that pairs with the item lister to
         * display items manage link. It must
         * be nested within an item lister
         *
         * @module item-lister-view
         * @restrict EA
         * @memberof cpanel.apiTokens
         *
         * @example
         * <item-lister>
         *     <item-lister-view></item-lister-view>
         * </item-lister>
         *
         */

        var MODULE_NAMESPACE = "cpanel.apiTokens.itemListerView.directive";
        var MODULE_REQUIREMENTS = [ HTMLSafeString.namespace ];

        var TEMPLATE = "directives/itemListerView.ptt";
        var RELATIVE_PATH = "api_tokens/" + TEMPLATE;
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE;
        var CONTROLLER_INJECTABLES = ["$scope", "$location", "ITEM_LISTER_CONSTANTS"];
        var CONTROLLER = function ItemListViewController($scope, $location, ITEM_LISTER_CONSTANTS) {

            $scope.toggleSelection = function toggleSelection(item) {
                if (item.selected) {
                    $scope.$emit(ITEM_LISTER_CONSTANTS.TABLE_ITEM_SELECTED, { item: item } );
                } else {
                    $scope.$emit(ITEM_LISTER_CONSTANTS.TABLE_ITEM_DESELECTED, { item: item } );
                }
            };

            $scope.getCreationLabel = function getCreationLabel(createdOn) {
                return LOCALE.local_datetime(createdOn, "datetime_format_medium");
            };

            $scope.getRestrictionLabel = function getRestrictionLabel(isUnrestricted) {
                return isUnrestricted ? LOCALE.maketext("Unrestricted") : LOCALE.maketext("Limited");
            };

            $scope.getItems = function getItems() {
                return $scope.items;
            };

            $scope.manageToken = function manageToken(token) {
                $location.path("/manage").search("token", token.id);
            };

        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);

        module.value("PAGE", PAGE);

        var DIRECTIVE_LINK = function($scope, $element, $attrs, $ctrl) {
            $scope.items = [];
            $scope.headerItems = $ctrl.getHeaderItems();
            $scope.updateView = function updateView(viewData) {
                $scope.items = viewData;
            };
            $ctrl.registerViewCallback($scope.updateView.bind($scope));

            $scope.$on("$destroy", function() {
                $ctrl.deregisterViewCallback($scope.updateView);
            });
        };
        module.directive("itemListerView", function itemListerItem() {

            return {
                templateUrl: TEMPLATE_PATH,
                restrict: "EA",
                replace: true,
                require: "^itemLister",
                link: DIRECTIVE_LINK,
                controller: CONTROLLER_INJECTABLES.concat(CONTROLLER)

            };

        });

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "link": DIRECTIVE_LINK,
            "template": TEMPLATE
        };
    }
);

/*
#  cpanel - api_tokens/validators/uniqueTokenName.js   Copyright 2019 cPanel, L.L.C.
#                                                               All rights Reserved.
# copyright@cpanel.net                                             http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.validators.tokenNameIsUnique */

define(
    'app/validators/uniqueTokenName',[
        "angular",
        "cjt/util/locale",
        "cjt/validator/validator-utils",
        "app/services/apiTokens",
        "cjt/validator/validateDirectiveFactory"
    ],
    function(angular, LOCALE, validationUtils, APITokensService) {

        "use strict";

        var _apiTokens;

        var factoryMethods = {


            /** For mocking */

            _lastFetch: 0,

            _processLoadedTokens: function(tokens) {
                _apiTokens = null;
                if (tokens) {
                    _apiTokens = {};
                    tokens.forEach(function(token) {
                        _apiTokens[token.id] = token;
                    });
                }
                return _apiTokens;
            },

            _fetchTokens: function() {
                return _apiTokens;
            },
        };

        /**
         * Validator to check that the token name is unique compared to the apiTokens.fetchTokens() tokens
         *
         * @module tokenIsUniqueValidator
         *
         * @example
         * <input token-name-is-unique ng-model="myModel" />
         *
         */

        var tokenIsUniqueValidator = {

            /**
             * Check if the domain is unique
             *
             * @method tokenNameIsUnique
             *
             * @param  {String} tokenName value to check against the validator
             *
             * @return {Boolean} returns a boolean value determined by the validity of the view
             *
             */


            tokenNameIsUnique: function(tokenName, validatorArgument) {

                var result = validationUtils.initializeValidationResult();
                var _apiTokens = factoryMethods._fetchTokens();

                // Allows passing in of base value for instances where it would be valid if it stayed the same
                if (validatorArgument && tokenName === validatorArgument) {
                    return result;
                }

                if (!_apiTokens || (tokenName && _apiTokens[tokenName])) {
                    result.isValid = false;
                    result.add("tokenNameIsUnique", LOCALE.maketext("This [asis,API] token name already exists on this account. Enter a different name."), "tokenNameIsUnique");
                }

                return result;
            },

            validate: function($service, $q, value, argument, scope) {

                // debounce the reload
                // If tokens exist, and it's not been more than 1000ms, don't re-fetch
                var curDate = new Date().getTime();
                if (factoryMethods._fetchTokens() && curDate - factoryMethods._lastFetch < 1000) {
                    var result = tokenIsUniqueValidator.tokenNameIsUnique(value, argument, scope);
                    return $q.resolve(result);
                }

                // It's been more thatn 1000ms or no tokens exist
                factoryMethods._lastFetch = curDate;
                return $service.fetchTokens().then(function(tokens) {
                    factoryMethods._processLoadedTokens(tokens);
                    var result = tokenIsUniqueValidator.tokenNameIsUnique(value, argument, scope);
                    return $q.resolve(result);
                });
            }
        };

        var validatorModule = angular.module("cjt2.validate");
        validatorModule.run(["validatorFactory", "$q", APITokensService.serviceName,
            function(validatorFactory, $q, $service) {
                var validators = {
                    tokenNameIsUnique: tokenIsUniqueValidator.validate.bind(tokenIsUniqueValidator, $service, $q)
                };
                validators.tokenNameIsUnique.async = true;
                validatorFactory.generate(validators, $q);
            }
        ]);

        return {
            methods: tokenIsUniqueValidator,
            factoryMethods: factoryMethods,
            name: "token-name-is-unique",
            description: "Validation to ensure the api Token is unique for this account.",
            version: 1.0
        };


    }
);

/*
# api_tokens/views/create.js                       Copyright 2019 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'app/views/create',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/services/apiTokens",
        "cjt/directives/copyField",
        "app/validators/uniqueTokenName",
        "cjt/modules",
        "cjt/directives/actionButtonDirective",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/indeterminateState",
        "cjt/services/alertService",
    ],
    function(angular, _, LOCALE, APITokensService, CopyFieldDirective) {

        "use strict";

        var CSSS_COMPONENT_NAME = "createAPITokenView";
        var VIEW_TITLE = LOCALE.maketext("Create API Token");
        var MODULE_NAMESPACE = "cpanel.apiTokens.views.create";
        var TEMPLATE_URL = "views/create.ptt";
        var MODULE_DEPENDANCIES = [
            "cjt2.directives.validationContainer",
            "cjt2.directives.validationItem",
            "cjt2.directives.toggleSwitch",
            "cjt2.directives.search",
            "cjt2.directives.indeterminateState",
            CopyFieldDirective.namespace
        ];

        var CONTROLLER_INJECTABLES = ["$scope", "$location", "alertService", APITokensService.serviceName, "componentSettingSaverService", "CAN_CREATE_LIMITED", "apiTokens", "features"];
        var CONTROLLER_NAME = "CreateTokenController";
        var CONTROLLER = function APITokensListController($scope, $location, $alertService, $service, $CSSS, CAN_CREATE_LIMITED, apiTokens, features) {

            // For contingency of shipping without limited
            $scope.canCreateLimited = CAN_CREATE_LIMITED;
            $scope.pageTitle = VIEW_TITLE;
            $scope.RTL = LOCALE.is_rtl();
            $scope.showAllHelp = false;
            $scope.selectedFeatures = [];
            $scope.ui = {
                stayAfterCopy: false
            };
            $scope.checkAll = {
                all: false
            };
            $scope.features = features;
            $scope.apiTokens = apiTokens;
            $scope.working = {};


            /**
             * Iniitate the view
             *
             */
            $scope.init = function init() {
                $CSSS.register(CSSS_COMPONENT_NAME).then(function CSSSLoaded(data) {
                    if (data) {
                        $scope.showAllHelp = data.showAllHelp;
                        $scope.ui.stayAfterCopy = data.stayAfterCopy;
                    }
                });
                $scope.reset();
            };

            /**
             * Reset the form values
             *
             * @param {HTMLDomElement} form form to set pristine
             */
            $scope.reset = function reset(form) {
                $scope.working = {
                    name: "",
                    unrestricted: CAN_CREATE_LIMITED ? false : true,
                    features: {}
                };
                $scope.generatedToken = null;
                $scope.pageTitle = VIEW_TITLE;
                $scope.selectedFeatures = [];
                if (form) {
                    form.$setPristine();
                }
            };


            /**
             * Update the nvdata saved
             *
             * @private
             *
             */
            $scope._updateCSSS = function _updateCSSS() {
                $CSSS.set(CSSS_COMPONENT_NAME, {
                    showAllHelp: $scope.showAllHelp,
                    stayAfterCopy: $scope.ui.stayAfterCopy
                });
            };

            /**
             * Toggle Showing or Hiding All help
             *
             */
            $scope.toggleHelp = function toggleHelp() {
                $scope.showAllHelp = !$scope.showAllHelp;
                $scope._updateCSSS();
            };

            /**
             * Set the generatedToken and prepare the display for showing it.
             *
             * @param {String} newToken
             */
            $scope._tokenCreated = function _tokenCreated(newToken) {
                $scope.generatedToken = newToken;
                $scope.pageTitle = LOCALE.maketext("Token Created Successfully");
                $scope.apiTokens = $service.getTokens();
                var message;

                if ($scope.working.unrestricted) {
                    message = LOCALE.maketext("You successfully created an [output,strong,unrestricted] [asis,API] token “[_1]”.", $scope.working.name);
                } else {
                    message = LOCALE.maketext("You successfully created a [output,strong,limited-access] [asis,API] token “[_1]”.", $scope.working.name);
                }

                $alertService.success(message);
                return newToken;
            };

            /**
             * Create a new token
             *
             * @param {Object} workingToken
             * @returns {Promise<String>} returns the promise and then the newly created token
             */
            $scope.create = function create(workingToken) {
                return $service.createToken(workingToken.name, workingToken.unrestricted, $scope.selectedFeatures).then($scope._tokenCreated);
            };

            /**
             * Toggle (de)selecting all features in the feature chooser
             *
             */
            $scope.toggleSelectAllFeatures = function toggleSelectAllFeatures() {
                if ($scope.selectedFeatures.length < $scope.features.length) {
                    $scope.features.forEach(function selectAll(feature) {
                        $scope.working.features[feature.id] = true;
                    });
                } else {
                    $scope.features.forEach(function selectAll(feature) {
                        $scope.working.features[feature.id] = false;
                    });
                }

                $scope.updateSelectedFeatures();
            };

            /**
             * Determine if a partial number of items is selected
             *
             * @returns {Booolean} indeterminate state
             */
            $scope.getFeaturesIndeterminateState = function getFeaturesIndeterminateState() {
                return $scope.selectedFeatures.length && $scope.features.length && $scope.features.length !== $scope.selectedFeatures.length;
            };

            /**
             * Update the selected features list
             *
             */
            $scope.updateSelectedFeatures = function updateSelectedFeatures() {
                $scope.selectedFeatures = [];
                angular.forEach($scope.working.features, function(featureSelected, featureKey) {
                    if (featureSelected) {
                        $scope.selectedFeatures.push(featureKey);
                    }
                });
            };

            /**
             * Return to the lister view
             *
             */
            $scope.backToListView = function backToListView() {
                $location.path("/");
            };

            /**
             * Upon completion of a token copy, determine whether to return to the list
             *
             * @param {HTMLFormElement} form passed to reset for resetting to pristine
             */
            $scope.tokenCopied = function tokenCopied(form) {

                if ($scope.ui.stayAfterCopy) {
                    $scope.reset(form);
                } else {
                    $scope.backToListView();
                }

            };

            /**
             * Called when the stayAfterCopy is altered
             *
             */
            $scope.stayAfterCopyChanged = function stayAfterCopyChanged() {
                $scope._updateCSSS();
            };

            $scope.$on("$destroy", $CSSS.unregister.bind($CSSS, CSSS_COMPONENT_NAME));

            $scope.init();

        };

        var app = angular.module(MODULE_NAMESPACE, MODULE_DEPENDANCIES);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES.concat(CONTROLLER));

        var resolver = {
            "apiTokens": [ APITokensService.serviceName, function($service) {
                return $service.fetchTokens();
            }],
            "features": [ APITokensService.serviceName, function($service) {
                return $service.getFeatures();
            }]
        };

        return {
            "id": "createAPIToken",
            "route": "/create",
            "controller": CONTROLLER_NAME,
            "class": CONTROLLER,
            "templateUrl": TEMPLATE_URL,
            "title": VIEW_TITLE,
            "namespace": MODULE_NAMESPACE,
            "showResourcePanel": true,
            "resolve": resolver
        };
    }
);

/*
# api_tokens/views/list.js                         Copyright 2019 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'app/views/list',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/directives/itemLister",
        "app/directives/itemListerView",
        "app/services/apiTokens",
        "app/views/create",
        "cjt/modules",
        "cjt/services/alertService",
        "cjt/directives/actionButtonDirective",
    ],
    function(angular, _, LOCALE, ItemLister, ItemListerView, APITokensService, CreateView) {

        "use strict";

        var VIEW_TITLE = LOCALE.maketext("List API Tokens");
        var MODULE_NAMESPACE = "cpanel.apiTokens.views.list";
        var TEMPLATE_URL = "views/list.ptt";
        var MODULE_DEPENDANCIES = [ ItemLister.namespace, ItemListerView.namespace, APITokensService.namespace ];

        var CONTROLLER_INJECTABLES = ["$scope", "$location", APITokensService.serviceName, "alertService", "apiTokens", "ITEM_LISTER_CONSTANTS"];
        var CONTROLLER_NAME = "ListController";
        var CONTROLLER = function APITokensListController($scope, $location, $service, $alertService, apiTokens, ITEM_LISTER_CONSTANTS) {

            /**
             *
             * Initialize the controller, called internally.
             *
             * @private
             *
             */
            $scope.init = function init() {
                $scope._apiTokens = apiTokens;
                $scope._filteredItems = [];
                $scope.selectedItems = [];
                $scope.confirmingDelete = false;
                $scope.deletingTokens = false;
                $scope.tableHeaderItems = [
                    {
                        field: "label",
                        label: LOCALE.maketext("Token Name"),
                        sortable: true
                    },
                    {
                        field: "createdOn",
                        label: LOCALE.maketext("Created"),
                        hiddenOnMobile: true,
                        sortable: true
                    },
                    {
                        field: "actions",
                        label: "",
                        sortable: false
                    }
                ];

                ["TABLE_ITEM_SELECTED", "TABLE_ITEM_DESELECTED", "ITEM_LISTER_SELECT_ALL", "ITEM_LISTER_DESELECT_ALL"].forEach(function(updateEventKey) {
                    $scope.$on(ITEM_LISTER_CONSTANTS[updateEventKey], $scope._updatedSelected);
                });

                $scope.$on(ITEM_LISTER_CONSTANTS.ITEM_LISTER_UPDATED_EVENT, function(event, parameters) {
                    $scope._filteredItems = parameters.items;
                    $scope._updatedSelected();
                });
            };

            /**
             *
             * On success of deleted tokens, this function notifies the user.
             *
             * @private
             *
             * @param {Array<String>} deletedTokenNames tokens that were deleted
             * @param {} updatedApiTokens
             */
            $scope._deleteTokenSuccess = function _deleteTokenSuccess(deletedTokenNames, updatedApiTokens) {
                $scope._apiTokens = updatedApiTokens;
                $alertService.success(LOCALE.maketext("The system successfully revoked the following [asis,API] [numerate,_1,token,tokens]: [list_and_quoted,_1]", deletedTokenNames));
                if ($scope._apiTokens.length === 0) {
                    $location.path(CreateView.route);
                }
                $scope.confirmingDelete = false;
                $scope.deletingTokens = false;
            };

            /**
             *
             * On update of the selected items, as emitted from the lister, this updates the local array
             *
             */
            $scope._updatedSelected = function _updatedSelected() {
                $scope.selectedItems = $scope._filteredItems.filter(function(item) {
                    return item.selected;
                });
            };

            /**
             *
             * Delete tokens
             *
             * @param {*} items token items to be deleted
             * @returns {Promise<Array>} returns the deletion promise and updated api tokens
             */
            $scope.deleteTokens = function deleteAPITokens(items) {
                var tokenNames = [];
                var tokenHashes = [];
                items.forEach(function(item) {
                    tokenHashes.push(item.id);
                    tokenNames.push(_.escape(item.label));
                });
                $scope.deletingTokens = true;
                return $service.deleteTokens(tokenHashes).then($scope._deleteTokenSuccess.bind($scope, tokenNames));
            };

            /**
             * Show the deletion confirmation message
             *
             */
            $scope.showDeletionConfirmationMessage = function showDeletionConfirmationMessage() {
                $scope.confirmingDelete = true;
            };

            /**
             * Hide the deletion confirmation message
             *
             */
            $scope.hideDeletionConfirmationMessage = function hideDeletionConfirmationMessage() {
                $scope.confirmingDelete = false;
            };

            /**
             * Generate a Label for the Delete Confirmation Button
             *
             * @returns {String} Delete Confirmation Button Label
             */
            $scope.confirmDeleteButtonLabel = function confirmDeleteButtonLabel() {
                return LOCALE.maketext("Revoke Selected [asis,API] [numerate,_1,Token,Tokens]", $scope.selectedItems.length);
            };

            /**
             * Get the current api tokens
             *
             * @returns {Array} current api tokens
             */
            $scope.getItems = function getItems() {
                return $scope._apiTokens;
            };

            /**
             * Return just the ids of the selected features
             *
             * @return {Array<String>} array of feature names
             *
             */
            $scope.getSelectedFeatureNames = function getSelectedFeatureNames() {
                return $scope.selectedItems.map(function(selectedFeature) {
                    return selectedFeature.id;
                });
            };

            /**
             * Get the delete confirmation message based on selected features.
             *
             * @returns {String} delete confirmation message
             */
            $scope.confirmDeleteMessage = function confirmDeleteMessage() {
                var selectedFeatureNames = $scope.getSelectedFeatureNames().map(_.escape);
                return LOCALE.maketext("Are you sure that you want to revoke the following [asis,API] [numerate,_1,token,tokens]: [list_and_quoted,_2]", selectedFeatureNames.length, selectedFeatureNames);
            };

            $scope.init();
        };

        var app = angular.module(MODULE_NAMESPACE, MODULE_DEPENDANCIES);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES.concat(CONTROLLER));

        var resolver = {
            "apiTokens": [ APITokensService.serviceName, "$location", function($service, $location) {
                return $service.fetchTokens().then(function(apiTokens) {
                    if (apiTokens.length) {
                        return apiTokens;
                    } else {
                        $location.path(CreateView.route);
                        return false;
                    }
                });
            }]
        };

        return {
            "id": "listAPITokens",
            "route": "/",
            "controller": CONTROLLER_NAME,
            "class": CONTROLLER,
            "templateUrl": TEMPLATE_URL,
            "title": VIEW_TITLE,
            "namespace": MODULE_NAMESPACE,
            "showResourcePanel": false,
            "resolve": resolver
        };
    }
);

/*
# api_tokens/views/manage.js                       Copyright 2019 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'app/views/manage',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/services/apiTokens",
        "app/filters/htmlSafeString",
        "app/validators/uniqueTokenName",
        "cjt/modules",
        "cjt/services/alertService",
        "cjt/directives/actionButtonDirective",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/indeterminateState"
    ],
    function(angular, _, LOCALE, APITokensService, HTMLSafeStringFilter) {

        "use strict";

        var CSSS_COMPONENT_NAME = "manageAPITokenView";
        var VIEW_TITLE = LOCALE.maketext("Manage [asis,API] Token");
        var MODULE_NAMESPACE = "cpanel.apiTokens.views.manage";
        var TEMPLATE_URL = "views/manage.ptt";
        var MODULE_DEPENDANCIES = [
            "cjt2.directives.validationContainer",
            "cjt2.directives.validationItem",
            "cjt2.directives.toggleSwitch",
            "cjt2.directives.search",
            "cjt2.directives.indeterminateState",
            HTMLSafeStringFilter.namespace
        ];

        var CONTROLLER_INJECTABLES = ["$scope", "$location", "$routeParams", "alertService", APITokensService.serviceName, "componentSettingSaverService", "CAN_CREATE_LIMITED", "apiTokens"];
        var CONTROLLER_NAME = "ManageTokenController";
        var CONTROLLER = function APITokensListController($scope, $location, $routeParams, $alertService, $service, $CSSS, CAN_CREATE_LIMITED, apiTokens) {

            $scope.pageTitle = VIEW_TITLE;
            $scope.RTL = LOCALE.is_rtl();
            $scope.showAllHelp = false;
            $scope.ui = {
                confirmingRevocation: false
            };
            $scope.selectedFeatures = [];
            $scope.checkAll = {
                all: false
            };
            $scope.apiTokens = apiTokens;
            $scope.working = {};


            /**
             * Initate the view
             *
             */
            $scope.init = function init() {
                $CSSS.register(CSSS_COMPONENT_NAME).then(function CSSSLoaded(data) {
                    if (data) {
                        $scope.showAllHelp = data.showAllHelp;
                        $scope.stayOnView = data.stayOnView;
                    }
                });

                var currentTokenID = $routeParams["token"];
                var currentToken = $service.getTokenById(currentTokenID);

                if (!currentToken) {
                    $location.path("/");
                    return;
                }

                // For contingency of shipping without limited
                $scope.canEditFeatureRestrictions = !currentToken.unrestricted || CAN_CREATE_LIMITED;

                $scope.current = currentToken;
                $scope.working = {
                    name: currentToken.id,
                    unrestricted: currentToken.unrestricted,
                    features: {}
                };

                currentToken.features.forEach(function(feature) {
                    $scope.working.features[feature] = true;
                    $scope.selectedFeatures.push(feature);
                });

                if (!$scope.current.unrestricted) {
                    $service.getFeatures().then($scope._featuresLoaded);
                }

            };

            /**
             * Update the nvdata saved
             *
             * @private
             *
             */
            $scope._updateCSSS = function _updateCSSS() {
                $CSSS.set(CSSS_COMPONENT_NAME, {
                    showAllHelp: $scope.showAllHelp
                });
            };

            /**
             * Set the scope features to the passed features
             *
             * @param {Array<Object>} features
             */
            $scope._featuresLoaded = function _featuresLoaded(features) {
                $scope.features = features;
            };

            /**
             * Toggle Showing or Hiding All help
             *
             */
            $scope.toggleHelp = function toggleHelp() {
                $scope.showAllHelp = !$scope.showAllHelp;
                $scope._updateCSSS();
            };

            $scope._tokenRenamed = function _tokenRenamed(originalName, newName) {
                $alertService.success(LOCALE.maketext("You have successfully renamed the API Token “[_1]” to “[_2]”.", _.escape(originalName), _.escape(newName)));
            };

            $scope._renameToken = function _renameToken(originalName, newName) {
                return $service.renameToken(originalName, newName).then($scope._tokenRenamed.bind($scope, originalName, newName));
            };

            $scope._getFeatureById = function _getFeatureById(id) {
                var features = $scope.features;
                for (var i = 0; i < features.length; i++) {
                    if (features[i].id === id) {
                        return features[i];
                    }
                }
                return;
            };

            $scope._tokenRestrictionUpdated = function _tokenRestrictionUpdated(tokenName, unrestricted, features) {
                if (unrestricted) {
                    $alertService.success({
                        message: LOCALE.maketext("You have successfully set the [asis,API] token “[_1]” to unrestricted.", _.escape(tokenName)),
                        replace: false
                    });
                } else {
                    var featureNames = features.map(function(featureId) {
                        return $scope._getFeatureById(featureId).label;
                    }).map(_.escape);
                    $alertService.success({
                        message: LOCALE.maketext("The [asis,API] Token “[_1]” is now limited to the following features: [list_and_quoted,_2].", tokenName, featureNames),
                        replace: false
                    });
                }
            };

            /**
             * Update the token
             *
             * @param {Object} workingToken
             * @returns {Promise<String>} returns the promise chain
             */
            $scope.update = function update(workingToken) {
                var originalToken = $scope.current;
                var updatePromise;
                var updatingRestrictions = workingToken.unrestricted !== $scope.current.unrestricted || $scope.selectedFeatures.sort().join() !== $scope.current.features.sort().join();
                if (originalToken.id !== workingToken.name) {

                    // Rename it
                    updatePromise = $scope._renameToken(originalToken.id, workingToken.name);

                    // If we're not also updating restrictions, add the finally.
                    if (!updatingRestrictions) {
                        updatePromise.finally($scope.backToListView);
                    }
                }

                if (updatingRestrictions) {
                    var updateRestriction = $service.updateTokenRestrictions.bind($service, workingToken.name, workingToken.unrestricted, $scope.selectedFeatures);
                    var _restrictionUpdated = $scope._tokenRestrictionUpdated.bind($scope, workingToken.name, workingToken.unrestricted, $scope.selectedFeatures);
                    if (updatePromise) {
                        updatePromise.then(updateRestriction).then(_restrictionUpdated);
                    } else {
                        updatePromise = updateRestriction().then(_restrictionUpdated);
                    }

                    updatePromise.finally($scope.backToListView);

                }
                return updatePromise;
            };

            /**
             * Hide or Reveal the Feature Chooser
             *
             */
            $scope.unrestrictedToggled = function unrestrictedToggled() {
                if (!$scope.working.unrestricted && !$scope.features) {

                    // load the features
                    $service.getFeatures().then($scope._featuresLoaded);
                }
            };

            /**
             * Toggle (de)selecting all features in the feature chooser
             *
             */
            $scope.toggleSelectAllFeatures = function toggleSelectAllFeatures() {
                $scope.working.features = $scope.working.features || {};
                if ($scope.selectedFeatures.length < $scope.features.length) {
                    $scope.features.forEach(function selectAll(feature) {
                        $scope.working.features[feature.id] = true;
                    });
                } else {
                    $scope.features.forEach(function selectAll(feature) {
                        $scope.working.features[feature.id] = false;
                    });
                }

                $scope.updateSelectedFeatures();
            };

            /**
             * Determine if a partial number of items is selected
             *
             * @returns {Booolean} indeterminate state
             */
            $scope.getFeaturesIndeterminateState = function getFeaturesIndeterminateState() {
                return $scope.selectedFeatures.length && $scope.features.length && $scope.features.length !== $scope.selectedFeatures.length;
            };

            /**
             * Update the selected features list
             *
             */
            $scope.updateSelectedFeatures = function updateSelectedFeatures() {
                $scope.selectedFeatures = [];
                angular.forEach($scope.working.features, function(featureSelected, featureKey) {
                    if (featureSelected) {
                        $scope.selectedFeatures.push(featureKey);
                    }
                });
            };

            /**
             * Return to the lister view
             *
             */
            $scope.backToListView = function backToListView() {
                $location.path("/");
            };

            /**
             * Show the revocation confirmation dialog
             *
             */
            $scope.showRevokeConfirm = function showRevokeConfirm() {
                $scope.ui.confirmingRevocation = true;
            };

            /**
             * Hide the revocation confirmation dialog
             *
             */
            $scope.hideRevokeConfirm = function hideRevokeConfirm() {
                $scope.ui.confirmingRevocation = false;
            };

            /**
             * Notify user of the success of a token revocation
             *
             * @param {String} token
             */
            $scope._tokenRevoked = function _tokenRevoked(token) {
                $alertService.success(  LOCALE.maketext("You have successfully revoked the following [asis,API] [numerate,_1,token,tokens]: “[_1]”", _.escape(token)) );
            };

            /**
             * Revoke a token
             *
             * @param {APIToken} token
             * @returns {Promise} revocation promise
             */
            $scope.revokeToken = function revokeToken(token) {

                return $service.deleteTokens([token.id]).then( $scope._tokenRevoked.bind($scope, token.id) ).then( $scope.backToListView );

            };

            $scope.$on("$destroy", $CSSS.unregister.bind($CSSS, CSSS_COMPONENT_NAME));

            $scope.init();

        };

        var app = angular.module(MODULE_NAMESPACE, MODULE_DEPENDANCIES);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES.concat(CONTROLLER));

        var resolver = {
            "apiTokens": [ APITokensService.serviceName, function($service) {
                return $service.fetchTokens();
            }]
        };

        return {
            "id": "manageAPIToken",
            "route": "/manage",
            "controller": CONTROLLER_NAME,
            "class": CONTROLLER,
            "templateUrl": TEMPLATE_URL,
            "title": VIEW_TITLE,
            "namespace": MODULE_NAMESPACE,
            "showResourcePanel": true,
            "resolve": resolver
        };
    }
);

/*
# account_preferences/index.js                     Copyright 2019 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require, define */

define(
    'app/index',[
        "angular",
        "cjt/core",
        "cjt/util/locale",
        "app/services/apiTokens",
        "app/views/list",
        "app/views/create",
        "app/views/manage",
        "app/filters/htmlSafeString",
        "cjt/modules",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/services/APICatcher",
        "cjt/directives/loadingPanel",
        "cjt/directives/breadcrumbs",
        "ngRoute",
    ],
    function(angular, CJT, LOCALE, ApiTokensService, ListView, CreateView, ManageView, HTMLSafeStringFilter) {

        "use strict";

        var MODULE_NAME = "cpanel.apiTokens";

        return function() {

            var ROUTES = [];
            var MODULE_INJECTABLES = [
                "ngRoute",
                "cjt2." + CJT.applicationName,
                ApiTokensService.namespace,
                HTMLSafeStringFilter.namespace
            ];

            [ListView, CreateView, ManageView].forEach(function(routeView) {
                routeView.breadcrumb = routeView.breadcrumb ? routeView.breadcrumb : {
                    id: routeView.id,
                    name: routeView.title,
                    path: routeView.route,
                    parentID: routeView.parentID
                };
                ROUTES.push(routeView);
                MODULE_INJECTABLES.push(routeView.namespace);
            });

            // First create the application
            var appModule = angular.module(MODULE_NAME, MODULE_INJECTABLES);

            appModule.value("ITEM_LISTER_CONSTANTS", {
                TABLE_ITEM_BUTTON_EVENT: "TableItemActionButtonEmitted",
                TABLE_ITEM_SELECTED: "TableItemSelectedEmitted",
                TABLE_ITEM_DESELECTED: "TableItemDeselectedEmitted",
                ITEM_LISTER_UPDATED_EVENT: "ItemListerUpdatedEvent",
                ITEM_LISTER_SELECT_ALL: "ItemListerSelectAllEvent",
                ITEM_LISTER_DESELECT_ALL: "ItemListerDeselectAllEvent"
            });

            appModule.value("CAN_CREATE_LIMITED", PAGE.canCreateLimited);

            appModule.controller("MainController", ["$scope", "$rootScope", "alertService", function MainController($scope, $rootScope, $alertService) {

                $scope.showResourcePanel = true;
                $scope.mainPanelClasses = "";
                $scope.sidePanelClasses = "";

                $scope.updatePanelClasses = function updatePanelClasses() {

                    $scope.sidePanelClasses = "col-sm-4 col-md-4 hidden-xs";
                    $scope.sidePanelClasses += " ";
                    $scope.sidePanelClasses += LOCALE.is_rtl() ? "pull-left" : "pull-right";

                    $scope.mainPanelClasses = $scope.showResourcePanel ? "col-xs-12 col-sm-8 col-md-8" : "col-xs-12";
                };

                /**
                 * Find a Route by the Path
                 *
                 * @private
                 *
                 * @method _getRouteByPath
                 * @param  {String} path route to match against the .route property of the existing routes
                 *
                 * @returns {Object} route that matches the provided path
                 *
                 */

                function _getRouteByPath(path) {
                    var foundRoute;
                    ROUTES.forEach(function(route, key) {
                        if (route.route === path) {
                            foundRoute = key;
                        }
                    });
                    return foundRoute;
                }

                $rootScope.$on("$routeChangeStart", function() {
                    $scope.loading = true;
                    $alertService.clear("danger");
                });

                $rootScope.$on("$routeChangeSuccess", function(event, current) {
                    $scope.loading = false;

                    if (current) {
                        var currentRouteKey = _getRouteByPath(current.$$route.originalPath);
                        if (ROUTES[currentRouteKey]) {
                            $scope.currentTab = ROUTES[currentRouteKey];
                            $scope.showResourcePanel = $scope.currentTab.showResourcePanel;
                            $scope.activeTab = currentRouteKey;
                            $scope.updatePanelClasses();
                        }
                    }

                });

                $rootScope.$on("$routeChangeError", function() {
                    $scope.loading = false;
                });
            }]);

            // Then load the application dependencies
            require(["cjt/bootstrap"], function(BOOTSTRAP) {

                appModule.config([
                    "$routeProvider",
                    "$animateProvider",
                    function($routeProvider, $animateProvider) {

                        $animateProvider.classNameFilter(/^((?!no-animate).)*$/);

                        ROUTES.forEach(function(route, key) {
                            $routeProvider.when(route.route, route);
                        });

                        $routeProvider.otherwise({
                            "redirectTo": "/"
                        });
                    }
                ]);

                BOOTSTRAP("#content", MODULE_NAME);
            });

            return appModule;
        };
    }
);

