/*
# zone_editor/services/dnssec.js                  Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "jquery",
        "lodash",
        "cjt/util/locale",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi"
    ],
    function(angular, $, _, LOCALE, API, APIREQUEST, APIDRIVER) {

        var app = angular.module("cpanel.zoneEditor");
        var factory = app.factory("DNSSEC", ["$q", "defaultInfo", function($q, defaultInfo) {

            var api = {};

            function set_state(domain, status) {
                var apiCall = new APIREQUEST.Class();
                if (status) {
                    apiCall.initialize("DNSSEC", "enable_dnssec");
                } else {
                    apiCall.initialize("DNSSEC", "disable_dnssec");
                }
                apiCall.addArgument("domain", domain);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {

                            // The API call can succeed but you can still get an error message
                            // so check for that message and return it
                            if (response.meta.DNSSEC && response.meta.DNSSEC.failed) {
                                return $q.reject(response.meta.DNSSEC.failed[domain]);
                            }
                            return true;
                        } else {
                            return $q.reject(response.error);
                        }
                    });
            }

            api.enable = function(domain) {
                return set_state(domain, true);
            };

            api.disable = function(domain) {
                return set_state(domain, false);
            };

            api.fetch = function(domain) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("DNSSEC", "fetch_ds_records");
                apiCall.addArgument("domain", domain);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            if (response.data[domain].keys) {

                                // get a list of the keys with the active keys at the front of the list
                                return _.orderBy(response.data[domain].keys, "active").reverse();
                            } else {

                                // return an empty array to signal that dnssec is not enabled
                                return [];
                            }
                        } else {
                            return $q.reject(response.error);
                        }
                    });
            };

            return api;
        }]);

        return factory;
    }
);
