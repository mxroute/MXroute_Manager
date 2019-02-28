/*
 * home/services/accountsService.js        Copyright(c) 2015 cPanel, Inc.
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
        app.factory("accountsService", ["$q",
            function($q) {

                // return the factory interface
                return {

                    /**
                     * Get available accounts list
                     * @param {Boolean} [isRTL] - Optional flag denoting that the interface is in RTL
                     * @return {Promise} - Promise that will fulfill the request.
                     */
                    getAvailableAccounts: function(isRTL) {

                        // make a promise
                        var deferred = $q.defer();

                        var apiCall = new APIREQUEST.Class();

                        apiCall.initialize("Resellers", "list_accounts");

                        API.promise(apiCall.getRunArguments())
                            .done(function(response) {

                                // Create items from the response
                                response = response.parsedResponse;
                                if (response.status) {

                                    // set RTL friendly account label
                                    isRTL = isRTL || false;
                                    var currentAccount;
                                    for (var i = 0, length = response.data.length; i < length; i++) {
                                        currentAccount = response.data[i];
                                        if ( isRTL ) {
                                            currentAccount.accountLabel = "\u200e(" + currentAccount.domain + ") " + currentAccount.user;
                                        } else {
                                            currentAccount.accountLabel = currentAccount.user + " (" + currentAccount.domain + ")";
                                        }
                                    }

                                    // Keep the promise
                                    deferred.resolve(response.data);
                                } else {

                                    // Pass the error along
                                    deferred.reject(response.error);
                                }
                            });

                        // Pass the promise back to the controller
                        return deferred.promise;
                    }
                };
            }
        ]);
    }
);
