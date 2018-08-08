/*
# security/mod_security/views/domainlistController.js Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */
/* jshint -W100 */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/directives/disableAnimations",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/spinnerDirective",
        "cjt/directives/autoFocus",
        "cjt/directives/lastItem",
        "cjt/filters/wrapFilter",
        "cjt/filters/breakFilter",
        "cjt/services/dataCacheService",
        "app/directives/issueList",
        "app/directives/modelToLowerCase",
        "app/services/userService"
    ],
    function(angular, _, LOCALE) {

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "listController", [
                "$scope",
                "$routeParams",
                "$q",
                "$location",
                "$filter",
                "$timeout",
                "userService",
                "spinnerAPI",
                "alertService",
                "wrapFilter",
                "dataCache",
                "features",
                "quotaInfo",
                function(
                    $scope,
                    $routeParams,
                    $q,
                    $location,
                    $filter,
                    $timeout,
                    userService,
                    spinnerAPI,
                    alertService,
                    wrapFilter,
                    dataCache,
                    features,
                    quotaInfo
                ) {

                    /**
                     * Initialize the scope variables
                     *
                     * @private
                     * @method _initializeScope
                     */
                    var _initializeScope = function() {
                        $scope.showAdvancedSettings = false;
                        $scope.alerts = alertService.getAlerts();
                        $scope.isOverQuota = !quotaInfo.under_quota_overall;

                        $scope.openConfirmation = null;

                        $scope.advancedFilters = {
                            services: "all",
                            issues: "both",
                            showLinkable: true // Linkable service accounts shown in hypothetical users.
                        };

                        // Setup the installed bit...
                        $scope.hasFeature  = PAGE.hasFeature;

                        if (!$scope.hasFeature) {
                            return;
                        }

                        // setup data structures for the view
                        $scope.userList = [];
                        $scope.filteredUserList = [];
                        $scope.totalItems = 0;
                        $scope.meta = {
                            sortDirection: $routeParams.sortDirection || "asc",
                            sortBy: $routeParams.sortBy || "full_username",
                            sortType: $routeParams.sortType,

                            // NOTE: We don't want to use server side paging so, don't
                            // use these in the to the service layers list calls...
                            pageSize: $routeParams.pageSize || 50,
                            pageNumber: $routeParams.pageNumber || 1,
                            pageSizes: [10, 50, 100, 200],
                        };

                        $scope.features = features;

                        $scope.filteredTotalItems = 0;
                        $scope.filteredUsers = [];
                    };

                    /**
                     * Initialize the view
                     *
                     * @private
                     * @method _initializeView
                     */
                    var _initializeView = function() {
                        var results;

                        if ($scope.isOverQuota) {
                            alertService.clear();
                            alertService.add({
                                message: LOCALE.maketext("Your [asis,cPanel] account exceeds its disk quota. You cannot add or edit users."),
                                type: "danger",
                                id: "over-quota-warning",
                                replace: false,
                                counter: false
                            });
                        }

                        // check for page data in the template if this is a first load
                        if (app.firstLoad.userList && PAGE.userList) {
                            app.firstLoad.userList = false;
                            try {

                                // Repackage the prefetch data
                                results = userService.prepareList(PAGE.userList);

                                // Allow the original list to garbage collect since
                                // we have already got what we need from it.
                                PAGE.userList = null;

                                // Stash a reference to the full list for later
                                dataCache.set("userList", results.items);

                                // Save it in scope
                                $scope.userList = dataCache.get("userList");
                                $scope.totalItems = $scope.userList.length;
                            } catch (e) {
                                alertService.clear();
                                var errors = e;
                                if (!angular.isArray(errors)) {
                                    errors = [errors];
                                }
                                errors.forEach(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error.toString(),
                                        id: "fetchError"
                                    });
                                });
                            }
                        } else {

                            // Check to see if the other view asked to suppress the fetch (and if the cache is actually available).
                            if ($location.search().loadFromCache && ( $scope.userList = dataCache.get("userList") ) ) {
                                $scope.totalItems = $scope.userList.length;
                                $scope.filteredTotalItems = $scope.userList.length; // since no filter yet
                            } else {

                                // Otherwise, retrieve it via ajax
                                $scope.fetch(!$scope.advancedFilters.showLinkable);
                            }
                        }

                        $scope.filteredData = false;

                        // Run anything chained in a separate cycle so it does
                        // not hold up page drawing.
                        return $timeout(function() {
                            updateUI(true);
                        }, 5);
                    };

                    /**
                     * Generate the viewable list of users by processing all the filtering
                     * and sorting in an unobserved set of arrays.
                     *
                     * @private
                     * @method updateUI
                     * @param  {Boolean} shouldRunFilters   If true, the user's filters will be processed,
                     *                                      otherwise it's just pagination processing.
                     */
                    function updateUI(shouldRunFilters) {

                        if (!$scope.userList) {
                            return;
                        }

                        spinnerAPI.start("loadingSpinner");

                        // Run this in a separate cycle so the UI can actually start
                        // the spinner.
                        $timeout(function() {
                            $scope.totalItems = $scope.userList.length;

                            // First filter the records down to the ones needed for this view.
                            var filteredUsers;
                            if (!shouldRunFilters) {
                                if ($scope.filteredData) {
                                    filteredUsers = $scope.filteredUsers;
                                } else {
                                    filteredUsers = $scope.userList;
                                }
                            } else {
                                var filterFilter = $filter("filter");
                                filteredUsers = filterFilter($scope.userList, $scope.filterText);
                                filteredUsers = filterFilter(filteredUsers, $scope.filterAdvanced);
                                $scope.filteredData = true;
                            }

                            // Now calculate the pagination
                            var startIndex = $scope.meta.pageSize * ($scope.meta.pageNumber - 1);
                            var endIndex   = ($scope.meta.pageSize * $scope.meta.pageNumber);
                            var lastPage   = false;
                            if (endIndex > filteredUsers.length) {
                                lastPage = true;
                            }

                            // Now attach to the view
                            $scope.filteredTotalItems = filteredUsers.length;
                            $scope.filteredUsers = filteredUsers;

                            if (filteredUsers.length < $scope.meta.pageSize) {
                                $scope.pagedFilteredUser = filteredUsers;
                            } else {
                                if (!lastPage) {

                                    // Just the page we are looking for
                                    $scope.pagedFilteredUser = filteredUsers.slice(startIndex, endIndex);
                                } else {

                                    // Everything else
                                    $scope.pagedFilteredUser = filteredUsers.slice(startIndex);
                                }
                            }

                            var lastPageTotalItems = $scope.pageTotalItems;
                            $scope.pageTotalItems = filteredUsers.length;
                            if ($scope.pageTotalItems === 0 ||                  // No records
                                lastPageTotalItems === filteredUsers.length) {  // No change in count
                                spinnerAPI.stop("loadingSpinner");
                            }

                            // Hide the initial loading panel if its still showing
                            $scope.hideViewLoadingPanel();
                        }, 5);
                    }

                    /**
                     * Called when the last row is inserted to stop the loading spinner
                     *
                     * @scope
                     * @method doneRendering
                     * @param  {Object} user Just for debugging
                     */
                    $scope.doneRendering = function(user) {
                        spinnerAPI.stop("loadingSpinner");
                    };

                    /**
                     * Navigate to the edit screen for the specified user or service
                     *
                     * @scope
                     * @method edit
                     * @param  {Object} user
                     */
                    $scope.edit = function(user) {
                        if ($scope.isOverQuota) {
                            return false;
                        }

                        if (user.type === "sub") {
                            $scope.loadView("edit/subaccount/" + user.guid, {}, { clearAlerts: true });
                        } else if (user.type === "service") {
                            var serviceType;
                            if (user.services.email && user.services.email.enabled) {
                                serviceType = "email";
                            } else if (user.services.ftp && user.services.ftp.enabled) {
                                serviceType = "ftp";
                            } else if (user.services.webdisk &&  user.services.webdisk.enabled) {
                                serviceType = "webdisk";
                            } else {
                                alertService.clear();
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The service account is invalid."),
                                    id: "errorServiceAccountNotValid"
                                });
                                return;
                            }
                            $scope.loadView("edit/service/" + serviceType + "/" + user.full_username, {}, { clearAlerts: true });
                        } else {
                            alertService.clear();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("You cannot edit the account."),
                                id: "errorAccountNotValid"
                            });
                            return;
                        }
                    };


                    /**
                     * Filter method to test if the user should be filtered by a string value.
                     *
                     * @scope
                     * @method filterText
                     * @param  {Object} user
                     * @return {Boolean}      true if the user should be shown, false otherwise.
                     */
                    $scope.filterText = function(user) {
                        if (!$scope.meta.filterValue) {
                            return true;
                        }

                        return [
                            "full_username",
                            "real_name",
                            "alternate_email",
                            "type",
                            "typeLabel",
                            "serviceSearch"
                        ].some(function(key) {
                            var propVal = user[key];
                            if (propVal && propVal.toLocaleLowerCase().indexOf($scope.meta.filterValue) !== -1) {
                                return true;
                            }
                        });
                    };

                    /**
                     * Test if there is an active advanced search.
                     *
                     * @scope
                     * @method hasAdvancedSearch
                     * @return {Boolean} true if there is an advanced search option
                     *                        selected, false otherwise.
                     */
                    $scope.hasAdvancedSearch = function() {
                        if ($scope.advancedFilters.services !== "all" ||
                            $scope.advancedFilters.issues !== "both") {
                            return true;
                        } else {
                            return false;
                        }
                    };


                    /**
                     * Filter method to test if the user should be filtered based on the various
                     * advanced search options.
                     *
                     * @scope
                     * @method filterAdvanced
                     * @param  {Object} user
                     * @return {Boolean}      true if the user should be shown, false otherwise.
                     */
                    $scope.filterAdvanced = function(user) {

                        /**
                         * Filter the merge candidates the same way we filter them in the UI.
                         *
                         * @private
                         * @method areMergeCandidatesVisible
                         * @param  {Object} user [description]
                         * @return {Boolean}     true if there are merge candidates visible, false otherwise.
                         */
                        var areMergeCandidatesVisible = function(user) {
                            var list = user.merge_candidates;
                            if ($scope.meta.filterValue) {
                                list = $filter("filter")(list, $scope.filterText);
                            }
                            list = $filter("filter")(list, $scope.filterAdvanced);
                            return !!list.length;
                        };

                        if ($scope.advancedFilters.issues === "noissues") {
                            switch (user.type) {
                                case "hypothetical":
                                    if (!areMergeCandidatesVisible(user)) {
                                        return false;
                                    } else if (user.candidate_issues_count === user.merge_candidates.length) {

                                    // Only hide this if the number of services and number of
                                    // single service merge candidates are the same.
                                        return false;
                                    }
                                    break;
                                case "sub":
                                    if (user.issues.length > 0 ||
                                    user.has_expired_invite ||
                                    (areMergeCandidatesVisible(user) && user.candidate_issues_count)) {
                                        return false;
                                    }
                                    break;
                                default:
                                    if (user.issues.length > 0) {
                                        return false;
                                    }
                            }
                        }

                        if ($scope.advancedFilters.issues === "issues") {

                            switch (user.type) {
                                case "hypothetical":

                                    if (!areMergeCandidatesVisible(user)) {
                                        return false;
                                    } else if (!user.candidate_issues_count) {
                                        return false;
                                    }
                                    break;
                                case "sub":
                                    if (user.issues.length === 0 &&
                                    !user.has_expired_invite &&
                                    (!areMergeCandidatesVisible(user) || !user.candidate_issues_count)) {
                                        return false;
                                    }
                                    break;
                                default:
                                    if (user.issues.length === 0) {
                                        return false;
                                    }
                            }
                        }

                        if ($scope.advancedFilters.services === "all") {
                            return true;
                        }

                        if ($scope.advancedFilters.services === "email" &&
                            (user.services.email.enabled || user.services.email.enabledInCandidate)) {
                            return true;
                        }

                        if ($scope.advancedFilters.services === "ftp" &&
                            (user.services.ftp.enabled || user.services.ftp.enabledInCandidate)) {
                            return true;
                        }

                        if ($scope.advancedFilters.services === "webdisk" &&
                            (user.services.webdisk.enabled || user.services.webdisk.enabledInCandidate)) {
                            return true;
                        }

                        return false;
                    };

                    /**
                     * Sort the list of sub-accounts and service accounts
                     *
                     * @scope
                     * @method sortList
                     * @param {Object} meta             An object with metadata properties of sortBy, sortDirection, and sortType.
                     * @param {Boolean} [defaultSort]   If true, this sort was not initiated by the user.
                     */
                    $scope.sortList = function(meta, defaultSort) {

                        // clear the selected row
                        $scope.selectedRow = -1;

                        if (!defaultSort) {
                            var flat = !$scope.advancedFilters.showLinkable;
                            $scope.fetch(flat);
                        }
                    };

                    /**
                     * Clears the search term when the Esc key
                     * is pressed.
                     *
                     * @scope
                     * @method triggerClearSearch
                     * @param {Event} event - The event object
                     */
                    $scope.triggerClearSearch = function(event) {
                        if (event.keyCode === 27) {
                            $scope.clearSearch();
                        }
                    };

                    /**
                     * Clears the search term
                     *
                     * @scope
                     * @method clearSearch
                     */
                    $scope.clearSearch = function() {
                        $scope.meta.filterValue = "";
                    };

                    /**
                     * Fetch the list of sub-accounts and service accounts from the server.
                     *
                     * @scope
                     * @method fetch
                     * @return {Promise} Promise that when fulfilled will result in the list being loaded with the new criteria.
                     */
                    $scope.fetch = function() {

                        // Setup the view for a full reload
                        $scope.filteredUsers = [];
                        $scope.filteredData = false;
                        $scope.showViewLoadingPanel();

                        // Start the load
                        var flat = !$scope.advancedFilters.showLinkable;
                        spinnerAPI.start("loadingSpinner");
                        return userService
                            .fetchList(flat, $scope.meta)
                            .then(function(results) {
                                dataCache.set("userList", results.items);
                                $scope.userList = dataCache.get("userList");
                                $scope.totalItems = $scope.userList.length;
                                $scope.pageNumber = 1;
                                updateUI(true);
                            }, function(error) {

                                // failure
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "fetchError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Show the delete confirm dialog for a user.
                     *
                     * @scope
                     * @method showDeleteConfirm
                     * @param  {Object} user
                     */
                    $scope.showDeleteConfirm = function(user) {
                        user.ui.showDeleteConfirm = true;
                    };

                    /**
                     * Hide the delete confirm dialog for a user.
                     *
                     * @scope
                     * @method hideDeleteConfirm
                     * @param  {Object} user
                     */
                    $scope.hideDeleteConfirm = function(user) {
                        user.ui.showDeleteConfirm = false;
                    };

                    /**
                     * Check if we should show the delete confirm dialog for a specific user

                     * @scope
                     * @method canShowDeleteConfirm
                     * @param  {Object} user
                     * @return {Boolean}      true if it should show, false otherwise.
                     */
                    $scope.canShowDeleteConfirm = function(user) {
                        return user.ui.showDeleteConfirm;
                    };

                    /**
                     * Check if a delete operation is underway for the passed user.
                     *
                     * @scope
                     * @method isDeleting
                     * @param  {Object}  user
                     * @return {Boolean}      true if a delete operation is running, false otherwise.
                     */
                    $scope.isDeleting = function(user) {
                        return user.ui.deleting;
                    };

                    /**
                     * Delete a user
                     * @param  {Object} user       The user to delete.
                     * @param  {Object} [parent]   The parent user, if there is one.
                     * @return {Promise}           When resolved, the user has been deleted.
                     */
                    $scope.deleteUser = function(user, parent) {
                        spinnerAPI.start("loadingSpinner");
                        user.ui.deleting = true;
                        return userService
                            .delete(user)
                            .then(function(results) {
                                var collection = parent ? parent.merge_candidates : $scope.userList;
                                var pos = collection.indexOf(user);
                                if (pos !== -1) {
                                    if (results.data) { // delete_user returns a replacement back when appropriate
                                        collection.splice(pos, 1, results.data);
                                    } else {
                                        collection.splice(pos, 1); // service deletes don't return anything

                                        /* If all we have left is a hypothetical account with one merge candidate,
                                         * get rid of the hypothetical account and replace it with that remaining
                                         * service account. This is the same behavior we have with dismisses. */
                                        if (parent && parent.type === "hypothetical" && parent.merge_candidates.length === 1) {
                                            var parentPos = $scope.userList.indexOf(parent);
                                            if (parentPos !== -1) {
                                                $scope.userList.splice(parentPos, 1, parent.merge_candidates.pop());
                                            }
                                        }
                                    }

                                    // update the caches
                                    dataCache.set("userList", $scope.userList);

                                    updateUI(true);
                                }
                            }, function(error) {

                                // failure
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "deleteError"
                                });
                            })
                            .finally(function() {
                                user.ui.deleting = false;
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Helper method to add the rendering text around the full username
                     * for the delete query.
                     *
                     * @note This may have been easier if we published maketext as a method on the   ## no extract maketext
                     * controller and then you could do something like:
                     *   <span>{{maketext("Do you wish to remove the “[_1]” user from your system?", user.full_username | wrap:[@.]:10)}}
                     *
                     * @scope
                     * @method wrappedDeleteText
                     * @param  {Object} user
                     * @return {String}
                     */
                    $scope.wrappedDeleteText = function(user) {
                        var wbrText = wrapFilter(user.full_username, "[@.]", 5);
                        return LOCALE.maketext("Do you wish to remove the “[_1]” user from your system?", wbrText);
                    };

                    /**
                     * Given a merge candidate, links it to a sub-account of the same name.
                     *
                     * @scope
                     * @method  linkUser
                     * @param  {Object} user    The service account to link.
                     * @param  {Object} parent  The sub-account (real or hypothetical) to which the service account is being linked.
                     * @return {Promise}
                     */
                    $scope.linkUser = function(user, parent) {
                        spinnerAPI.start("loadingSpinner");
                        user.ui.linking = true;
                        _buildLinkingCaches(user, parent);

                        return userService
                            .link(user)
                            .then(function(results) {

                                var collection = $scope.userList;
                                var pos = collection.indexOf(parent);
                                if (pos !== -1) {

                                    /* The link operation gives us back the entire parent account record, including any
                                     * remaining merge candidates. We just need to splice it back into the list at
                                     * the appropriate spot. */
                                    collection.splice(pos, 1, results);

                                    // Update the cache
                                    dataCache.set("userList", collection);

                                    // Update the UI
                                    updateUI(true);

                                    alertService.add({
                                        type: "success",
                                        message: results.synced_password ?
                                            LOCALE.maketext("The system successfully linked the service account to the “[_1]” user’s [asis,subaccount]. The service account passwords have not changed.", results.full_username) :
                                            LOCALE.maketext("The system successfully linked the service account to the “[_1]” user’s [asis,subaccount]. The service account passwords did not change. You must provide a new password if you wish to enable any additional [asis,subaccount] services.", results.full_username),
                                        id: "link-user-success",
                                        replace: false
                                    });
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "linkError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                user.ui.linking = false;
                                _buildLinkingCaches(user, parent);
                            });
                    };


                    /**
                     * Given a merge candidate, dismisses it from the merge candidate list.
                     *
                     * @scope
                     * @method  dismissLink
                     * @param  {Object} user    The service account to dismiss.
                     * @param  {Object} parent  The sub-account (real or hypothetical) to which the service account would have been linked.
                     * @return {Promise}
                     */
                    $scope.dismissLink = function(user, parent) {
                        spinnerAPI.start("loadingSpinner");
                        user.ui.linking = true;
                        _buildLinkingCaches(user, parent);

                        return userService
                            .dismissLink(user)
                            .then(function(results) {

                                var collection = $scope.userList;
                                var pos = collection.indexOf(parent);
                                var mergeCandidatePosition = collection[pos].merge_candidates.indexOf(user);
                                if (mergeCandidatePosition !== -1) {

                                    /* Pull the service account out of the merge candidates section and move it up to the top level of the user list. */
                                    var formerMergeCandidate = collection[pos].merge_candidates[mergeCandidatePosition];
                                    collection[pos].merge_candidates.splice(mergeCandidatePosition, 1);
                                    _insert(collection, formerMergeCandidate);

                                    /* If, after the last dismiss, there is only one merge candidate left, and it is being shown as a
                                     * merge candidate for a hypothetical sub-account, move it out to the top level too. This is a
                                     * special case for hypothetical sub-accounts because we wouldn't normally show a single service
                                     * account as a merge candidate unless the corresponding sub-account already existed. */
                                    if ("hypothetical" === collection[pos].type && collection[pos].merge_candidates.length === 1) {
                                        var finalMergeCandidate = collection[pos].merge_candidates.pop();
                                        _insert(collection, finalMergeCandidate);
                                        collection.splice(pos, 1); // remove the hypothetical sub-account too
                                    }

                                    // Update the cache
                                    dataCache.set("userList", collection);

                                    // Update the UI
                                    updateUI(true);
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "dismissError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                user.ui.linking = false;
                                _buildLinkingCaches(user, parent);
                            });
                    };

                    /**
                     * Insert the user in the correct position in the collection.
                     *
                     * @private
                     * @method  _insert
                     * @param  {Array} collection
                     * @param  {Object} newUser
                     */
                    var _insert = function(collection, newUser) {
                        for (var i = 0, l = collection.length; i < l; i++) {
                            var user = collection[i];
                            if (user.full_username > newUser.full_username) {
                                collection.splice(i, 0, newUser);
                                return;
                            }
                        }

                        // It needs to go at the end of the list
                        collection.push(newUser);
                    };

                    /**
                     * Given a sub-account (real or hypothetical), link all available merge candidates.
                     *
                     * @scope
                     * @method  linkAll
                     * @param  {Object} parent    The sub-account.
                     * @return {Promise}
                     */
                    $scope.linkAll = function(parent) {
                        spinnerAPI.start("loadingSpinner");

                        parent.ui.linkingAny = parent.ui.linkingAll = true;

                        return userService
                            .linkAll(parent)
                            .then(function(results) {

                                var collection = $scope.userList;
                                var pos = collection.indexOf(parent);
                                if (pos !== -1) {
                                    collection.splice(pos, 1, results);

                                    // Update the cache
                                    dataCache.set("userList", collection);

                                    // Update the UI
                                    updateUI(true);
                                }

                                alertService.add({
                                    type: "success",
                                    message: results.synced_password ?
                                        LOCALE.maketext("The system successfully linked all of the service accounts for the “[_1]” user to the [asis,subaccount]. The service account passwords did not change.", results.full_username) :
                                        LOCALE.maketext("The system successfully linked all of the service accounts for the “[_1]” user to the [asis,subaccount]. The service account passwords did not change. You must provide a new password if you wish to enable any additional [asis,subaccount] services.", results.full_username),
                                    id: "link-all-success",
                                    replace: false
                                });
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "dismissError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                parent.ui.linkingAny = parent.ui.linkingAll = false;
                            });

                    };

                    /**
                     * Given a sub-account (real or hypothetical), dismiss all available merge candidates.
                     *
                     * @scope
                     * @method dismissAll
                     * @param  {Object} parent    The sub-account.
                     * @return {Promise}
                     */
                    $scope.dismissAll = function(parent) {
                        spinnerAPI.start("loadingSpinner");

                        parent.ui.linkingAny = parent.ui.linkingAll = true;

                        return userService
                            .dismissAll(parent)
                            .then(function(results) {
                                var collection = $scope.userList;
                                var pos = collection.indexOf(parent);
                                if (pos !== -1) {

                                    /* Pull everything out of the merge candidates section and put it at the top level of the user list. */
                                    var serviceAccount = collection[pos].merge_candidates.shift();
                                    while ( serviceAccount ) {
                                        _insert(collection, serviceAccount);
                                        serviceAccount = collection[pos].merge_candidates.shift();
                                    }

                                    /* If the sub-account didn't already exist, stop displaying the placeholder now that the merge candidates are gone. */
                                    if ("hypothetical" === parent.type) {
                                        collection.splice(pos, 1);
                                    }

                                    // Update the cache
                                    dataCache.set("userList", collection);

                                    // Update the UI
                                    updateUI(true);
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "linkError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                parent.ui.linkingAny = parent.ui.linkingAll = false;
                            });

                    };

                    /**
                     * Build the helpers state for linking and dismissing
                     *
                     * @private
                     * @method _buildLinkingCaches
                     * @param  {Object} user
                     * @param  {Object} parent
                     */
                    var _buildLinkingCaches = function(user, parent) {
                        parent.ui.linkingAll = true;
                        parent.ui.linkingAny = false;
                        for (var i = 0, l = parent.merge_candidates.length; i < l; i++) {
                            if (parent.merge_candidates[i].ui.linking) {
                                parent.ui.linkingAny = true;
                            } else {
                                parent.ui.linkingAll = false;
                            }
                        }
                    };

                    // Get the page bootstrapped. Moved before the watchers to try to get the page to load faster
                    _initializeScope();
                    _initializeView().finally(function() {

                        /**
                         * Set up the watchers that facilitate caching for the filteredUserList
                         */
                        $scope.$watchGroup([
                            "meta.filterValue",
                            "advancedFilters.services",
                            "advancedFilters.issues"
                        ], function(newVals, oldVals) {
                            updateUI(true);
                        });

                        $scope.$watchGroup([
                            "meta.pageSize",
                            "meta.pageNumber"
                        ], function(newVals, oldVals) {
                            updateUI();
                        });
                    });


                }
            ]
        );

        return controller;
    }
);
