/*
# _assets/views/applicationListController.js      Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */

define(
    [
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
