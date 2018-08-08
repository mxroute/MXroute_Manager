/*
 * wordpress/views/manageSiteController.js                    Copyright 2017 cPanel, Inc.
 *                                                                   All rights Reserved.
 * copyright@cpanel.net                                                 http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying isiteviews prohibited
 */

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale",
        "app/util/versionComparison",
        "app/util/versionCheck",
        "uiBootstrap",

        "cjt/services/alertService",
        "cjt/directives/alertList",
        "cjt/directives/toggleSwitchDirective",

        "app/services/instancesApi",
        "app/directives/changePassword",
        "app/directives/urlInputDirective",
    ],
    function(angular, LOCALE, compare, CHECKS) {

        // Retrieve the current application
        var app = angular.module("cpanel.wordpress");

        // Setup the controller
        var controller = app.controller(
            "manageSiteController", [
                "$scope",
                "$timeout",
                "$routeParams",
                "$location",
                "growl",
                "instancesApi",
                "alertService",
                function(
                    $scope,
                    $timeout,
                    $routeParams,
                    $location,
                    growl,
                    instancesApi,
                    alertService
                ) {

                    /**
                     * Initialize the scope variables
                     *
                     * @method _initializeScope
                     * @private
                     */
                    var _initializeScope = function() {
                        $scope.site = {
                            id: window.decodeURIComponent( $routeParams.id ),
                        };
                        $scope.ui = {
                            showAdvanced: false,
                            isRefreshing: false,
                            viewDoneLoading: false,
                            showChangeAdminPassword: false,
                            showChangeDbPassword: false,
                            selectedAdminUsername: undefined,
                        };
                        $scope.getInstanceInfo();
                    };

                    /**
                     * Initialize the view
                     *
                     * @method _initializeView
                     * @private
                     */
                    var _initializeView = function() {
                        alertService.clear(void 0, "adminPassword");
                        alertService.clear(void 0, "dbPassword");
                    };

                    /**
                     * Get an instance object from a site ID if the list is cached. No
                     * fetching for now because this is just an early implementation.
                     *
                     * @method getInstanceInfo
                     * @scope
                     */
                    $scope.getInstanceInfo = function() {
                        if($scope.site.id) {
                            $scope.instanceLoadError = null;
                            $scope.ui.isRefreshing = true;
                            return instancesApi.getById({ id: $scope.site.id, force: true })
                                .then(
                                    function(instance){
                                        $scope.ui.invalidInstance = !instance || !Object.keys(instance).length;
                                        if(!$scope.ui.invalidInstance) {
                                            $scope.site    = instance;
                                            if( instance.admins && instance.admins.length === 1) {
                                                $scope.ui.selectedAdminUsername = instance.admins[0].user_login;
                                            }

                                            /* A load that's successful overall can still produce a partial failure
                                             * that we want to display to the user, but this is not enough for us to
                                             * set invalidInstance, which would hide the entire page body. */
                                            if(instance.error){
                                                $scope.instanceLoadError = instance.error;
                                            }

                                            $scope.ui.minor_updates_only = ($scope.site["autoupdate.core.minor"] && !$scope.site["autoupdate.core.major"]);
                                            $scope.ui.all_updates        = ($scope.site["autoupdate.core.minor"] &&  $scope.site["autoupdate.core.major"]);
                                        }
                                    },
                                    function(error){
                                        $scope.instanceLoadError = error;
                                        $scope.ui.invalidInstance = true;
                                    }
                                ).finally(function() {
                                    $scope.ui.isRefreshing = false;
                                    $scope.ui.viewDoneLoading = true;
                                });
                        }
                    };

                    /**
                     * Fetches the current version or a message if unknown.
                     *
                     * @method  getCurrentVersionText description
                     * @scope
                     * @param  {Object} site Site configuration data
                     *   @param {String} site.current_version Version string from the backend.
                     * @return {String}
                     */
                    $scope.getCurrentVersionText = function(site) {
                        if (site.current_version) {
                            return site.current_version;
                        } else {
                            return LOCALE.maketext("Unknown");
                        }
                    };

                    /**
                     * Fetches the auto update text based on the data
                     * provided in the passed site configuration.
                     *
                     * @method getAutoupdateText
                     * @scope
                     * @param  {Object} site Site configuration data
                     *   @param {Boolean} site.autoupdate True if core autoupdates are enabled, false otherwise.
                     * @return {String}
                     */
                    $scope.getAutoupdateText = function(site) {
                        if (site.autoupdate) {
                            if (site["autoupdate.core.minor"] && site["autoupdate.core.major"]) {
                                return LOCALE.maketext("Enabled (Major Versions, Minor Versions, and Security Updates)");
                            } else if (site["autoupdate.core.minor"]) {
                                return LOCALE.maketext("Enabled (Minor Versions and Security Updates)");
                            } else {
                                return LOCALE.maketext("Enabled (Major Versions)");
                            }
                        } else if ("autoupdate" in site){
                            return LOCALE.maketext("Disabled");
                        } else {
                            return LOCALE.maketext("Unknown");
                        }
                    };

                    /**
                     * Toggle the advanced setting section.
                     *
                     * @method toggleAdvanced
                     * @scope
                     */
                    $scope.toggleAdvanced = function() {
                        $scope.ui.showAdvanced = !$scope.ui.showAdvanced;
                    };

                    /**
                     * Toggle the display of additional error detail.
                     *
                     * @method toggleErrorDetail
                     * @scope
                     */
                    $scope.toggleErrorDetail = function() {
                        $scope.ui.showErrorDetail = !$scope.ui.showErrorDetail;
                    };

                    /**
                     * Toggle "minor updates only" for a WordPress site. If major updates are already enabled, they will
                     * be disabled as part of this operation.
                     *
                     * @method toggleMinorUpdatesOnly
                     * @scope
                     */
                    $scope.toggleMinorUpdatesOnly = function(site) {
                        var original = { site: {}, ui: {} };
                        original["site"]["autoupdate.core.minor"] = site["autoupdate.core.minor"];
                        original["site"]["autoupdate.core.major"] = site["autoupdate.core.major"];
                        original.ui.minor_updates_only = $scope.ui.minor_updates_only;
                        original.ui.all_updates = $scope.ui.all_updates;

                        $scope.ui.minor_updates_only = !$scope.ui.minor_updates_only;
                        if ($scope.ui.minor_updates_only){
                            $scope.ui.all_updates = false;
                        }

                        site["autoupdate.core.minor"] = ($scope.ui.minor_updates_only || $scope.ui.all_updates);
                        site["autoupdate.core.major"] = $scope.ui.all_updates;

                        return instancesApi.configureAutoupdate($scope.site.id, site["autoupdate.core.major"], site["autoupdate.core.minor"]).then(
                            function(updatedInstance){
                                if(updatedInstance) {
                                    $location.path("manage/" + updatedInstance.id);
                                    $location.replace();
                                }
                                alertService.clear(undefined, "autoUpdate");
                            }, function(error){
                                site["autoupdate.core.minor"] = original["site"]["autoupdate.core.minor"];
                                site["autoupdate.core.major"] = original["site"]["autoupdate.core.major"];
                                $scope.ui.minor_updates_only = original.ui.minor_updates_only;
                                $scope.ui.all_updates = original.ui.all_updates;

                                alertService.add({
                                    id: "toggle-minor-updates-error",
                                    group: "autoUpdate",
                                    type: "danger",
                                    replace: true,
                                    message: LOCALE.maketext(
                                        "The system failed to change the Automatic Update settings: [_1]",
                                        error
                                    ),
                                });
                            }
                        );
                    };

                    /**
                     * Toggle "all updates" for a WordPress site. This includes major updates. If the "minor updates only"
                     * control is already enabled, it will be disabled as part of this operation, since the two are
                     * mutually exclusive.
                     *
                     * @method toggleAllUpdates
                     * @scope
                     */
                    $scope.toggleAllUpdates = function(site) {
                        var original = { site: {}, ui: {} };
                        original["site"]["autoupdate.core.minor"] = site["autoupdate.core.minor"];
                        original["site"]["autoupdate.core.major"] = site["autoupdate.core.major"];
                        original.ui.minor_updates_only = $scope.ui.minor_updates_only;
                        original.ui.all_updates = $scope.ui.all_updates;

                        $scope.ui.all_updates = !$scope.ui.all_updates;
                        if ($scope.ui.all_updates){
                            $scope.ui.minor_updates_only = false;
                        }

                        site["autoupdate.core.minor"] = ($scope.ui.minor_updates_only || $scope.ui.all_updates);
                        site["autoupdate.core.major"] = $scope.ui.all_updates;

                        return instancesApi.configureAutoupdate($scope.site.id, site["autoupdate.core.major"], site["autoupdate.core.minor"]).then(
                            function(updatedInstance){
                                if(updatedInstance) {
                                    $location.path("manage/" + updatedInstance.id);
                                    $location.replace();
                                }
                                alertService.clear(undefined, "autoUpdate");
                            },
                            function(error){
                                site["autoupdate.core.minor"] = original["site"]["autoupdate.core.minor"];
                                site["autoupdate.core.major"] = original["site"]["autoupdate.core.major"];
                                $scope.ui.minor_updates_only = original.ui.minor_updates_only;
                                $scope.ui.all_updates = original.ui.all_updates;

                                alertService.add({
                                    id: "toggle-minor-updates-error",
                                    group: "autoUpdate",
                                    type: "danger",
                                    replace: true,
                                    message: LOCALE.maketext(
                                        "The system failed to change the Automatic Update settings: [_1]",
                                        error
                                    ),
                                });
                            }
                        );
                    };

                    /**
                     * Show the password field for the WordPress admin. This field is hidden by
                     * default so that it's clear to the user that it doesn't need to be filled out
                     * when making any other changes.
                     *
                     * @method showChangeAdminPassword
                     * @scope
                     */
                    $scope.showChangeAdminPassword = function() {
                        alertService.clear(undefined, "adminPassword");
                        $scope.ui.showChangeAdminPassword = true;
                    };

                    /**
                     * Hide the password field for the WordPress admin.
                     * @method hideChangeAdminPassword
                     * @scope
                     */
                    $scope.hideChangeAdminPassword = function() {
                        $scope.ui.showChangeAdminPassword = false;
                    };

                    /**
                     * Change the WordPress admin password.
                     *
                     * @method changeAdminPassword
                     * @scope
                     * @param {String} newPass   The user's new password.
                     */
                    $scope.changeAdminPassword = function(newPass) {

                        var username = $scope.ui.selectedAdminUsername;

                        return instancesApi.changeUserPassword( $scope.site.id, username, newPass ).then(
                            function() {
                                alertService.add({
                                    id: "change-admin-pass-success",
                                    group: "adminPassword",
                                    type: "success",
                                    replace: true,
                                    message: LOCALE.maketext(
                                        "The system succesfully changed the [asis,WordPress] password for “[_1]”.",
                                        username
                                    ),
                                });
                            },
                            function(error) {
                                alertService.add({
                                    id: "change-admin-pass-error",
                                    group: "adminPassword",
                                    type: "danger",
                                    replace: true,
                                    message: LOCALE.maketext(
                                        "The system failed to change the [asis,WordPress] password for “[_1]” with the following error: [_2]",
                                        username,
                                        error
                                    ),
                                });
                            }
                        ).finally(
                            function() {
                                $scope.hideChangeAdminPassword();
                            }
                        );
                    };

                    /**
                     * Show the password field for the WordPress database. This field is hidden by
                     * default so that it's clear to the user that it doesn't need to be filled out
                     * when making any other changes.
                     *
                     * @method showChangeDbPassword
                     * @scope
                     */
                    $scope.showChangeDbPassword = function() {
                        alertService.clear(undefined, "dbPassword");
                        $scope.ui.showChangeDbPassword = true;
                    };

                    /**
                     * Hide the password field for the WordPress db.
                     * @method hideChangeDbPassword
                     * @scope
                     */
                    $scope.hideChangeDbPassword = function() {
                        $scope.ui.showChangeDbPassword = false;
                    };

                    /**
                     * Change the WordPress database password.
                     *
                     * @method changeDbPassword
                     * @scope
                     */
                    $scope.changeDbPassword = function(newPass) {

                        return instancesApi.changeDbPassword( $scope.site.id, newPass ).then(
                            function() {
                                alertService.add({
                                    id: "change-db-pass-success",
                                    group: "dbPassword",
                                    type: "success",
                                    replace: true,
                                    message: LOCALE.maketext("The system succesfully changed the [asis,WordPress] database user’s password."),
                                });
                            },
                            function(error) {
                                alertService.add({
                                    id: "change-db-pass-error",
                                    group: "dbPassword",
                                    type: "danger",
                                    replace: true,
                                    message: LOCALE.maketext("The system failed to change the [asis,WordPress] database password with the following error: [_1]", error),
                                });
                            }
                        ).finally(
                            function() {
                                $scope.hideChangeDbPassword();
                            }
                        );
                    };

                    /**
                     * Check if the current version is less than the available version.
                     * When the available version if greater then the current version, the
                     * method returns true, otherwise it returns false.
                     *
                     * @method isCurrentVersionOutOfDate
                     * @param  {Object}  site
                     * @param {String} [site.current_version]   Current version string.
                     * @param {String} [site.available_version] Available version string.
                     * @return {Boolean}  true when the current version needs to be updated.
                     */
                    $scope.isCurrentVersionOutOfDate = function(site) {
                        return site.available_version && site.current_version && compare(site.available_version, site.current_version) === 1;
                    };

                    /**
                     * Check if the site has a major upgrade available
                     *
                     * @method  hasMajorUpgrade
                     * @scope
                     * @param  {Object}  site Site information returned by the api.
                     * @return {Boolean}      true if the site has a major upgrade available, false otherwise.
                     */
                    $scope.hasMajorUpgrade = function(site) {
                        return CHECKS.isMajorUpgrade(site.current_version, site.available_version);
                    };

                    /**
                     * Check if the site has a minor upgrade available
                     *
                     * @method  hasMinorUpgrade
                     * @scope
                     * @param  {Object}  site Site information returned by the api.
                     * @return {Boolean}      true if the site has a major upgrade available, false otherwise.
                     */
                    $scope.hasMinorUpgrade = function(site) {
                        return CHECKS.isMinorUpgrade(site.current_version, site.available_version);
                    };

                    /**
                     * Check if the autoupdater will attempt to update an upgrade.
                     *
                     * @method  willCurrentVersionAutoUpdate
                     * @param  {Object} site Site information returned by the api.
                     * @return {Boolean}     true if the autoupdate is set to upgrade the specific upgrade.
                     */
                    $scope.willCurrentVersionAutoUpdate = function(site) {
                        var hasMajor = $scope.hasMajorUpgrade(site);
                        var hasMinor = $scope.hasMinorUpgrade(site);

                        if (hasMajor && site["autoupdate.core.major"]) {
                            return true;
                        } else if (hasMinor && site["autoupdate.core.minor"]) {
                            return true;
                        }
                        return false;
                    };

                    /**
                     * Whether or not to show the warning box about legacy instances getting updates through
                     * the cPAddons system rather than WordPress itself. In the common case, this will just
                     * be shown for legacy addons and hidden for non-legacy, but there is also a special case
                     * for legacy addons that have been tweaked to self-update. These ones should not show the
                     * warning.
                     *
                     * @method shouldShowLegacyUpdatesInfo
                     * @scope
                     * @param {Object}   site
                     * @param  {String}  site.addon_type One of: modern, legacy, other.
                     * @return {Boolean} True if the warning should be shown; false otherwise.
                     */
                    $scope.shouldShowLegacyUpdatesInfo = function(site) {
                        return site.addon_type === "legacy" && !site.autoupdate;
                    };

                    // Get the page bootstrapped.
                    _initializeScope();
                    _initializeView();
                }
            ]
        );

        return controller;
    }
);
