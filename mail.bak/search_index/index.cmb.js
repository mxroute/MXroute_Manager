/*
 * mail/search_index/services/searchIndex.js                           Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define, PAGE */
define(
    'app/services/searchIndex',[
        "angular",
        "cjt/util/locale",
        "cjt/io/uapi-request",
        "cjt/io/api",
        "cjt/io/uapi",
        "cjt/services/APIService"
    ],
    function(angular, LOCALE, UAPIREQUEST) {

        var app = angular.module("cpanel.searchIndex.searchIndex.service", []);
        app.value("PAGE", PAGE);
        app.value("userEmailAccount", PAGE.emailAccount);

        app.factory("searchIndex", ["$q", "APIService", "userEmailAccount", "$timeout", function($q, APIService, userEmailAccount, $timeout) {

            var SearchIndex = function() {};

            function reIndexEmail() {

                var apiCall = new UAPIREQUEST.Class();
                apiCall.initialize("Email", "fts_rescan_mailbox", {
                    account: userEmailAccount
                });

                var deferred = this.deferred(apiCall);
                return deferred.promise;

            }


            SearchIndex.prototype = new APIService();

            angular.extend(SearchIndex.prototype, {
                reIndexEmail: reIndexEmail
            });

            return new SearchIndex();
        }]);
    }
);

/*
# mail/search_index/views/main.js      Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'app/views/main',[
        "angular",
        "cjt/util/locale",
        "app/services/searchIndex",
        "cjt/modules",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/alertList"
    ],
    function(angular, LOCALE) {

        var app = angular.module("cpanel.searchIndex");

        var controller = app.controller(
            "main",
            ["$scope", "searchIndex", "alertService", "PAGE",
                function($scope, $service, $alertService, PAGE) {
                    $scope.reIndexEmail = function() {

                        $alertService.clear();

                        return $service.reIndexEmail().then(function(result) {
                            $alertService.add({
                                message: LOCALE.maketext("The system has initiated a reindex of your email."),
                                replace: true,
                                id: "reIndexStatus",
                                type: "success"
                            });
                            if (result.messages) {
                                result.messages.forEach(function(message) {
                                    $alertService.add({
                                        message: message,
                                        replace: false,
                                        type: "warning"
                                    });
                                });
                            }
                        }).catch(function(error) {
                            $alertService.add({
                                message: LOCALE.maketext("The system encountered an error when it attempted to initiate a reindex of your email: [_1]", error),
                                replace: true,
                                id: "reIndexStatus",
                                type: "danger"
                            });
                        });
                    };
                }
            ]
        );

        return controller;
    }
);

/*
# mail/search_index/index.js                        Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require, define, PAGE */

define(
    'app/index',[
        "angular",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "app/services/searchIndex"
    ],
    function(angular) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.searchIndex", [

                // Use the dynamic CJT2 module name, since this code is shared between Webmail and cPanel
                PAGE.CJT2_ANGULAR_MODULE_NAME,

                "ngRoute",
                "cpanel.searchIndex.searchIndex.service",
            ]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "app/views/main"
                ], function(BOOTSTRAP) {

                    var app = angular.module("cpanel.searchIndex");
                    app.value("PAGE", PAGE);


                    app.config([
                        "$routeProvider",
                        function($routeProvider) {

                            $routeProvider.when("/", {
                                controller: "main",
                                templateUrl: "views/main.ptt"
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "cpanel.searchIndex");

                });

            return app;
        };
    }
);

