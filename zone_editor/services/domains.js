/*
# zone_editor/services/domains.js                 Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "jquery",
        "cjt/util/locale",
        "cjt/io/api",
        "cjt/io/api2-request",
        "cjt/io/api2",
        "cjt/util/httpStatus",
        "cjt/core"
    ],
    function(angular, $, LOCALE, API, APIREQUEST, APIDRIVER, HTTP_STATUS, CJT) {

        var app = angular.module("cpanel.zoneEditor");
        var factory = app.factory("Domains", ["$q", "defaultInfo", function($q, defaultInfo) {

            var store = {};

            store.domains = [];

            store.fetch = function(force) {
                if (store.domains.length === 0 || force) {
                    var apiCall = new APIREQUEST.Class();
                    apiCall.initialize("DomainLookup", "getbasedomains");

                    return $q.when(API.promise(apiCall.getRunArguments()))
                        .then(function(response) {
                            response = response.parsedResponse;
                            if (response.status) {
                                store.domains = response.data;
                                return store.domains;
                            } else {
                                return $q.reject(response.error);
                            }
                        })
                        .catch(function(err) {
                            var message = LOCALE.maketext("The API request failed with the following error: [_1] - [_2].", err.status, HTTP_STATUS.convertHttpStatusToReadable(err.status));
                            if (err.status === 401 || err.status === 403) {
                                message += " " + LOCALE.maketext("Your session may have expired or you logged out of the system. [output,url,_1,Login] again to continue.", CJT.getLoginPath());
                            }
                            return $q.reject(message);
                        });
                } else {
                    return $q.when(store.domains);
                }
            };

            store.init = function() {
                store.domains = defaultInfo.domains;
            };

            store.init();

            return store;
        }]);

        return factory;
    }
);
