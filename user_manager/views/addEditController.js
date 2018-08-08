/*
# user_manager/views/addEditController.js         Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/validator/email-validator",
        "cjt/directives/validationItemDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validateEqualsDirective",
        "cjt/directives/passwordFieldDirective",
        "cjt/directives/actionButtonDirective",
        "app/directives/validateUsernameWithDomain",
        "app/directives/emailServiceConfig",
        "app/directives/ftpServiceConfig",
        "app/directives/webdiskServiceConfig",
        "uiBootstrap"
    ],
    function(angular, _, LOCALE) {

        var DEFAULT_PASSWORD_STRENGTH = 10; // Out of 100

        // Retrieve the current application
        var app = angular.module("App");

        // This will be returned by RequireJS for use in other controllers
        var factory = function($scope, userService, emailDaemonInfo, ftpDaemonInfo, webdiskDaemonInfo, features, defaultInfo, quotaInfo, alertService) {

            // Setup the base controller
            var controller = {

                /**
                 * Initialize the common scope variables
                 *
                 * @protected
                 * @method initializeScope
                 */
                initializeScope: function() {
                    $scope.ui = {
                        docrootByDomain: PAGE.docrootByDomain,
                        domainList: Object.keys(PAGE.docrootByDomain),
                        user: userService.emptyUser()
                    };

                    $scope.isOverQuota = !quotaInfo.under_quota_overall;
                    $scope.ui.user.domain = PAGE.primaryDomain; // TODO: Add nvdata here for last selected domain, fallback to primaryDomain
                    $scope.ui.user.services.ftp.homedir     = PAGE.docrootByDomain[PAGE.primaryDomain] + "/";
                    $scope.ui.user.services.webdisk.homedir = PAGE.docrootByDomain[PAGE.primaryDomain] + "/";

                    $scope.inProgress = false;
                    $scope.minimumPasswordStrength = angular.isDefined(PAGE.minimumPasswordStrength) ? parseInt(PAGE.minimumPasswordStrength, 10) : DEFAULT_PASSWORD_STRENGTH;

                    $scope.emailDaemon = emailDaemonInfo;
                    $scope.ftpDaemon = ftpDaemonInfo;
                    $scope.webdiskDaemon = webdiskDaemonInfo;

                    $scope.features = features;
                    $scope.defaults = defaultInfo;
                    $scope.quotaInfo = quotaInfo;

                    $scope.useCandidateServices = this.useCandidateServices;
                    $scope.insertSubAndRemoveDupes = this.insertSubAndRemoveDupes;
                },

                /**
                 * Initialize the common view stuff
                 *
                 * @protected
                 * @method initializeView
                 */
                initializeView: function() {
                    alertService.clear();
                    this.showCpanelOverQuotaWarning();
                },

                /**
                 * Call this when this view is loaded first and a new record is
                 * created that does not appear in the prefetch data.
                 *
                 * @protected
                 * @method clearPrefetch
                 */
                clearPrefetch: function() {
                    app.firstLoad.userList = false;
                },

                /**
                 * Update the view model's service object with the candidate service information from a user
                 * object (either another or itself).
                 *
                 * @method useCandidateServices
                 * @param {Object} destUser   The user model to update.
                 * @param {Object} srcUser    The source user model that contains the candidate_services
                 *                            that will be integrated into the destUser.
                 */
                useCandidateServices: function(destUser, srcUser) {
                    userService.integrateCandidateServices(destUser, srcUser);
                },

                /**
                 * Inserts a subaccount and any of its dismissed service accounts into a user list and removes
                 * any duplicates it might find. This works off of the premise that you can only ever have one
                 * instance of a service account per username/domain.
                 *
                 * @method insertSubAndRemoveDupes
                 * @param  {Object} newUser   The user to insert. It can be a duplicate of one in the userList
                 *                            because it will ultimately just replace the old one.
                 * @param  {Array} userList   The list of user objects into which newUser will be inserted.
                 */
                insertSubAndRemoveDupes: function(newUser, userList) {
                    var startingIndex = _.sortedIndexBy(userList, newUser, "full_username");

                    // Get a list of all services that are enabled on the latest version of the subaccount.
                    var enabledServices = [];

                    angular.forEach(newUser.services, function(service, serviceName) {
                        if (service.enabled) {
                            enabledServices.push(serviceName);
                        }
                    });

                    // Also include any services that are enabled in dismissed service accounts since we'll
                    // be inserting them as well.
                    if (newUser.dismissed_merge_candidates) {
                        newUser.dismissed_merge_candidates.forEach(function(serviceAccount) {
                            enabledServices.push(serviceAccount.service);
                        });
                    }

                    // Loop over all users in the userList with the same full_username and remove if they
                    // have the same services enabled or if they aren't a service account (ex. hypotheticals
                    // or a previous version of the subaccount).
                    var index = startingIndex;
                    var splice, user, serviceName;
                    while (userList[index] && userList[index].full_username === newUser.full_username) {
                        user = userList[index];

                        if (user.type !== "service") {
                            splice = true;
                        } else {

                            // Loop over the service names that are enabled in newUser. If any of those services
                            // are enabled on the current user in the list, mark it for splicing. Also mark it if
                            // it's not a service account, because service accounts are the only type of account
                            // that can co-exist with newUser in the userList.
                            for (var esi = 0, esl = enabledServices.length; esi < esl; esi++) {
                                serviceName = enabledServices[esi];

                                if (user.services[serviceName].enabled) {
                                    splice = true;
                                    break;
                                }
                            }
                        }

                        if (splice) {
                            userList.splice(index, 1);
                        } else {
                            index++;
                        }
                    }

                    // Finally, splice in newUser and the dismissed users.
                    var usersToInsert = userService.expandDismissed(newUser);
                    userList.splice.apply(userList, [startingIndex, 0].concat(usersToInsert));
                },

                /**
                 * Shows a dire warning if the cPanel account is over quota.
                 *
                 * @method showCpanelOverQuotaWarning
                 */
                showCpanelOverQuotaWarning: function() {
                    if ($scope.isOverQuota) {
                        alertService.add({
                            message: LOCALE.maketext("Your [asis,cPanel] account exceeds its disk quota. You cannot add or edit users."),
                            type: "danger",
                            id: "over-quota-warning",
                            replace: false,
                            counter: false
                        });
                    }
                }

            };

            return controller;

        };

        return factory;
    }
);
