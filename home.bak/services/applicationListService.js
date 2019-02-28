/*
 * home/services/applicationListService.js        Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    [

        // Libraries
        "angular",

        // CJT
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready
    ],
    function(angular, API, APIREQUEST, APIDRIVER) {

        // Fetch the current application
        var app = angular.module("App");

        /**
         * Setup the account list model's API service
         */
        app.factory("applicationListService", ["$q",
            function($q) {

                // return the factory interface
                return {

                    /**
                     * Sends the list of collapsed menu groups to the server to retain
                     * user preferences in the page's NVData object
                     * @param {String} groups - The | delimited list of collapsed menu groups
                     * @return {Promise} - Promise that will fulfill the request
                    **/
                    setCollapsedGroupsList: function(groups) {
                        var deferred = $q.defer();

                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("NVData", "set");
                        apiCall.addArgument("names", "xmainrollstatus");
                        apiCall.addArgument("xmainrollstatus", groups);

                        API.promise(apiCall.getRunArguments())
                            .done(function(response) {

                                // Create items from the response
                                response = response.parsedResponse;
                                if (response.status) {

                                    // Keep the promise
                                    deferred.resolve(response.data);
                                } else {

                                    // Pass the error along
                                    deferred.reject(response.error);
                                }
                            });

                        // pass the promise back to the controller
                        return deferred.promise;
                    },

                    /**
                     * Sends the ordered list of application groups to the server to retain
                     * user preferences in the page's NVData object
                     * @param {String} groups - The | delimited list of group order
                     * @return {Promise} - Promise that will fulfill the request
                    **/
                    setGroupsOrder: function(groups) {
                        var deferred = $q.defer();

                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("NVData", "set");
                        apiCall.addArgument("names", "xmaingroupsorder");
                        apiCall.addArgument("xmaingroupsorder", groups);

                        API.promise(apiCall.getRunArguments())
                            .done(function(response) {

                                // Create items from the response
                                response = response.parsedResponse;
                                if (response.status) {

                                    // Keep the promise
                                    deferred.resolve(response.data);
                                } else {

                                    // Pass the error along
                                    deferred.reject(response.error);
                                }
                            });

                        // pass the promise back to the controller
                        return deferred.promise;
                    },
                };
            }
        ]);
    }
);
