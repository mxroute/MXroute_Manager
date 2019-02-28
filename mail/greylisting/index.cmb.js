/* global define: false */

define(
    'app/services/domainService',[

        // Libraries
        "angular",
        "lodash",

        // CJT
        "cjt/util/locale",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready

        // Angular components
        "cjt/services/APIService"
    ],
    function(angular, _, LOCALE, API, APIREQUEST, APIDRIVER) {

        // Fetch the current application
        var app = angular.module("App");

        /**
         * Setup the domainlist API service
         */
        app.factory("DomainService", ["$q", "APIService", function($q, APIService) {

            /**
             * Converts the response to our application data structure
             * @param  {Object} response
             * @return {Object} Sanitized data structure.
             */
            function convertResponseToList(response) {
                var items = [];
                if (response.data) {
                    var data = response.data;
                    for (var i = 0, length = data.length; i < length; i++) {
                        items.push(data[i]);
                    }

                    var meta = response.meta;

                    var totalItems = meta.paginate.total_records || data.length;
                    var totalPages = meta.paginate.total_pages || 1;
                    var totalEnabled = 0,
                        totalDisabled = 0;
                    if ( meta.hasOwnProperty("cPGreyList") ) {
                        totalEnabled = meta.cPGreyList.total_enabled;
                        totalDisabled = meta.cPGreyList.total_disabled;
                    } else {

                        // calculate these since we are getting this from disableAll or
                        // enableAll and it does not do these calculations server side.
                        var enabledItems = _.filter(data, function(item) {
                            return !!item.enabled;
                        });
                        totalEnabled = enabledItems ? enabledItems.length : 0;
                        totalDisabled = data.length - totalEnabled;
                    }

                    return {
                        items: items,
                        totalItems: totalItems,
                        totalPages: totalPages,
                        totalEnabled: totalEnabled,
                        totalDisabled: totalDisabled
                    };
                } else {
                    return {
                        items: [],
                        totalItems: 0,
                        totalPages: 0,
                        totalEnabled: 0,
                        totalDisabled: 0
                    };
                }
            }

            /**
            * Toggles greylisting on the specified domains
            *
            * @param  {String}  API method to call.
            * @param  {String}  domains to be toggled on or off
            * @return {Object}  The result object.
            */
            function toggleDomains(method, domains) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("cPGreyList", method, {
                    domains: domains
                });

                var deferred = this.deferred(apiCall, {
                    done: function(response, deferred) {

                        // create items from the response
                        response = response.parsedResponse;
                        var results = convertResponseToList(response);

                        if (response.status) {

                            // keep the promise
                            deferred.resolve(results);
                        } else {

                            // pass the error along
                            deferred.reject({
                                items: results.items,
                                error: response.error
                            });
                        }
                    }
                });

                // pass the promise back to the controller
                return deferred.promise;
            }

            /**
            * Toggles greylisting for all domains
            *
            * @param  {String}  API method to call.
            * @return {Object} The result object.
            */
            function toggleAllDomains(method) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("cPGreyList", method);

                var deferred = this.deferred(apiCall, {
                    done: function(response, deferred) {

                        // create items from the response
                        response = response.parsedResponse;
                        var results = convertResponseToList(response);
                        if (response.status) {

                            // keep the promise
                            deferred.resolve(results);
                        } else {

                            // pass the error along
                            results.error = response.error;
                            deferred.reject(results);
                        }
                    }
                });

                // pass the promise back to the controller
                return deferred.promise;
            }

            // Set up the service's constructor and parent
            var DomainsService = function() {};
            DomainsService.prototype = new APIService();

            // Extend the prototype with any class-specific functionality
            angular.extend(DomainsService.prototype, {

                /**
                 * Get a list domains that match the selection criteria passed in meta parameter
                 * @param {object} meta Optional meta data to control sorting, filtering and paging
                 *   @param {string} meta.sortBy Name of the field to sort by
                 *   @param {string} meta.sordDirection asc or desc
                 *   @param {string} meta.sortType Optional name of the sort rule to apply to the sorting
                 *   @param {string} meta.filterBy Name of the filed to filter by
                 *   @param {string} meta.filterCompare Optional comparator to use when comparing for filter.
                 *   If not provided, will default to ???.
                 *   May be one of:
                 *       TODO: Need a list of valid filter types.
                 *   @param {string} meta.filterValue  Expression/argument to pass to the compare method.
                 *   @param {string} meta.pageNumber Page number to fetch.
                 *   @param {string} meta.pageSize Size of a page, will default to 10 if not provided.
                 * @return {Promise} Promise that will fulfill the request.
                 */
                fetchList: function(meta) {
                    var apiCall = new APIREQUEST.Class();
                    apiCall.initialize("cPGreyList", "list_domains");
                    if (meta) {
                        if (meta.sortBy && meta.sortDirection) {
                            apiCall.addSorting(meta.sortBy, meta.sortDirection, meta.sortType);
                        }
                        if (meta.pageNumber) {
                            apiCall.addPaging(meta.pageNumber, meta.pageSize || 10);
                        }
                        if (meta.filterBy && meta.filterCompare && meta.filterValue) {
                            apiCall.addFilter(meta.filterBy, meta.filterCompare, meta.filterValue);
                        }
                    }

                    var deferred = this.deferred(apiCall, {
                        transformAPISuccess: convertResponseToList
                    });

                    // pass the promise back to the controller
                    return deferred.promise;
                },

                /**
                *  Helper method that calls convertResponseToList to prepare the data structure
                * @param  {Object} response
                * @return {Object} Sanitized data structure.
                */
                prepareList: function(response) {
                    return convertResponseToList(response);
                },

                /**
                * Enables greylisting on the specified domains
                * @param  {Object} domains A coma sepperated list of domains
                * @return {Object} The result object.
                */
                enableDomains: function(domains) {
                    return toggleDomains.call(this, "enable_domains", domains);
                },

                /**
                * Enables greylisting on all domains
                * @return {Object} The result object.
                */
                enableAllDomains: function() {
                    return toggleAllDomains.call(this, "enable_all_domains");
                },

                /**
                * Disables greylisting on the specified domains
                * @param  {Object} domains A coma sepperated list of domains
                * @return {Object} The result object.
                */
                disableDomains: function(domains) {
                    return toggleDomains.call(this, "disable_domains", domains);
                },

                /**
                * Disables greylisting on all domains
                * @return {Object} The result object.
                */
                disableAllDomains: function() {
                    return toggleAllDomains.call(this, "disable_all_domains");
                }
            });

            return new DomainsService();
        }]);
    }
);

