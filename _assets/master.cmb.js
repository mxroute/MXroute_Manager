/*
# _assets/views/applicationListController.js      Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */

define(
    'master/views/applicationListController',[
        "angular",
        "cjt/core",
        "uiBootstrap"
    ],
    function(angular, CJT) {
        "use strict";

        // Retrieve the current application
        var app = angular.module("Master");

        // Setup the controller
        var controller = app.controller(
            "applicationListController", [
                "$scope",
                "$window",
                "notificationsService",
                "$timeout",
                function(
                    $scope,
                    $window,
                    notificationsService,
                    $timeout
                ) {

                    /**
                     * Initialize the scope variables
                     *
                     * @private
                     * @method _initializeScope
                     */
                    var _initializeScope = function() {
                        $scope.applicationList = [];
                        if (PAGE.applicationList) {
                            $scope.applicationList = PAGE.applicationList;
                        }

                        $scope.notificationsExist = false;

                        /** We are running into browser limits on the number of
                         *  concurrent HTTP connections. We want these AJAX
                         *  calls to be low priority so that CSS/sprites/etc.
                         *  will load first; otherwise, the UI takes longer to
                         *  be usable.
                         *
                         *  We need to reduce the number of concurrent
                         *  HTTP calls, but for now this stop-gap will
                         *  ensure that AJAX post-back calls don’t delay the
                         *  loading of critical UI resources.
                         */
                        if (!PAGE.skipNotificationsCheck) {
                            $timeout(function() {
                                notificationsService.getCount().then(function(response) {
                                    $scope.notificationsExist = response > 0 ? true : false;
                                    $scope.notificationsCount = response;
                                });
                            });
                        }

                        // Firefox listens to the "/" and "Cmd + F" to trigger the browser search.
                        // We are overriding the "/" here to trigger our search functionality.
                        // To do that, we must listen on the keydown instead of the keyup event.
                        angular.element($window).on("keydown", function(event) {
                            var tag = event.target.tagName.toLowerCase();
                            if (tag === "input" || tag === "select" || tag === "textarea") {
                                return;
                            }

                            // listen for either numberpad or left of shift / key
                            if (event.keyCode === 191 || event.keyCode === 111) {
                                event.preventDefault();
                                document.getElementById("txtQuickFind").focus();
                            }
                        });
                    };

                    $scope.openApplication = function($model, $event) {

                        // ignore click events since the items are already links
                        // that open a browser tab or window
                        if ($event.type === "click") {
                            return;
                        }

                        $event.stopPropagation();

                        var url = $model.url;
                        var target = ($model.target) ? $model.target : "_self";

                        // check for the type of path needed and build it
                        if (url.search(/^http/i) === -1) {
                            if (url.search(/^\//) !== -1) {
                                url = CJT.getRootPath() + url;
                            } else {
                                url = CJT.buildFullPath(url);
                            }
                        }

                        window.open(url, target);
                    };

                    /**
                     * Clears the quick find application field when
                     * pressing the Esc key
                     */
                    $scope.clearQuickFind = function(event) {
                        if (event.keyCode === 27) {
                            $scope.quickFindSelected = "";
                        }
                    };


                    /**
                     * Uses the dom processor to convert html entities &amp; to &
                     * This is preferable to an iterative list because there is no list to maintain.
                     */
                    $scope.formatAppName = function(model) {
                        if (!model) {
                            return "";
                        }

                        /*
                            because this element never gets added to the dom
                            it gets garbage collected after the function runs its course
                        */
                        var t = document.createElement("textarea");
                        t.innerHTML = model.name;
                        return t.value;

                    };

                    _initializeScope();
                }
            ]
        );

        return controller;
    }
);

/*
# _assets/views/sidebarController.js              Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'master/views/sidebarController',[
        "angular"
    ],
    function(angular) {

        // Retrieve the current application
        var app = angular.module("Master");

        // Setup the controller
        var controller = app.controller(
            "sidebarController", [
                "$scope",
                function($scope) {

                // Placeholder controller for the sidebar to provide sidebar angular foothold

                }
            ]
        );

        return controller;
    }
);

/*
# _assets/master.js                                  Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */

define(
    'master/master',[
        "angular",
        "uiBootstrap",
        "ngSanitize",
        "cjt/services/cpanel/notificationsService"
    ],
    function(angular) {
        "use strict";

        return function() {

            // First create the application
            angular.module("Master", [
                "ui.bootstrap",
                "ngSanitize",
                "cjt2.services.cpanel.notifications",
            ]);

            // Then load the application dependencies
            var app = require(
                [
                    "master/views/applicationListController",
                    "master/views/sidebarController"

                    // Application Modules
                ], function() {

                    var app = angular.module("Master");

                    /**
                     * Initialize the application
                     * @return {ngModule} Main module.
                     */
                    app.init = function() {

                        angular.element("#masterAppContainer").ready(function() {

                            var masterAppContainer = angular.element("#masterAppContainer");
                            if (masterAppContainer[0] !== null) {

                                // apply the app after requirejs loads everything
                                angular.bootstrap(masterAppContainer[0], ["Master"]);
                            }
                        });

                        var body    = angular.element("body");
                        var sidebar = angular.element("#sidebar");

                        sidebar.ready(function() {

                            if (sidebar[0] !== null) {

                                // apply the app after requirejs loads everything
                                angular.bootstrap(sidebar[0], ["Master"]);

                                // TODO: Move to the controller
                                if (sidebar.css("display") === "none") {
                                    body.addClass("nav-collapsed");
                                } else {
                                    body.removeClass("nav-collapsed");
                                }

                                var windowWidth = window.innerWidth;
                                angular.element(window)
                                    .bind("resize", function() {
                                        if (windowWidth !== window.innerWidth) {
                                            if (sidebar.css("display") === "none") {
                                                body.addClass("nav-collapsed");
                                            } else {
                                                body.removeClass("nav-collapsed");
                                            }

                                            // Update the cache
                                            windowWidth = window.innerWidth;
                                        }
                                    });
                            }
                        });

                        // TODO: Move to the controller
                        // Add functionality to the navbar toggle button
                        angular.element("#btnSideBarToggle").bind("click", function() {
                            sidebar.toggleClass("active");
                            body.toggleClass("nav-collapsed");
                        });

                        // Chaining
                        return app;
                    };

                    // We can now run the bootstrap for the application
                    app.init();

                });

            return app;
        };
    }
);

