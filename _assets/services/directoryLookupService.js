/*
 * cpanel - base/frontend/paper_lantern/user_manager/services/directoryLookupService.js
 *                                                 Copyright(c) 2015 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    [
        "angular",
        "lodash",

        "cjt/core",
        "cjt/util/locale",

        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi",
        "cjt/util/parse",
    ],
    function(angular, _, CJT, LOCALE, API, APIREQUEST, APIDRIVER, PARSER) {
        "use strict";

        var app = angular.module("cpanel.services.directoryLookup", []);
        var lastRequestJQXHR = null;
        app.factory("directoryLookupService", [
            "$q",
            "APIService",
            function($q, APIService) {
                var DirectoryLookupService = function() {};
                DirectoryLookupService.prototype = new APIService();
                angular.extend(DirectoryLookupService.prototype, {

                    /**
                     * Query the directory completion API. Given a path prefix, which may
                     * include a partial directory name, returns an array of matching
                     * directories.
                     * @param  {String}  match  The prefix to match.
                     * @return {Promise} When fulfilled, will have either provided the list of matching directories or failed.
                     */
                    complete: function(match) {

                        /* Only allow one promise at a time for this service, and cancel any existing request, since
                         * the latest request will always supersede the existing one when typing into a text box. */
                        if (lastRequestJQXHR) {
                            lastRequestJQXHR.abort();
                        }

                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Fileman", "autocompletedir");
                        apiCall.addArgument("path", match);
                        apiCall.addArgument("dirsonly", true);
                        apiCall.addArgument("skipreserved", true);
                        apiCall.addArgument("html", 0);

                        /* If the last character of the path to match is a slash, then the user is probably hoping to see
                         * a list of all files underneath that directory. The API doesn't understand this unless you
                         * specify list_all mode, so we need to add that argument. */
                        if ( "/" === match.charAt(match.length - 1) ) {
                            apiCall.addArgument("list_all", true);
                        }

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {
                                var flattenedResponse = [];
                                for (var i = 0, l = response.data.length; i < l; i++) {
                                    flattenedResponse.push(response.data[i].file);
                                }
                                return flattenedResponse;
                            }
                        });

                        return deferred.promise;
                    },

                    /* override sendRequest from APIService to also save our last jqXHR object */
                    sendRequest: function(apiCall, handlers, deferred) {
                        apiCall = new APIService.AngularAPICall(apiCall, handlers, deferred);

                        lastRequestJQXHR = apiCall.jqXHR;

                        return apiCall.deferred;
                    }
                });
                return new DirectoryLookupService();
            }
        ]);
    }
);
