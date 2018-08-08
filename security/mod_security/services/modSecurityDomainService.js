/* global define: false */

define(
    [

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
