/*
# user_manager/views/addController.js             Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/views/addEditController",
        "cjt/directives/alertList",
        "cjt/directives/bytesInput",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/labelSuffixDirective",
        "cjt/services/alertService",
        "app/services/userService",
        "cjt/services/dataCacheService"
    ],
    function(angular, _, LOCALE, baseCtrlFactory) {

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "addController", [
                "$scope",
                "$routeParams",
                "$timeout",
                "$location",
                "$anchorScroll",
                "userService",
                "alertService",
                "directoryLookupService",
                "dataCache",
                "defaultInfo",
                "quotaInfo",
                "emailDaemonInfo",
                "ftpDaemonInfo",
                "webdiskDaemonInfo",
                "features",
                "spinnerAPI",
                function(
                    $scope,
                    $routeParams,
                    $timeout,
                    $location,
                    $anchorScroll,
                    userService,
                    alertService,
                    directoryLookupService,
                    dataCache,
                    defaultInfo,
                    quotaInfo,
                    emailDaemonInfo,
                    ftpDaemonInfo,
                    webdiskDaemonInfo,
                    features,
                    spinnerAPI
                ) {

                    var baseCtrl = baseCtrlFactory($scope, userService, emailDaemonInfo, ftpDaemonInfo, webdiskDaemonInfo, features, defaultInfo, quotaInfo, alertService);

                    /**
                     * Setup the scope for this controller.
                     *
                     * @method initializeScope
                     */
                    var initializeScope = function() {
                        baseCtrl.initializeScope();
                        $scope.ui.user.sendInvite = $scope.ui.isInviteSubEnabled = !!window.PAGE.isInviteSubEnabled;
                    };


                    /**
                     * Setup the view for this controller.
                     *
                     * @method initializeView
                     */
                    var initializeView = function() {
                        baseCtrl.initializeView();
                    };

                    initializeScope();
                    initializeView();

                    /**
                     * Toggle the service enabled state.
                     * @param  {Object} service Specific service state from the user.services collection containing:
                     *   @param  {Boolean} service.enabled True if enabled, false otherwise
                     */
                    $scope.toggleService = function(service) {
                        service.enabled = !service.enabled;
                    };

                    /**
                     * Create new user and then handle subsequent updating of the shared userList. If navigation is requested, it will
                     * move back to the list view. If navigation is suppressed, it will reset the form to a well known state and focus
                     * the first element so  the user can start entering data again.
                     * @param  {Object} user
                     * @param  {Boolean} leave if true will navigate back to the list. if false, will clear the form and set focus on the full name.
                     */
                    $scope.create = function(user, leave) {
                        $scope.inProgress = true;
                        alertService.clear();

                        // scroll to the button on submit
                        $anchorScroll("btn-create");

                        return userService
                            .create(user)
                            .then(function(user) {
                                var query;
                                var cachedUserList = dataCache.get("userList");
                                if (cachedUserList) {
                                    $scope.insertSubAndRemoveDupes(user, cachedUserList);
                                    dataCache.set("userList", cachedUserList);
                                    query = { loadFromCache: true };
                                } else {
                                    query = { loadFromCache: false };
                                }

                                baseCtrl.clearPrefetch();
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("You successfully created the following user: [_1]", (user.real_name || user.full_username)),
                                    id: "createSuccess",
                                    autoClose: 10000
                                });

                                if (leave) {
                                    $scope.loadView("list/rows", query);
                                } else {
                                    var lastDomain = $scope.ui.user.domain;
                                    initializeScope();

                                    // Preserve the last domain so we can create
                                    // a number of accounts on the same domain
                                    $scope.ui.user.domain = lastDomain;
                                    $scope.form.$setPristine();

                                    // Scroll to the top of the form to restart
                                    $anchorScroll("top");

                                    $timeout(function() {

                                        // Set the focus on the first field
                                        var el = angular.element("#full-name");
                                        if (el) {
                                            el.focus();
                                        }
                                    }, 10);
                                }
                            }, function(error) {
                                var name = user.real_name || (user.username + "@" + user.domain);
                                error = error.error || error;

                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system failed to create the “[_1]” user with the following error: [_2]", name, error),
                                    id: "createError"
                                });
                                $anchorScroll("top");

                                var cachedUserList = dataCache.get("userList");
                                if (error.user && cachedUserList) {
                                    $scope.insertSubAndRemoveDupes(error.user, cachedUserList);
                                    dataCache.set("userList", cachedUserList);
                                }

                                baseCtrl.clearPrefetch();
                            })
                            .finally(function() {
                                $scope.inProgress = false;
                            });
                    };

                    // Handle the case where the user clears the homedir box
                    // and needs to know what the home directory folders are?
                    // Normally, the typeahead wont send this.
                    $scope.$watch("ui.user.services.ftp.homedir", function() {
                        if (!$scope.ui.user.services.ftp.homedir &&
                            $scope.form.txtFtpHomeDirectory &&
                            !$scope.form.txtFtpHomeDirectory.$pristine) {
                            $scope.form.txtFtpHomeDirectory.$setViewValue("/");
                        }
                    });

                    $scope.$watch("ui.user.services.webdisk.homedir", function() {
                        if (!$scope.ui.user.services.webdisk.homedir &&
                            $scope.form.txtWebDiskHomeDirectory &&
                            !$scope.form.txtWebDiskHomeDirectory.$pristine) {
                            $scope.form.txtWebDiskHomeDirectory.$setViewValue("/");
                        }
                    });

                    // Update the home directories as the user types
                    $scope.$watch("ui.user.username + '@' + ui.user.domain", function(newValue, oldValue) {
                        var parts = newValue.split("@");

                        // Update the ftp homedir
                        if (!$scope.ui.user.services.ftp.isCandidate && $scope.form.txtFtpHomeDirectory && $scope.form.txtFtpHomeDirectory.$pristine) {
                            $scope.ui.user.services.ftp.homedir = $scope.ui.docrootByDomain[parts[1]] + "/" + parts[0];
                        }

                        // Update the webdisk homedir
                        if (!$scope.ui.user.services.webdisk.isCandidate && $scope.form.txtWebDiskHomeDirectory && $scope.form.txtWebDiskHomeDirectory.$pristine) {
                            $scope.ui.user.services.webdisk.homedir = $scope.ui.docrootByDomain[parts[1]] + "/" + parts[0];
                        }
                    });
                }
            ]
        );

        return controller;
    }
);
