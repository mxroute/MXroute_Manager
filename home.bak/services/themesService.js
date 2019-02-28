/*
 * home/services/themesService.js        Copyright(c) 2015 cPanel, Inc.
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
        app.factory("themesService", ["$q",
            function($q) {

                // return the factory interface
                return {

                    /**
                     * Get available themes list
                     * @return {Promise} - Promise that will fulfill the request.
                     */
                    getAvailableThemes: function() {

                        // make a promise
                        var deferred = $q.defer();

                        var apiCall = new APIREQUEST.Class();

                        apiCall.initialize("Themes", "list", {
                            show_mail_themes: 0
                        });

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

                        // Pass the promise back to the controller
                        return deferred.promise;
                    },

                    /**
                     * Set theme
                     * @param {String} theme - Theme Name
                     * @return {Promise} - Promise that will fulfill the request
                    **/
                    setTheme: function(themeName) {

                        var deferred = $q.defer();

                        var apiCall = new APIREQUEST.Class();

                        apiCall.initialize("Themes", "update", {
                            theme: themeName
                        });

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
                    }
                };
            }
        ]);
    }
);
