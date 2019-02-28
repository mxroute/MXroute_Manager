/*
* multiphp_ini_editor/index.js                 Copyright(c) 2015 cPanel, Inc.
*                                                           All rights Reserved.
* copyright@cpanel.net                                         http://cpanel.net
* This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */

define(
    [
        "angular",
        "jquery",
        "lodash",
        "cjt/core",
        "cjt/modules",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "ngRoute",
        "uiBootstrap",
        "ngAnimate"
    ],
    function(angular, $, _, CJT) {
        return function() {

            // First create the application
            angular.module("App", ["ngRoute", "ui.bootstrap", "ngAnimate", "cjt2.cpanel"]);

            // Then load the application dependencies
            var app = require(
                [

                    // Application Modules
                    "cjt/bootstrap",
                    "app/views/basicMode",
                    "app/views/editorMode"
                ], function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.firstLoad = {
                        phpAccountList: true
                    };

                    // Setup Routing
                    app.config(["$routeProvider", "$locationProvider",
                        function($routeProvider, $locationProvider) {

                            // configure html5 to get links working on jsfiddle
                            // $locationProvider.html5Mode(true);

                            // Setup the routes
                            $routeProvider.when("/basic", {
                                controller: "basicMode",
                                templateUrl: CJT.buildFullPath("multiphp_ini_editor/views/basicMode.html.tt"),
                                reloadOnSearch: false
                            });

                            $routeProvider.when("/editor", {
                                controller: "editorMode",
                                templateUrl: CJT.buildFullPath("multiphp_ini_editor/views/editorMode.html.tt"),
                                reloadOnSearch: false
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/basic"
                            });
                        }
                    ]);

                    app.run(["$rootScope", "$location", "growlMessages", function($rootScope, $location, growlMessages) {

                        // register listener to watch route changes
                        $rootScope.$on("$routeChangeStart", function() {
                            $rootScope.currentRoute = $location.path();
                            growlMessages.destroyAllMessages();
                        });
                    }]);

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);
