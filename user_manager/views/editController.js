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
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/services/alertService",
        "cjt/directives/spinnerDirective",
        "app/directives/issueList",
        "app/services/userService",
        "cjt/services/dataCacheService",
    ],
    function(angular, _, LOCALE, baseCtrlFactory) {

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "editController", [
                "$scope",
                "$route",
                "$routeParams",
                "$timeout",
                "$location",
                "$anchorScroll",
                "userService",
                "alertService",
                "spinnerAPI",
                "dataCache",
                "defaultInfo",
                "quotaInfo",
                "emailDaemonInfo",
                "ftpDaemonInfo",
                "webdiskDaemonInfo",
                "features",
                function(
                    $scope,
                    $route,
                    $routeParams,
                    $timeout,
                    $location,
                    $anchorScroll,
                    userService,
                    alertService,
                    spinnerAPI,
                    dataCache,
                    defaultInfo,
                    quotaInfo,
                    emailDaemonInfo,
                    ftpDaemonInfo,
                    webdiskDaemonInfo,
                    features
                ) {

                    var baseCtrl = baseCtrlFactory($scope, userService, emailDaemonInfo, ftpDaemonInfo, webdiskDaemonInfo, features, defaultInfo, quotaInfo, alertService);

                    /**
                     * Setup the scope for this controller.
                     *
                     * @method initializeScope
                     * @private
                     */
                    var initializeScope = function() {
                        baseCtrl.initializeScope();
                    };


                    /**
                     * Setup the view for this controller.
                     *
                     * @method initializeView
                     * @private
                     */
                    var initializeView = function() {
                        baseCtrl.initializeView();
                    };


                    initializeScope();
                    initializeView();

                    /**
                     * Toggle the service enabled state.
                     *
                     * @method  toggleService
                     * @scope
                     * @param  {Object} service Specific service state from the user.services collection containing:
                     *   @param  {Boolean} service.enabled True if enabled, false otherwise
                     */
                    $scope.toggleService = function(service) {
                        service.enabled = !service.enabled;
                    };

                    /**
                     * Update a user
                     *
                     * @method  updateUser
                     * @private
                     * @param  {Object} user
                     * @return {Promise}
                     */
                    function updateUser(user) {
                        spinnerAPI.start("loadingSpinner");
                        $scope.ui.isSaving = true;
                        return userService.edit(user).then(function(user) {

                            // Update the item in the list
                            var cachedUserList = dataCache.get("userList");
                            var loadFromCache = false;
                            if (cachedUserList) {
                                $scope.insertSubAndRemoveDupes(user, cachedUserList);
                                dataCache.set("userList", cachedUserList);
                                loadFromCache = true;
                            }
                            spinnerAPI.stop("loadingSpinner");
                            $scope.ui.isSaving = false;
                            $scope.loadView("list/rows", { loadFromCache: loadFromCache });
                            alertService.add({
                                type: "success",
                                message: LOCALE.maketext("The system successfully updated the following user: [_1]", user.full_username),
                                id: "updateUserSuccess",
                                autoClose: 10000
                            });
                        }, function(error) {
                            error = error.error || error;
                            alertService.clear();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system failed to update the “[_1]” user with the following error: [_2]", user.full_username, error),
                                id: "updateFailedErrorServer"
                            });
                            spinnerAPI.stop("loadingSpinner");
                            $scope.ui.isSaving = false;
                            $anchorScroll("top");
                        });
                    }

                    /**
                     * Promote a service into a user and update with the other changes
                     *
                     * @method updateService
                     * @private
                     * @param  {Object} user
                     * @return {Promise}
                     */
                    function updateService(user) {
                        spinnerAPI.start("loadingSpinner");
                        $scope.ui.isSaving = true;

                        if (!$scope.canPromote(user)) {

                            // Use the old APIs since it can't be promoted
                            return userService.editService(user, $scope.ui.originalService).then(function() {

                                // We don't get back the data from the old apis, so for now,
                                // just reload the whole lister from an ajax call.
                                $scope.loadView("list/rows", { loadFromCache: false });
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("The system successfully modified the service account: [_1]", user.full_username),
                                    id: "updateServiceSuccess",
                                    autoClose: 10000
                                });
                            }).catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system failed to modify the service account for “[_1]”: [_2]", user.full_username, error),
                                    id: "updateServiceFailed",
                                });
                                $anchorScroll("top");
                            }).finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                $scope.ui.isSaving = false;
                            });
                        } else {

                            // Promote to a subaccount with a forced link and then perform the update.
                            return userService.link(user, $scope.ui.originalServiceType, true).then(function(sub) {

                                // It should be a subaccount now. Save the updated user back to the userList.
                                var cachedUserList = dataCache.get("userList");
                                $scope.insertSubAndRemoveDupes(user, cachedUserList);
                                dataCache.set("userList", cachedUserList);

                                // Now stage the edits
                                user.type = "sub";
                                user.guid = sub.guid;
                                return updateUser(user);
                            }, function(error) {
                                alertService.clear();
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system failed to upgrade the “[_1]” service account to a [asis,subaccount] with the following error: [_2]", user.full_username, error),
                                    id: "updateFailedErrorServer"
                                });
                                $anchorScroll("top");
                            }).finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                $scope.ui.isSaving = false;
                            });
                        }
                    }

                    /**
                     * Update the user with the properties that have changed.
                     *
                     * @method  update
                     * @scope
                     * @param  {Object} user
                     * @return {Promise}
                     */
                    $scope.update = function(user) {
                        $anchorScroll("btn-save");

                        switch ($scope.mode) {
                            case "subaccount":
                                return updateUser(user);
                            case "service":
                                return updateService(user);
                            default:
                                alertService.clear();
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system did not recognize the update mode: [_1]", $scope.mode),
                                    id: "updateUnrecognizedMode"
                                });
                                return;
                        }
                    };

                    /**
                     * Test if there is an async server-side request running.
                     *
                     * @method isInProgress
                     * @return {Boolean} true if a request is being processed on the server. false otherwise.
                     */
                    $scope.isInProgress = function() {
                        return $scope.ui.isSaving || $scope.ui.isLoading;
                    };

                    /**
                     * Unlink the specific service from the user.
                     *
                     * @method unlinkService
                     * @param  {Object} user    Definition of the subaccount from which to unlink a service
                     * @param  {String} serviceType The name of the service to unlink
                     * @return {Promise}
                     */
                    $scope.unlinkService = function(user, serviceType) {
                        spinnerAPI.start("loadingSpinner");
                        $scope.ui.isSaving = true;

                        return userService.unlink(user, serviceType).then(function() {

                            // Invalidate the cache
                            dataCache.remove("userList");

                            // Load the subuser
                            return loadSubuser(user.guid).then(function() {
                                spinnerAPI.stop("loadingSpinner");
                                $scope.ui.isSaving = false;

                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("The system successfully unlinked the “[_1]” service.", serviceType),
                                    id: "unlinkServiceSuccess",
                                    autoClose: 10000
                                });
                            });
                        }, function(error) {
                            alertService.clear();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system failed to unlink the “[_1]” service with the following error: [_2]", serviceType, error),
                                id: "unlinkServiceFailed"
                            });
                            spinnerAPI.stop("loadingSpinner");
                            $scope.ui.isSaving = false;
                            $anchorScroll("top");
                        });
                    };

                    /**
                     * Check if this user is allowed to edit the service.  It should be allowed if:
                     *  1) The user can be promoted to a subaccount
                     *  2) The user cannot be promoted, but the service is already enabled
                     * Otherwise, it should not allow.
                     *
                     * @method  isAllowed
                     * @scope
                     * @param  {Object}  user
                     * @param  {Object}  service
                     * @return {Boolean}      true if the service can be edited, false otherwise.
                     */
                    $scope.isAllowed = function(user, service) {

                        // If you can promote, then all services are on the table.
                        // Otherwise, only the one currently enabled is allowed.
                        return $scope.canPromote(user) || service.enabled;
                    };

                    /**
                     * Check if we need to set the password to modify either enabled digest
                     * or enable webdisk service with digest.
                     *
                     * @method  _needsPassword
                     * @private
                     * @param  {Object} user            Current user
                     * @param  {Object} originalService Original webdisk configuration at load time in the editor.
                     * @return {Boolean}                true if we need to also set the password, false otherwise.
                     *
                     */
                    function _needsPassword(user, originalService) {
                        if ((user.type === "service" &&
                             ((originalService.enabled === false) ||
                              (originalService.enabledigest === false))) ||
                            (user.type === "sub" &&
                                ((originalService.enabled === false) ||
                                 (originalService.enabledigest === false)))) {

                            // ------------------------------------------------------------------
                            // TODO: The above condition makes you change your password more then
                            // should be required. Actually we need to see if the digest auth
                            // hash is stored for the sub-account, but we don't have that ability
                            // right now, so forcing all changes to require a password. Fix this
                            // in case LC-3185. It should be something like:
                            //
                            //    if ((user.type === "service" &&
                            //     originalService.enabledigest === false) ||
                            //    (user.type === "sub" && !user.has_digest_auth_hash &&
                            //        ( (originalService.enabled === false) ||
                            //          (originalService.enabledigest === false)))) {
                            //
                            // ------------------------------------------------------------------
                            return true;
                        } else {
                            return false;
                        }
                    }

                    /**
                     * Check if we can enable the digest controls.
                     *
                     * @method  canEnabledDigest
                     * @scope
                     * @param  {Object} user
                     * @return {Boolean} true if we can enable the digest auth checkbox, false otherwise.
                     */
                    $scope.canEnableDigest = function(user) {
                        if (_needsPassword(user, $scope.ui.originalServices["webdisk"])) {

                            // Password must be defined to enable the digest controls
                            // when using the older style api calls since we don't have
                            // a call for enabling/disabling digest without the password
                            // in these older style apis or if a service has been merged,
                            // but does not share the password with sub-account.
                            //
                            return user.password ? true : false;
                        } else {
                            return true;
                        }
                    };

                    /**
                     * Check if we should show the warning about requiring the password
                     * to enabled/disable digest auth.
                     *
                     * @method  showDigestRequiresPasswordWarning
                     * @scope
                     * @param  {Object} user
                     * @return {Boolean}     true if we should show the warning, false otherwise.
                     */
                    $scope.showDigestRequiresPasswordWarning = function(user) {
                        return _needsPassword(user, $scope.ui.originalServices["webdisk"]) &&
                               user.services["webdisk"].enabled;
                    };

                    /**
                     * Check to see if we should show the Unlink button for the service.
                     * @param  {Object} user      The subaccount for which the unlink would occur if permitted.
                     * @param  {Object} serviceType The service type being checked.
                     * @return {Boolean}          If true, show the Unlink button.
                     */
                    $scope.showUnlink = function(user, serviceType) {
                        return !user.synced_password &&
                               !user.services[serviceType].isNew &&
                               !user.services[serviceType].isCandidate;
                    };

                    /**
                     * Check if this user is allowed to turn on/off service.  It should be allowed if:
                     *  1) The user is of type sub
                     *  2) The user is of type service and has no siblings and has not been dismissed
                     * Otherwise, it should not allow.
                     *
                     * @method  canPromote
                     * @scope
                     * @param  {Object}  user
                     * @return {Boolean}      true if the service can toggled, false otherwise.
                     */
                    $scope.canPromote = function(user) {
                        if (user.type === "sub") {
                            return true;
                        } else if (user.type === "service") {
                            if (user.has_siblings ||     // If it has siblings the the user has not elected what to do with this service account yet, so it needs to be linked or dismissed first
                                user.sub_account_exists ) { // If it has an existing subaccount, then the account should remain independent now so you can not enable/disable the service as part of the service account, but must delete it instead to do this.
                                return false;
                            } else {
                                return true;
                            }
                        }
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

                    // Make sure that only orignal services are enabled if the
                    // passwords are not synced, since we can not add services
                    // unless they provide a password in this case.
                    $scope.$watch("ui.user.password", function(value) {
                        if (value === "" && !$scope.canAddServices($scope.ui.user)) {

                            // Restore services to their original enabled state
                            // since you must provide a password to enable them.
                            ["email", "ftp", "webdisk"].forEach(function(name) {
                                $scope.ui.user.services[name].enabled = $scope.ui.originalServices[name].enabled;
                            });
                        }
                    });

                    /**
                     * Test if we can add services.
                     *
                     * @method  canAddServices
                     * @scope
                     * @param  {Object} user
                     * @return {Boolean}     true if the user can add services, false otherwise
                     */
                    $scope.canAddServices = function(user) {
                        if (user.synced_password) {
                            return true;
                        } else {

                            // We must have a password to add services, and it will sync all them.
                            return !!user.password;
                        }
                    };

                    /**
                     * Load a sub user into the view
                     *
                     * @method loadSubuser
                     * @private
                     * @param  {String} guid Unique identifier
                     */
                    function loadSubuser(guid) {
                        if (!guid) {
                            alertService.clear();
                            alertService.add({
                                type: "warn",
                                message: LOCALE.maketext("You did not select a [asis,subaccount]."),
                                id: "missingUserWarning"
                            });
                            $scope.loadView("list/rows", { loadFromCache: true });
                        } else {
                            $scope.ui.isLoading = true;
                            $scope.ui.user = null;
                            spinnerAPI.start("loadingSpinner");
                            $scope.ui.user = userService.emptyUser();
                            return userService.fetchUser($routeParams.guid).then(
                                function(user) {
                                    $scope.ui.user = user;
                                    $scope.ui.originalServices = _.cloneDeep(user.services);

                                    // Set the service values to those from the candidates
                                    $scope.useCandidateServices(user, user);

                                    // The API doesn't consider the invitation status to be an issue, but we will
                                    // add it to the issue list for display purposes here on the edit screen.
                                    userService.addInvitationIssues(user);

                                    spinnerAPI.stop("loadingSpinner");
                                    $scope.ui.isLoading = false;
                                },
                                function(error) {
                                    alertService.clear();
                                    alertService.add({
                                        type: "warn",
                                        message: LOCALE.maketext("The system could not load the [asis,subaccount] with the following error: [_1]", error),
                                        id: "missingUserWarning"
                                    });
                                    $scope.loadView("list/rows", { loadFromCache: true });
                                });
                        }
                    }

                    /**
                     * Load the service by type and username
                     *
                     * @method loadService
                     * @private
                     * @param  {String} type         email|ftp|webdisk
                     * @param  {String} fullUsername <username>@<domain>
                     */
                    function loadService(type, fullUsername) {
                        if (!type || !fullUsername) {
                            alertService.clear();
                            alertService.add({
                                type: "warn",
                                message: LOCALE.maketext("You did not select a valid service account."),
                                id: "missingUserWarning"
                            });
                            $scope.loadView("list/rows", { loadFromCache: true });
                        } else {
                            $scope.ui.isLoading = true;
                            $scope.ui.user = null;
                            spinnerAPI.start("loadingSpinner");
                            $scope.ui.user = userService.emptyUser();

                            return userService.fetchService(type, fullUsername).then(
                                function(user) {
                                    $scope.ui.user = user;

                                    if ( type === "email" && user.services.email.quota === 0 && $scope.defaults.email.unlimitedValue !== 0 ) {
                                        user.services.email.quota = $scope.defaults.email.unlimitedValue;
                                    }

                                    $scope.ui.originalService = _.cloneDeep(user.services[type]);
                                    $scope.ui.originalServiceType = type;
                                    $scope.ui.originalServices = _.cloneDeep(user.services);
                                    $scope.ui.user.synced_password = true;
                                    spinnerAPI.stop("loadingSpinner");
                                    $scope.ui.isLoading = false;
                                },
                                function(error) {
                                    alertService.clear();
                                    alertService.add({
                                        type: "warn",
                                        message: LOCALE.maketext("The system could not load the service account with the following error: [_1]", error),
                                        id: "missingServiceWarning"
                                    });
                                    $scope.loadView("list/rows", { loadFromCache: true });
                                }).finally(function() {
                                if ($scope.ui.user && !$scope.canPromote($scope.ui.user)) {
                                    alertService.add({
                                        type: "warn",
                                        message: LOCALE.maketext("The system cannot upgrade this service account to a [asis,subaccount]. To access all the features within this interface, you must delete any accounts that share the same username or link this service account to a [asis,subaccount]."),
                                        id: "cannotPromoteWarning"
                                    });
                                }
                            });
                        }
                    }

                    /**
                     * Show the unsynced password warning if appropriate.
                     *
                     * @private
                     * @method showUnsyncedPasswordWarning
                     */
                    function showUnsyncedPasswordWarning() {
                        if (!$scope.ui.user.synced_password) {
                            alertService.add({
                                type: "warn",
                                message: LOCALE.maketext("You cannot enable additional services for this [asis,subaccount] until you set its password. When you set the password, all of your services will utilize the same password."),
                                id: "unsyncedPasswordWarning",
                                replace: false,
                                counter: false
                            });
                        }
                    }

                    /**
                     * Performs the link and dismiss operations on any merge candidate services
                     * that have been flagged with willLink or willDismiss.
                     *
                     * @method linkServices
                     * @param  {Object} user   The user whose candidate services will be processed.
                     */
                    $scope.linkServices = function(user) {
                        spinnerAPI.start("loadingSpinner");
                        $scope.ui.isSaving = true;

                        return userService.linkAndDismiss(user).then(function(result) {
                            var cachedUserList = dataCache.get("userList");
                            if (cachedUserList) {
                                $scope.insertSubAndRemoveDupes(result, cachedUserList);
                                dataCache.set("userList", cachedUserList);
                            }

                            $scope.ui.user.synced_password = result.synced_password;
                            result.linked_services.forEach(function(serviceName) {
                                $scope.ui.user.services[serviceName] = result.services[serviceName];
                                $scope.ui.originalServices[serviceName] = _.cloneDeep(result.services[serviceName]);
                            });
                            alertService.add({
                                type: "success",
                                message: result.synced_password ?
                                    LOCALE.maketext("The system successfully linked the service account to the “[_1]” user’s [asis,subaccount]. The service account passwords have not changed.", result.full_username) :
                                    LOCALE.maketext("The system successfully linked the service account to the “[_1]” user’s [asis,subaccount]. The service account passwords have not changed. You must provide a new password if you enable any additional [asis,subaccount] services.", result.full_username),
                                id: "link-user-success",
                                replace: false
                            });
                        }).catch(function(error) {
                            alertService.add({
                                type: "danger",
                                message: error.error ? error.error : error,
                                id: (error.call === "link") ? "link-error" : "link-and-dismiss-error"
                            });
                            $anchorScroll("top");
                        }).finally(function() {
                            $scope.ui.isSaving = false;
                            spinnerAPI.stop("loadingSpinner");
                        });
                    };


                    if (/^\/edit\/subaccount/.test($route.current.originalPath)) {
                        $scope.mode = "subaccount";
                        loadSubuser($routeParams.guid).finally(showUnsyncedPasswordWarning);
                    } else if (/^\/edit\/service/.test($route.current.originalPath)) {
                        $scope.mode = "service";
                        loadService($routeParams.type, $routeParams.user).finally(showUnsyncedPasswordWarning);
                    }
                }
            ]
        );

        return controller;
    }
);
