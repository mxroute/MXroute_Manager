/*
# zone_editor/index.js                            Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require: false, define: false, PAGE: false */

define(
    [
        "angular",
        "jquery",
        "lodash",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap"
    ],
    function(angular) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.zoneEditor", ["ngRoute", "ui.bootstrap", "angular-growl", "cjt2.cpanel"]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "app/services/page_data_service",
                    "app/services/domains",
                    "app/services/zones",
                    "app/services/dnssec",
                    "app/services/features",
                    "app/models/dynamic_table",
                    "app/directives/convert_to_full_record_name",
                    "app/views/domain_selection",
                    "app/views/manage",
                    "app/views/dnssec",
                    "app/models/dmarc_record"
                ], function(BOOTSTRAP) {

                    var app = angular.module("cpanel.zoneEditor");

                    // setup the defaults for the various services.
                    app.factory("defaultInfo", [
                        "pageDataService",
                        function(pageDataService) {
                            return pageDataService.prepareDefaultInfo(PAGE);
                        }
                    ]);

                    app.config([
                        "$routeProvider",
                        function($routeProvider) {

                            $routeProvider.when("/list", {
                                controller: "ListDomainsController",
                                controllerAs: "list",
                                templateUrl: "zone_editor/views/domain_selection.ptt"
                            });

                            $routeProvider.when("/manage/:domain", {
                                controller: "ManageZoneRecordsController",
                                controllerAs: "manage",
                                templateUrl: "zone_editor/views/manage.ptt"
                            });

                            $routeProvider.when("/dnssec/:domain", {
                                controller: "DnsSecController",
                                controllerAs: "dnssec",
                                templateUrl: "zone_editor/views/dnssec.ptt"
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "cpanel.zoneEditor");

                });

            return app;
        };
    }
);
