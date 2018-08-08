/*
 * multiphp_ini_editor/services/configService.js        Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    [

        // Libraries
        "angular",

        // Application

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
        app.factory("configService", ["$q", function($q) {

            // return the factory interface
            return {

                /**
                 * Get a list of directives for the selected PHP version.
                 * @param {string} pathType - This can be either 'home' or 'vhost'
                 * @param {string} vhost - A vhost/domain. This argument is required if the above argument value is 'vhost'.
                 * @return {Promise} - Promise that will fulfill the request.
                 */
                fetchBasicList: function(pathType, vhost) {

                    // make a promise
                    var deferred = $q.defer();

                    var apiCall = new APIREQUEST.Class();

                    apiCall.initialize("LangPHP", "php_ini_get_user_basic_directives");
                    apiCall.addArgument("type", pathType);
                    if (pathType !== "home") {
                        apiCall.addArgument("vhost", vhost);
                    }

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
                 * Gets the PHP Handler used by the provided vhost. If the type
                 * is 'Home', then it returns the PHP Handler used by the system
                 * default PHP.
                 * @param {string} pathType - This can be either 'home' or 'vhost'
                 * @param {string} vhost - A vhost/domain. This argument is required if the above argument value is 'vhost'.
                 * @return {Promise} - Promise that will fulfill the request.
                 */
                getHandlerForDomain: function(pathType, vhost) {

                    // make a promise
                    var deferred = $q.defer();

                    var apiCall = new APIREQUEST.Class();

                    apiCall.initialize("LangPHP", "php_get_domain_handler");
                    apiCall.addArgument("type", pathType);
                    if (pathType !== "home") {
                        apiCall.addArgument("vhost", vhost);
                    }

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
                 * Set the new settings of basic directives for the selected PHP version.
                 * setData: JSON object with the list of PHP directives and their corresponding settings.
                 * @return {Promise} - Promise that will fulfill the request.
                 */
                applySettings: function(type, vhost, directives) {

                    // make a promise
                    var deferred = $q.defer();

                    var apiCall = new APIREQUEST.Class();

                    apiCall.initialize("LangPHP", "php_ini_set_user_basic_directives");
                    if (type !== "home") {
                        apiCall.addArgument("vhost", vhost);
                    }
                    apiCall.addArgument("type", type);

                    // Construct the directive & value arguments.
                    if (typeof (directives) !== "undefined" && directives.length > 0) {
                        directives.forEach(function(directive, index) {
                            apiCall.addArgument("directive-" + index, directive.key + ":" + directive.value);
                        });
                    }

                    API.promise(apiCall.getRunArguments())
                        .done(function(response) {

                            // Create items from the response
                            response = response.parsedResponse;
                            if (response.status) {

                                // var results = convertResponseToList(response);

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
                 * Get the content of the INI file for the selected PHP version.
                 * @param {string} version - Selected PHP version
                 * @return {Promise} - Promise that will fulfill the request.
                 */
                fetchContent: function(pathType, vhost) {

                    // make a promise
                    var deferred = $q.defer();

                    var apiCall = new APIREQUEST.Class();

                    apiCall.initialize("LangPHP", "php_ini_get_user_content");
                    apiCall.addArgument("type", pathType);
                    if (pathType !== "home") {
                        apiCall.addArgument("vhost", vhost);
                    }

                    API.promise(apiCall.getRunArguments())
                        .done(function(response) {

                            // Create items from the response
                            response = response.parsedResponse;
                            if (response.status) {

                                // Keep the promise
                                deferred.resolve(response.data.content);
                            } else {

                                // Pass the error along
                                deferred.reject(response.error);
                            }
                        });

                    // Pass the promise back to the controller
                    return deferred.promise;
                },

                /**
                 * Save the new edited content of the INI file for the selected PHP version.
                 * version: The selected PHP version.
                 * content: The edited content.
                 * @return {Promise} - Promise that will fulfill the request.
                 */
                saveIniContent: function(content, pathType, vhost) {

                    // make a promise
                    var deferred = $q.defer();

                    var apiCall = new APIREQUEST.Class();

                    apiCall.initialize("LangPHP", "php_ini_set_user_content");

                    apiCall.addArgument("content", content);
                    apiCall.addArgument("type", pathType);
                    if (pathType !== "home") {
                        apiCall.addArgument("vhost", vhost);
                    }

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
            };
        }]);
    }
);