/*
# mail/greylisting/views/domains.js               Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */
/* jshint -W100 */

define(
    'app/views/domains',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/decorators/paginationDecorator",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/spinnerDirective",
        "cjt/directives/autoFocus",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/filters/wrapFilter",
        "cjt/filters/breakFilter",
        "app/services/domainService"
    ],
    function(angular, _, LOCALE) {
        "use strict";

        // Retrieve the current application
        var app = angular.module("App");

        /**
         * Update the enabled and exception field in the list based on
         * the returned updates.
         *
         * @private
         * @method _updateStatus
         * @param  {Array} list    List of domains
         * @param  {Array} updates List of update records
         */
        var _updateStatus = function(list, updates) {
            for (var i = 0, l = list.length; i < l; i++) {
                var update = _findUpdateByDomain(updates, list[i].domain);
                if (update) {
                    list[i].enabled = update.enabled;
                    if (update.exception) {
                        list[i].exception = update.exception;
                    } else {
                        delete list[i].exception;
                    }
                } else {
                    if (list[i].exception) {
                        delete list[i].exception;
                    }
                }
            }
        };

        /**
         * Find an update record by the domain name
         *
         * @private
         * @method _findUpdateByDomain
         * @param  {Array} updates List of update records
         * @param  {String} domain Domain to look for in the update list.
         * @return {Object}        Update associated with the requested domain or nothing if not found.
         */
        var _findUpdateByDomain = function(updates, domain) {
            for (var i = 0, l = updates.length; i < l; i++) {
                if (updates[i].domain === domain) {
                    return updates[i];
                }
            }
            return;
        };

        // Setup the controller
        var controller = app.controller(
            "domainListController", [
                "$scope",
                "$routeParams",
                "$q",
                "DomainService",
                "spinnerAPI",
                "alertService",
                function(
                    $scope,
                    $routeParams,
                    $q,
                    DomainService,
                    spinnerAPI,
                    alertService
                ) {

                    /**
                     * Initialize the scope variables
                     *
                     * @private
                     * @method _initializeScope
                     */
                    var _initializeScope = function() {
                        $scope.activeSearch = false;
                        $scope.filteredData = false;
                        $scope.totalEnabled = 0;
                        $scope.totalDisabled = 0;
                        $scope.selectedRow = -1;

                        // Setup the enabled bits...
                        $scope.isEnabled = PAGE.enabled;
                        $scope.hasFeature  = PAGE.hasFeature;

                        if (!$scope.hasFeature) {
                            return;
                        }

                        // setup data structures for the view
                        $scope.domainList = [];
                        $scope.totalPages = 0;
                        $scope.totalItems = 0;
                        $scope.meta = {
                            filterBy: $routeParams.filterBy || "*",
                            filterCompare: $routeParams.filterCompare || "contains",
                            filterValue: $routeParams.filterValue || "",
                            pageSize: $routeParams.pageSize || 20,
                            pageNumber: $routeParams.pageNumber || 1,
                            sortDirection: $routeParams.sortDirection || "asc",
                            sortBy: $routeParams.sortBy || "domain",
                            sortType: $routeParams.sortType,
                            pageSizes: [20, 50, 100],
                            start: 0,
                            limit: 0
                        };
                    };

                    /**
                     * Are All Domains Currently Disabled
                     *
                     * @method allDomainsAreDisabled
                     * @return {boolean} True if all Domains are Disabled
                     */
                    $scope.allDomainsAreDisabled = function() {
                        return $scope.totalDisabled === $scope.totalItems;
                    };

                    /**
                     * Are All Domains Currently Enabled
                     *
                     * @method allDomainsAreEnabled
                     * @return {boolean} True if all Domains are Enabled
                     */
                    $scope.allDomainsAreEnabled = function() {
                        return $scope.totalEnabled === $scope.totalItems;
                    };

                    /**
                     * Does the logged in account have domains
                     *
                     * @method hasNoDomains
                     * @return {boolean} True if there are no domains associated with the logged in account
                     */
                    $scope.hasNoDomains = function() {
                        return $scope.totalItems === 0;
                    };

                    /**
                     * Clear the search query
                     *
                     * @method clearFilter
                     */
                    $scope.clearFilter = function() {
                        $scope.meta.filterValue = "";
                        $scope.activeSearch = false;
                        $scope.filteredData = false;
                        $scope.selectedRow = -1;
                        return $scope.fetch();
                    };

                    /**
                     * Start a search query
                     *
                     * @method startFilter
                     */
                    $scope.startFilter = function() {
                        $scope.activeSearch = true;
                        $scope.filteredData = false;
                        $scope.selectedRow = -1;
                        var defer = $q.defer();
                        defer.promise
                            .then(function() {

                                // select the first page of search results
                                $scope.selectPage(1);
                            })
                            .then(function() {
                                $scope.filteredData = true;
                            });
                        defer.resolve();
                    };


                    /**
                     * Selects a table row
                     *
                     * @method toggleRow
                     * @param  {Object} $event The Event object
                     * @param  {Number} index The index of selected row
                     */
                    $scope.toggleRow = function($event, index) {

                        // prevent the default action of the link
                        $event.preventDefault();

                        if ( index === $scope.selectedRow ) {

                            // collapse the row
                            $scope.selectedRow = -1;

                        } else {

                            // expand the selected row
                            $scope.selectedRow = index;
                        }

                    };

                    /**
                     * Change the page size
                     *
                     * @method selectPageSize
                     */
                    $scope.selectPageSize = function() {
                        $scope.selectPage(1);
                    };

                    /**
                     * Select a specific page
                     *
                     * @method selectPage
                     * @param  {Number} [page] Optional page number, if not provided will use the current
                     * page provided by the scope.meta.pageNumber.
                     * @return {Promise}
                     */
                    $scope.selectPage = function(page) {

                        // clear the selected row
                        $scope.selectedRow = -1;

                        // set the page if requested
                        if (page && angular.isNumber(page)) {
                            $scope.meta.pageNumber = page;
                        }

                        // fetch the page
                        return $scope.fetch();
                    };

                    /**
                     * Sort the list of domains
                     *
                     * @method sortList
                     * @param {Object} meta             An object with metadata properties of sortBy, sortDirection, and sortType.
                     * @param {Boolean} [defaultSort]   If true, this sort was not initiated by the user.
                     */
                    $scope.sortList = function(meta, defaultSort) {

                        // clear the selected row
                        $scope.selectedRow = -1;

                        if (!defaultSort) {
                            $scope.fetch();
                        }
                    };

                    /**
                     * Handles the keybinding for the clearing and searching.
                     * Esc clears the search field.
                     * Enter performs a search.
                     *
                     * @method triggerToggleSearch
                     * @param {Event} event - The event object
                     */
                    $scope.triggerToggleSearch = function(event) {

                        // clear on Esc
                        if (event.keyCode === 27) {
                            $scope.toggleSearch(true);
                        }

                        // filter on Enter
                        if (event.keyCode === 13) {
                            $scope.toggleSearch();
                        }
                    };

                    /**
                     * Toggles the clear button and conditionally performs a search.
                     * The expected behavior is if the user clicks the button or focuses the button and hits enter the button state rules.
                     * If the user hits <enter> in the field, its a submit action with just request the data.
                     * If the user hits <esc> behavior which will unconditionally clear.
                     *
                     * @method toggleSearch
                     * @param {Boolean} isClick Toggle button clicked.
                     */
                    $scope.toggleSearch = function(isClick) {
                        var filter = $scope.meta.filterValue;

                        if ( !filter && ($scope.activeSearch  || $scope.filteredData)) {

                            // no query in box, but we previously filtered or there is an active search
                            $scope.clearFilter();
                        } else if (isClick && $scope.activeSearch ) {

                            // User clicks clear
                            $scope.clearFilter();
                        } else if (filter) {
                            $scope.startFilter();
                        }
                    };

                    /**
                     * Fetch the list of domains from the server.
                     *
                     * @method fetch
                     * @return {Promise} Promise that when fulfilled will result in the list being loaded with the new criteria.
                     */
                    $scope.fetch = function() {
                        spinnerAPI.start("loadingSpinner");
                        return DomainService
                            .fetchList($scope.meta)
                            .then(function(results) {
                                $scope.domainList = results.items;
                                $scope.totalItems = results.totalItems;
                                $scope.totalPages = results.totalPages;
                                $scope.totalEnabled  = results.totalEnabled;
                                $scope.totalDisabled = results.totalDisabled;

                                $scope.meta.start = ($scope.meta.pageNumber - 1) * $scope.meta.pageSize + 1;
                                $scope.meta.limit = $scope.meta.pageNumber * $scope.meta.pageSize;

                                if ($scope.meta.limit > $scope.totalItems) {
                                    $scope.meta.limit = $scope.totalItems;
                                }

                                if ($scope.meta.limit === 0) {
                                    $scope.meta.start = 0;
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "greylisting"
                                });
                            })
                            .then(function() {
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Sets the status of greylisting on the supplied domain.
                     *
                     * @method setDomain
                     * @param {Object} domain The domain with status to set
                     * @return {Promise} Promise that when fulfilled will result in the domains status being set in the API.
                     */
                    $scope.setDomain = function(domain) {
                        spinnerAPI.start("loadingSpinner");
                        if ( domain.enabled ) {
                            return DomainService
                                .enableDomains(domain.domain)
                                .then(function(result) {
                                    $scope.totalEnabled++;
                                    $scope.totalDisabled--;
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Successfully enabled [asis,Greylisting] on “[output,class,_1,nobreak]”.", result.items[0].domain),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "greylisting"
                                    });
                                }, function(results) {
                                    alertService.add({
                                        type: "danger",
                                        message: results.error,
                                        closeable: true,
                                        replace: false,
                                        group: "greylisting"
                                    });
                                })
                                .then(function() {
                                    spinnerAPI.stop("loadingSpinner");
                                });
                        } else {
                            return DomainService
                                .disableDomains(domain.domain)
                                .then(function(result) {
                                    $scope.totalDisabled++;
                                    $scope.totalEnabled--;
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Successfully disabled [asis,Greylisting] on “[output,class,_1,nobreak]”.", result.items[0].domain),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "greylisting"
                                    });
                                }, function(results) {
                                    alertService.add({
                                        type: "danger",
                                        message: results.error,
                                        closeable: true,
                                        replace: false,
                                        group: "greylisting"
                                    });
                                })
                                .then(function() {
                                    spinnerAPI.stop("loadingSpinner");
                                });
                        }
                    };

                    /**
                     * Enable greylisting on all domains
                     *
                     * @method enableAllDomains
                     * @param  {Object} $event The Event object
                     * @return {Promise} Promise that when fulfilled will result in the domains being enabled.
                     */
                    $scope.enableAllDomains = function($event) {
                        if ($scope.allDomainsAreEnabled()) {
                            return;
                        }

                        spinnerAPI.start("loadingSpinner");
                        return DomainService
                            .enableAllDomains()
                            .then(function(results) {
                                _updateStatus($scope.domainList, results.items);
                                $scope.totalItems = results.totalItems;
                                $scope.totalPages = results.totalPages;
                                $scope.totalEnabled = results.totalItems;
                                $scope.totalDisabled = 0;
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("Successfully enabled [asis,Greylisting] on all domains."),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "greylisting"
                                });
                            }, function(results) {
                                alertService.add({
                                    type: "danger",
                                    message: results.error,
                                    closeable: true,
                                    replace: false,
                                    group: "greylisting"
                                });
                            })
                            .then(function() {
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Disable greylisting on all domains.
                     *
                     * @method disableAllDomains
                     * @param  {Object} $event The Event object
                     * @return {Promise} Promise that when fulfilled will result in the domains being enabled.
                     */
                    $scope.disableAllDomains = function($event) {
                        if ($scope.allDomainsAreDisabled()) {
                            return;
                        }

                        spinnerAPI.start("loadingSpinner");
                        return DomainService
                            .disableAllDomains()
                            .then(function(results) {
                                _updateStatus($scope.domainList, results.items);
                                $scope.totalItems = results.totalItems;
                                $scope.totalPages = results.totalPages;
                                $scope.totalDisabled = results.totalItems;
                                $scope.totalEnabled = 0;
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("Successfully disabled [asis,Greylisting] on all domains."),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "greylisting"
                                });
                            }, function(results) {
                                alertService.add({
                                    type: "danger",
                                    message: results.error,
                                    closeable: true,
                                    replace: false,
                                    group: "greylisting"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Check if there are any disabled domains
                     *
                     * @method hasDisabledDomains
                     * @return {Boolean} true if there are disabled domains, false otherwise
                     */
                    $scope.hasDisabledDomains = function() {
                        return $scope.totalDisabled > 0;
                    };

                    /**
                     * Initialize the view
                     *
                     * @private
                     * @method _initializeView
                     */
                    var _initializeView = function() {

                        // check for page data in the template if this is a first load
                        if (app.firstLoad.domainList && PAGE.domainList) {
                            app.firstLoad.domainList = false;
                            var results = DomainService.prepareList(PAGE.domainList);
                            $scope.meta.pageNumber = 1;
                            $scope.domainList = results.items;
                            $scope.totalItems = results.totalItems;
                            $scope.totalPages = results.totalPages;
                            $scope.totalEnabled = PAGE.domainList.meta.cPGreyList.total_enabled;
                            $scope.totalDisabled = PAGE.domainList.meta.cPGreyList.total_disabled;

                            $scope.meta.start = ($scope.meta.pageNumber - 1) * $scope.meta.pageSize + 1;
                            $scope.meta.limit = $scope.meta.pageNumber * $scope.meta.pageSize;


                            if ($scope.meta.limit > $scope.totalItems) {
                                $scope.meta.limit = $scope.totalItems;
                            }

                            if ($scope.meta.limit === 0) {
                                $scope.meta.start = 0;
                            }
                        } else {

                            // Otherwise, retrieve it via ajax
                            $scope.selectPage(1);
                        }
                    };

                    _initializeScope();

                    // if the user types something else in the search box, we change the button icon so they can search again.
                    $scope.$watch("meta.filterValue", function(oldValue, newValue) {
                        if (oldValue === newValue) {
                            return;
                        }
                        $scope.activeSearch = false;
                    });

                    _initializeView();

                }
            ]
        );

        return controller;
    }
);

/*
# mail/greylisting/index.js                       Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */

define(
    'app/index',[
        "angular",
        "jquery",
        "lodash",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap"
    ],
    function(angular, $, _, CJT) {
        return function() {

            // First create the application
            angular.module("App", ["ngRoute", "ui.bootstrap", "cjt2.cpanel"]);

            // Then load the application dependencies
            var app = require(
                [

                    // Application Modules
                    "cjt/bootstrap",
                    "cjt/views/applicationController",
                    "cjt/directives/alert",
                    "cjt/directives/alertList",
                    "app/views/domains",
                ], function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.firstLoad = {
                        domainList: true,
                    };

                    // routing
                    app.config(["$routeProvider",
                        function($routeProvider) {

                            // Setup the routes
                            $routeProvider.when("/domains/", {
                                controller: "domainListController",
                                templateUrl: CJT.buildFullPath("mail/greylisting/views/domains.ptt")
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/domains/"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "App");
                });

            return app;
        };
    }
);

