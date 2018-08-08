/*
# terminal/index.js                               Copyright(c) 2018 cPanel, Inc.
#                                                           All rights reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require: false, define: false, PAGE: false */

define(
    'app/index',[
        "angular",
        "lodash",
        "cjt/io/uapi-request",
        "cjt/io/uapi",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap",
        "cjt/services/APICatcher",
        "cjt/services/alertService",
        "cjt/directives/alertList",
        "cjt/decorators/alertAPIReporter",
    ],
    function(angular, _, APIREQUEST) {

        "use strict";

        return function() {

            // First create the application
            angular.module("App", ["ui.bootstrap", "cjt2.cpanel"]);

            // Then load the application dependencies
            require(
                [
                    "cjt/bootstrap",

                    // Application Modules
                    "uiBootstrap",

                    "cjt/directives/terminal",
                ], function(BOOTSTRAP) {
                    var app = angular.module("App");
                    app.controller("BaseController", [
                        "$scope",
                        "APICatcher",
                        "alertService",
                        function( $scope, APICatcher, alertService ) {

                            _.assign(
                                $scope,
                                {
                                    terminal_warning_accepted: PAGE.terminal_warning_accepted,

                                    acceptWarning: function _acceptWarning() {
                                        var apicall = new APIREQUEST.Class().initialize(
                                            "NVData",
                                            "set",
                                            {
                                                names: "terminal_warning_accepted",
                                                terminal_warning_accepted: 1,
                                            }
                                        );

                                        APICatcher.promise(apicall);

                                        $scope.terminal_warning_accepted = 1;
                                    },
                                }
                            );
                        },
                    ]);
                    BOOTSTRAP();
                }
            );
        };
    }
);

