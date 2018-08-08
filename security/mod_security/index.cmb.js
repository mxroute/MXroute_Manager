/* global define: false */

define(
    'app/services/modSecurityDomainService',[

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
         * Setup the domainlist models API service
         */
        app.factory("modSecurityDomainService", ["$q", "APIService", function($q, APIService) {

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
                    if ( meta.hasOwnProperty("modsec") ) {
                        totalEnabled = meta.modsec.total_enabled;
                        totalDisabled = meta.modsec.total_disabled;
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
            * Toggles mod security on the specified domains
            *
            * @param  {String}  API method to call.
            * @param  {String}  domains to be toggled on or off
            * @return {Object}  The result object.
            */
            function toggleDomains(method, domains) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("ModSecurity", method, {
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
            * Toggles mod security for all domains
            *
            * @param  {String}  API method to call.
            * @return {Object} The result object.
            */
            function toggleAllDomains(method) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("ModSecurity", method);

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
                    apiCall.initialize("ModSecurity", "list_domains");
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
                * Enables mod security on the specified domains
                * @param  {Object} domains A coma sepperated list of domains
                * @return {Object} The result object.
                */
                enableDomains: function(domains) {
                    return toggleDomains.call(this, "enable_domains", domains);
                },

                /**
                * Enables mod security on all domains
                * @return {Object} The result object.
                */
                enableAllDomains: function() {
                    return toggleAllDomains.call(this, "enable_all_domains");
                },

                /**
                * Disables mod security on the specified domains
                * @param  {Object} domains A coma sepperated list of domains
                * @return {Object} The result object.
                */
                disableDomains: function(domains) {
                    return toggleDomains.call(this, "disable_domains", domains);
                },

                /**
                * Disables mod security on all domains
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
# security/mod_security/views/domainlistController.js Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */

define(
    'app/views/domainListController',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/decorators/paginationDecorator",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/spinnerDirective",
        "cjt/directives/autoFocus",
        "cjt/filters/wrapFilter",
        "cjt/filters/breakFilter",
        "app/services/modSecurityDomainService"
    ],
    function(angular, _, LOCALE) {

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

        /**
         * Merge an issue into a domain entry.
         *
         * @private
         * @method _mergeIssue
         * @param  {Object} domain Domains from fetch operation
         * @param  {Object} issue  Issue from enable/disable operation
         */
        var _mergeIssue = function(domain, issue) {
            if (issue) {
                if (issue.exception) {
                    domain.exception = issue.exception;
                } else {
                    if ( domain.exception) {
                        delete domain.exception;
                    }
                }
            }
        };

        /**
         * Find the index of an element in the array by the predicate testing function.
         * Why isn't this in lodash?
         *
         * @private
         * @method _findIndexOf
         * @param  {Array} array
         * @param  {Function} predicate
         * @return {Number}   Index of the item in the array matching the predicate function or -1 if not found.
         */
        var _findIndexOf = function(array, predicate) {
            for (var i = 0, l = array.length; i < l; ++i) {
                if (predicate(array[i])) {
                    return i;
                }
            }
            return -1;
        };

        /**
         * Find the index of the issue object with the passed domain.
         *
         * @private
         * @method _findIndexOfIssueByDomain
         * @param  {Array} issues
         * @param  {String} domain
         * @return {Number}        Index of the issue with the passed domain or -1 if not found.
         */
        var _findIndexOfIssueByDomain = function(issues, domain) {
            return _findIndexOf(issues, function(issue) {
                return domain === issue.domain;
            });

        };

        /**
         * Remove the issue with the domain if it exists.
         *
         * @private
         * @method _removeIssueByDomain
         * @param  {Array} issues
         * @param  {String} domain
         */
        var _removeIssueByDomain = function(issues, domain) {
            if (issues && issues.length > 0) {
                var index = _findIndexOfIssueByDomain(issues, domain);
                if (index !== -1) {
                    issues.splice(index, 1);
                }
            }
        };

        /**
         * Add or update the issue in the issues array.
         *
         * @private
         * @method _addIssueByDomain
         * @param {Array} issues
         * @param {String} domain
         * @param {String} exception
         */
        var _addIssueByDomain = function(issues, domain, exception) {
            var index = _findIndexOfIssueByDomain(issues, domain);
            var issue = { domain: domain, exception: exception };
            if (index !== -1) {
                issues.splice(index, 1, issue);
            } else {
                issues.push(issue);
            }
        };

        /**
         * Merge in issues to newly fetch domains so we can make issues survive server side paging
         *
         * @private
         * @method _mergeIssues
         * @param  {Array} domains List of domains from fetch operation
         * @param  {Array} issues  List of issues from enable/disable operation
         */
        var _mergeIssues = function(domains, issues) {
            if (!issues || issues.length === 0) {
                return domains;
            } else {
                angular.forEach(domains, function(domain) {
                    var relatedIssue = _.find(issues, function(issue) {
                        return domain.domain === issue.domain;
                    });
                    _mergeIssue(domain, relatedIssue);
                });
            }
            return domains;
        };

        // Setup the controller
        var controller = app.controller(
            "domainListController", [
                "$scope",
                "$routeParams",
                "$q",
                "modSecurityDomainService",
                "spinnerAPI",
                "alertService",
                function(
                    $scope,
                    $routeParams,
                    $q,
                    modSecurityDomainService,
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
                        $scope.alerts = alertService.getAlerts();
                        $scope.hasIssues = false;
                        $scope.issues = []; // used to rebuild the exceptions from previous failures
                        $scope.openConfirmation = null;

                        // Setup the installed bit...
                        $scope.isInstalled = PAGE.installed;
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
                            pageSize: $routeParams.pageSize || 10,
                            pageNumber: $routeParams.pageNumber || 1,
                            sortDirection: $routeParams.sortDirection || "asc",
                            sortBy: $routeParams.sortBy || "domain",
                            sortType: $routeParams.sortType,
                            pageSizes: [10, 20, 50, 100]
                        };
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
                        return modSecurityDomainService
                            .fetchList($scope.meta)
                            .then(function(results) {
                                $scope.domainList = _mergeIssues(results.items, $scope.issues);
                                $scope.totalItems = results.totalItems;
                                $scope.totalPages = results.totalPages;
                                $scope.totalEnabled  = results.totalEnabled;
                                $scope.totalDisabled = results.totalDisabled;
                            }, function(error) {

                                // failure
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "fetchError"
                                });
                            })
                            .then(function() {
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Sets the status of mod security on the domain
                     *
                     * @method setDomain
                     * @param {Object} domain The domain with status to set
                     * @return {Promise} Promise that when fulfilled will result in the domains status being set in the API.
                     */
                    $scope.setDomain = function(domain) {
                        spinnerAPI.start("loadingSpinner");
                        if ( domain.enabled ) {
                            return modSecurityDomainService
                                .enableDomains(domain.domain)
                                .then(function(result) {
                                    $scope.totalEnabled++;
                                    $scope.totalDisabled--;

                                    _removeIssueByDomain($scope.issues, domain.domain);
                                    if (domain.exception) {
                                        delete domain.exception;
                                    }
                                    _updateIssuesFlag();

                                    // success
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Successfully enabled [asis,ModSecurity™] on “[_1]”.", result.items[0].domain),
                                        id: "enableSuccess"
                                    });
                                }, function(results) {
                                    var error;
                                    if (!angular.isString(results)) {
                                        var exception = results.items[0].exception;
                                        var enabled = results.items[0].enabled;
                                        _addIssueByDomain($scope.issues, domain.domain, exception);
                                        domain.exception = exception;
                                        domain.enabled   = enabled;
                                        _updateIssuesFlag();
                                        error = results.error;
                                    } else {
                                        error = results;
                                    }

                                    // failure
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        id: "enableFailure"
                                    });

                                    // $scope.fetch();
                                })
                                .then(function() {
                                    spinnerAPI.stop("loadingSpinner");
                                });
                        } else {
                            return modSecurityDomainService
                                .disableDomains(domain.domain)
                                .then(function(result) {
                                    $scope.totalDisabled++;
                                    $scope.totalEnabled--;

                                    _removeIssueByDomain($scope.issues, domain.domain);
                                    if (domain.exception) {
                                        delete domain.exception;
                                    }
                                    _updateIssuesFlag();

                                    // success
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Successfully disabled [asis,ModSecurity™] on “[_1]”.", result.items[0].domain),
                                        id: "disableSuccess"
                                    });
                                }, function(results) {

                                    var error;
                                    if (!angular.isString(results)) {
                                        var exception = results.items[0].exception;
                                        var enabled = results.items[0].enabled;
                                        _addIssueByDomain($scope.issues, domain.domain, exception);
                                        domain.exception = exception;
                                        domain.enabled   = enabled;
                                        _updateIssuesFlag();
                                        error = results.error;
                                    } else {
                                        error = results;
                                    }

                                    // failure
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        id: "disableFailed"
                                    });

                                    // $scope.fetch();
                                })
                                .then(function() {
                                    spinnerAPI.stop("loadingSpinner");
                                });
                        }
                    };

                    /**
                     * Enable mod security on all domains
                     *
                     * @method enableAllDomains
                     * @param  {Object} $event The Event object
                     * @return {Promise} Promise that when fulfilled will result in the domains being enabled.
                     */
                    $scope.enableAllDomains = function($event) {

                        // prevent the default action of the link
                        $event.preventDefault();

                        spinnerAPI.start("loadingSpinner");
                        return modSecurityDomainService
                            .enableAllDomains()
                            .then(function(results) {
                                _clearIssues();
                                _updateStatus($scope.domainList, results.items);
                                $scope.totalItems = results.totalItems;
                                $scope.totalPages = results.totalPages;
                                $scope.totalEnabled = results.totalItems;
                                $scope.totalDisabled = 0;

                                // success
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("Successfully enabled [asis,ModSecurity™] on all domains."),
                                    id: "enableAllSuccess"
                                });
                            }, function(results) {
                                var error;
                                if (!angular.isString(results)) {
                                    _updateStatus($scope.domainList, results.items);
                                    $scope.issues = results.items || []; // Preserve
                                    _updateIssuesFlag();

                                    $scope.totalEnabled = results.totalEnabled;
                                    $scope.totalDisabled = results.totalDisabled;

                                    error = results.error;
                                } else {
                                    error = results;
                                }

                                // failure
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "enableAllFailed"
                                });
                            })
                            .then(function() {
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Disable mod security on all domains.
                     *
                     * @method disableAllDomains
                     * @param  {Object} $event The Event object
                     * @return {Promise} Promise that when fulfilled will result in the domains being enabled.
                     */
                    $scope.disableAllDomains = function($event) {

                        // prevent the default action of the link
                        $event.preventDefault();

                        spinnerAPI.start("loadingSpinner");
                        return modSecurityDomainService
                            .disableAllDomains()
                            .then(function(results) {
                                _updateStatus($scope.domainList, results.items);
                                $scope.issues = results.items || [];
                                $scope.totalItems = results.totalItems;
                                $scope.totalPages = results.totalPages;
                                $scope.totalDisabled = results.totalItems;
                                $scope.totalEnabled = 0;

                                // success
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("Successfully disabled [asis,ModSecurity™] on all domains."),
                                    id: "disableAllSuccess"
                                });
                            }, function(results) {
                                var error;
                                if (!angular.isString(results)) {
                                    _updateStatus($scope.domainList, results.items);
                                    $scope.issues = results.items || [];
                                    _updateIssuesFlag();
                                    $scope.totalEnabled = results.totalEnabled;
                                    $scope.totalDisabled = results.totalDisabled;

                                    error = results.error;
                                } else {
                                    error = results;
                                }

                                // failure
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "disableAllFailed"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                $scope.openConfirmation = null;
                            });
                    };

                    /**
                     * Update the issues flag
                     *
                     * @private
                     * @method _updateIssuesFlag
                     */
                    var _updateIssuesFlag = function() {
                        var match = _.find($scope.domainList, function(domain) {
                            return !!domain.exception;
                        });
                        $scope.hasIssues = typeof (match) !== "undefined";
                    };

                    /**
                     * Test if the config has a related issue meaning something went wrong.
                     *
                     * @method hasIssue
                     * @return {Boolean} true if there are any issues, false otherwise.
                     */
                    $scope.hasIssue = function(domain) {
                        return !!domain.exception;
                    };

                    /**
                     * Clear the issues property in preparation for an api run.
                     *
                     * @private
                     * @method _clearIssues
                     */
                    var _clearIssues = function() {
                        delete $scope.hasIssues;
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
                     * Sets the open confirmation to the value passed in. If no value is passed in, there
                     * will be no open confirmation.
                     *
                     * @method confirm
                     * @param  {Any} confirmation   This can be a string, object, array, or really anything
                     *                              that can reliably be compared later with something like
                     *                              ng-show to see if the confirmation should be open.
                     */
                    $scope.confirm = function(confirmation) {
                        $scope.openConfirmation = confirmation ? confirmation : null;
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
                            var results = modSecurityDomainService.prepareList(PAGE.domainList);
                            $scope.meta.pageNumber = 1;
                            $scope.domainList = results.items;
                            $scope.totalItems = results.totalItems;
                            $scope.totalPages = results.totalPages;
                            $scope.totalEnabled = PAGE.domainList.meta.modsec.total_enabled;
                            $scope.totalDisabled = PAGE.domainList.meta.modsec.total_disabled;
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

                    // watch the page size and and load the first page if it changes
                    $scope.$watch("meta.pageSize", function(oldValue, newValue) {
                        if (oldValue === newValue) {
                            return;
                        }
                        $scope.selectPage(1);
                    });

                    _initializeView();

                }
            ]
        );

        return controller;
    }
);

/*
# security/mod_security/index.js                  Copyright(c) 2015 cPanel, Inc.
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
                    "app/views/domainListController",
                ], function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.firstLoad = {
                        domainList: true,
                    };

                    // routing
                    app.config(["$routeProvider",
                        function($routeProvider) {

                            // Setup the routes
                            $routeProvider.when("/domainList/", {
                                controller: "domainListController",
                                templateUrl: CJT.buildFullPath("security/mod_security/views/domainListView.ptt")
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/domainList/"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);

