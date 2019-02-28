/*
# email_accounts/views/list.js                       Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, PAGE */

define(
    [
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/pageSizeButtonDirective",
        "app/services/emailAccountsService",
        "cjt/directives/statsDirective",
        "cjt/directives/indeterminateState",
        "app/decorators/paginationDecorator",
        "cjt/directives/disableAnimations"
    ],
    function(_, angular, LOCALE) {
        "use strict";

        var app;
        try {
            app = angular.module("cpanel.emailAccounts");
        } catch (e) {
            app = angular.module("cpanel.emailAccounts", []);
        }

        app.value("PAGE", PAGE);

        /**
         * List Controller for Email
         *
         * @module ListController
         */
        var controller = app.controller(
            "ListController",
            [
                "$scope",
                "$location",
                "emailAccountsService",
                "PAGE",
                "alertService",
                "$timeout",
                "$routeParams",
                "$window",
                "componentSettingSaverService",
                "ONE_MEBIBYTE",
                function(
                    $scope,
                    $location,
                    emailAccountsService,
                    PAGE,
                    alertService,
                    $timeout,
                    $routeParams,
                    $window,
                    componentSettingSaverService,
                    ONE_MEBIBYTE
                ) {

                    var emailAccounts = this;

                    emailAccounts.isRTL = PAGE.isRTL;
                    emailAccounts.statsCssClass = "hide-stats";
                    emailAccountsService.getEmailStats().then(function(response) {
                        $scope.accountStats = response;
                        emailAccounts.statsCssClass = "animate-stats";
                    });

                    $scope.upgradeLink = emailAccountsService.getUpgradeUrl();

                    /**
                     * Redirects to create view
                     * @method createEmail
                     */
                    emailAccounts.createEmail = function() {
                        $location.path("/create");
                    };

                    var COMPONENT_NAME = "EmailAccountsTable";

                    var storageKeys = {
                        filter: "EmailAccountsListFilter",
                        currentPage: "EmailAccountsListCurrentPage",
                        quickFilter: "EmailAccountsListQuickFilter"
                    };

                    if (app.firstLoad) {

                        // clear local storage
                        _.forOwn(storageKeys, function(value) {
                            localStorage.removeItem(value);
                        } );
                    }

                    var MAX_NAME_WIDTH = 200;
                    var DEFAULT_TIMEOUT = 250;

                    emailAccounts.webmailEnabled = PAGE.webmailEnabled;
                    emailAccounts.dprefix = PAGE.dprefix;

                    emailAccounts.loadingEmailAccounts = false;
                    emailAccounts.filterTermPending = true;

                    emailAccounts.storageKeys = storageKeys;

                    emailAccounts.meta = {

                        // sort settings
                        sortReverse: false,
                        sortBy: "user",
                        sortDirection: "asc",
                        sortFields: ["user", "domain", "has_suspended", "_diskused", "_diskquota", "diskusedpercent_float"],

                        // pager settings
                        showPager: false,
                        maxPages: 5,
                        totalItems: 0,
                        currentPage: 1,
                        pageSizes: [20, 50, 100, 500],
                        pageSize: 20,
                        start: 0,
                        limit: 10
                    };

                    emailAccounts.multiDeleteSelected = false;
                    emailAccounts.checkedCount = 0;
                    emailAccounts.selectAllState = false;
                    var selectedItems = {};

                    var storageFilterValue = localStorage.getItem(emailAccounts.storageKeys.filter);
                    if ( storageFilterValue && (0 === storageFilterValue.indexOf(PAGE.securityToken + ":")) ) {
                        emailAccounts.meta.filterValue = storageFilterValue.substr( 1 + PAGE.securityToken.length );
                    } else {
                        emailAccounts.meta.filterValue = "";
                    }


                    var storageQuickFilterValue = localStorage.getItem(emailAccounts.storageKeys.quickFilter);
                    if ( storageQuickFilterValue && (0 === storageQuickFilterValue.indexOf(PAGE.securityToken + ":")) ) {
                        emailAccounts.quickFilter = storageQuickFilterValue.substr( 1 + PAGE.securityToken.length );
                    } else {
                        emailAccounts.quickFilter = "all";
                    }

                    var storageCurrentPageValue = localStorage.getItem(emailAccounts.storageKeys.currentPage);
                    if (storageCurrentPageValue && (0 === storageCurrentPageValue.indexOf(PAGE.securityToken + ":")) ) {
                        emailAccounts.meta.currentPage = storageCurrentPageValue.substr( 1 + PAGE.securityToken.length );
                    } else {
                        emailAccounts.meta.currentPage = 1;
                    }

                    if ( $routeParams.account && $routeParams.account !== emailAccounts.meta.filterValue ) {
                        emailAccounts.meta.filterValue = $routeParams.account;
                        emailAccounts.meta.accounts = undefined;
                    }

                    /**
                     * Clears selected state
                     *
                     * @method clearSelectedState
                     */
                    function clearSelectedState() {
                        emailAccounts.selectAllState = false;
                        emailAccounts.checkedCount = 0;
                        emailAccounts.multiDeleteSelected = false;
                    }

                    /**
                     * Helps decide to show or hide email in the expanded view based on email account length
                     * @method showInnerEmail
                     * @param {string} email
                     * @returns {Boolean}
                     */
                    function showInnerEmail(email) {
                        var el = document.getElementById("account-name_" + email);
                        if (el) {
                            var width = $window.getComputedStyle(el).width;

                            if (width) {
                                width = width.slice(0, -2);
                                return width >= MAX_NAME_WIDTH;
                            }
                        }

                        return true;
                    }

                    /**
                     * Updates locale storage
                     *
                     * @method updateLocalStorage
                     * @param {string} key
                     * @param {string} value
                     */
                    function updateLocalStorage(key, value) {
                        localStorage.setItem(
                            emailAccounts.storageKeys[key],
                            PAGE.securityToken + ":" + value
                        );
                    }

                    /**
                     * Sets the sort, paginiation, and page size settings based on the provided object
                     * @method setMetaFromComponentSettings
                     * @param  {Object} settings An object containing the settings
                     *  {
                     *      sortBy:        A string indicating which field to sort by, must be one of the values in meta.sortFields
                     *      sortDirection: A string indicating the sort direction, must be one of "asc" or "desc"
                     *      pageSize:      A string or integer indicating the page size, must be one of the values in meta.pageSizes
                     *  }
                     */
                    emailAccounts.setMetaFromComponentSettings = function(settings) {

                        if ( settings.hasOwnProperty("sortBy") && settings.sortBy && _.find(emailAccounts.meta.sortFields, function(f) {
                            return f === settings.sortBy;
                        }) ) {
                            emailAccounts.meta.sortBy = settings.sortBy;
                        }

                        if ( settings.hasOwnProperty("sortDirection") && settings.sortDirection && (settings.sortDirection === "asc" || settings.sortDirection === "desc" ) ) {
                            emailAccounts.meta.sortDirection = settings.sortDirection;
                        }

                        if ( settings.hasOwnProperty("pageSize") && settings.pageSize && _.find(emailAccounts.meta.pageSizes, function(s) {
                            return s === parseInt(settings.pageSize);
                        }) ) {
                            emailAccounts.meta.pageSize = parseInt(settings.pageSize);
                        }

                    };

                    /**
                     * Stores the current values of sortBy, sortDirection, pageSize
                     * @method saveMetaToComponentSettings
                     */
                    emailAccounts.saveMetaToComponentSettings = function() {
                        componentSettingSaverService.set(COMPONENT_NAME, {
                            sortBy: emailAccounts.meta.sortBy,
                            sortDirection: emailAccounts.meta.sortDirection,
                            pageSize: emailAccounts.meta.pageSize
                        });
                    };

                    /**
                     * Clears status
                     * @method clearStatus
                     * @param {Object} emailAccount
                     */
                    emailAccounts.clearStatus = function(emailAccount) {

                        // Account was deleted, remove it from the list
                        if ( emailAccount && emailAccount.deleted ) {

                            var index = emailAccounts.meta.accounts.indexOf(emailAccount);

                            // Don't remove anything if the item isn't found in the list
                            if ( index > -1 ) {
                                emailAccounts.meta.accounts.splice(index, 1);
                                emailAccounts.meta.totalItems--;

                                emailAccounts.meta.mobileItemCountText = LOCALE.maketext("[_1] - [_2] of [_3]",
                                    emailAccounts.meta.start, emailAccounts.meta.limit, emailAccounts.meta.totalItems
                                );
                            }

                            emailAccount.isExpanded = false;

                            // If we've removed all the items on the page, but there are more items in the result set, fetch them
                            if ( emailAccounts.meta.accounts.length === 0 && emailAccounts.meta.totalItems > emailAccounts.meta.pageSize ) {

                                // If we deleted the last item on the last page, go back by 1 page
                                if ( emailAccounts.meta.currentPage === emailAccounts.meta.totalPages ) {
                                    emailAccounts.meta.currentPage--;
                                }

                                return emailAccounts.fetch();
                            }

                        }
                    };

                    /**
                     * Callback for clicking on one of the table headers to sort by column
                     * @method sortList
                     */
                    emailAccounts.sortList = function() {

                        if ( emailAccounts.currentFetchTimeout ) {
                            $timeout.cancel(emailAccounts.currentFetchTimeout);
                        }

                        emailAccounts.currentFetchTimeout = $timeout(function() {
                            emailAccounts.saveMetaToComponentSettings();
                            clearSelectedState();
                            emailAccounts.meta.currentPage = 1;
                            updateLocalStorage("currentPage", emailAccounts.meta.currentPage);
                            return emailAccounts.fetch();
                        }, DEFAULT_TIMEOUT);
                    };

                    /**
                     * Callback for clicking on one of the pagination nav links to move between pages
                     * @method selectPage
                     */
                    emailAccounts.selectPage = function() {
                        if (emailAccounts.loadingEmailAccounts) {
                            return;
                        }

                        if ( emailAccounts.currentFetchTimeout ) {
                            $timeout.cancel(emailAccounts.currentFetchTimeout);
                        }

                        return emailAccounts.currentFetchTimeout = $timeout(function() {
                            clearSelectedState();
                            updateLocalStorage("currentPage", emailAccounts.meta.currentPage);
                            return emailAccounts.fetch();
                        }, DEFAULT_TIMEOUT);
                    };

                    /**
                     * Callback for selecting a page size from the pagination
                     * @method selectPageSize
                     */
                    emailAccounts.selectPageSize = function() {

                        if ( emailAccounts.currentFetchTimeout ) {
                            $timeout.cancel(emailAccounts.currentFetchTimeout);
                        }

                        emailAccounts.currentFetchTimeout = $timeout(function() {
                            emailAccounts.saveMetaToComponentSettings();
                            clearSelectedState();
                            emailAccounts.meta.currentPage = 1;
                            return emailAccounts.fetch();
                        }, DEFAULT_TIMEOUT);
                    };

                    /**
                     * Callback for entering filter input into the search bar
                     * @method searchList
                     */
                    emailAccounts.searchList = function() {
                        emailAccounts.filterTermPending = true;
                        emailAccounts.meta.currentPage = 1;
                        clearSelectedState();
                        updateLocalStorage("filter", emailAccounts.meta.filterValue);
                        updateLocalStorage("currentPage", emailAccounts.meta.currentPage);
                        return emailAccounts.fetch();
                    };

                    /**
                     * Gets selected state
                     * @method getSelectedState
                     * @returns {Boolean} returns if the checkbox is selected
                     */
                    emailAccounts.getSelectedState = function() {
                        return emailAccounts.checkedCount > 0 || emailAccounts.selectAllState;
                    };

                    /**
                     * Gets indeterminate state
                     * @method getIndeterminateState
                     * @returns {Boolean} returns indeterminate state
                     */
                    emailAccounts.getIndeterminateState = function() {
                        return emailAccounts.checkedCount > 0 && !emailAccounts.selectAllState;
                    };

                    /**
                     * Toggles selection
                     *
                     * @method toggleSelection
                     */
                    emailAccounts.toggleSelection = function(account) {
                        if (account.selected) {
                            emailAccounts.checkedCount++;
                            selectedItems[account.email] = true;
                        } else {
                            emailAccounts.checkedCount--;
                            delete selectedItems[account.email];
                        }
                        if (emailAccounts.checkedCount === 0) {
                            emailAccounts.multiDeleteSelected = false;
                        }
                        emailAccounts.selectAllState = emailAccounts.checkedCount === emailAccounts.meta.accounts.length;
                    };

                    /**
                     * Toggles select all
                     * @method toggleSelectAll
                     */
                    emailAccounts.toggleSelectAll = function() {
                        if (emailAccounts.meta.accounts.length === 0) {
                            return;
                        }

                        // if we are in an indeterminate state, make sure that select all unselects
                        var indeterminateState = emailAccounts.checkedCount > 0 && emailAccounts.checkedCount !== emailAccounts.meta.accounts.length;
                        if (indeterminateState) {
                            emailAccounts.selectAllState = !emailAccounts.selectAllState;
                        }

                        for (var i = 0, listLength = emailAccounts.meta.accounts.length; i < listLength; i++) {
                            var account = emailAccounts.meta.accounts[i];
                            if (account.isDefault) {
                                continue;
                            }
                            account.selected = emailAccounts.selectAllState;
                            if (emailAccounts.selectAllState) {
                                selectedItems[account.email] = emailAccounts.selectAllState;
                            } else {
                                delete selectedItems[account.email];
                            }
                        }
                        if (emailAccounts.selectAllState) {
                            emailAccounts.checkedCount = listLength;
                        } else {
                            emailAccounts.checkedCount = 0;
                            emailAccounts.multiDeleteSelected = false;
                        }
                    };

                    /**
                     * Get delete multiple messages
                     *
                     * @method getDeleteMultipleMsg
                     */
                    emailAccounts.getDeleteMultipleMsg = function() {
                        var selected;

                        if (emailAccounts.checkedCount > 1) {
                            return LOCALE.maketext("Delete the selected [quant,_1,email account,email accounts]?", emailAccounts.checkedCount);
                        } else if (emailAccounts.checkedCount === 1) {
                            for (var i = 0, listLength = emailAccounts.meta.accounts.length; i < listLength; i++) {
                                if (emailAccounts.meta.accounts[i].selected) {
                                    selected = emailAccounts.meta.accounts[i].email;
                                    break;
                                }
                            }
                            return LOCALE.maketext("Delete “[_1]”?", selected);
                        }
                    };

                    /**
                     * Gets text for multi delete
                     *
                     * @method getMultiDeleteButtonTxt
                     * @returns {string} delete text
                     */
                    emailAccounts.getMultiDeleteButtonTxt = function() {
                        return LOCALE.maketext("Delete ([numf,_1])", emailAccounts.checkedCount);
                    };

                    /**
                     * Callback for deleting an email account from the list
                     * @method delete
                     */
                    emailAccounts.delete = function(account) {

                        account.delete_requested = true;
                        account.removing = true;

                        // If we're removing the last item in the list, clear the green on the search box
                        if ( emailAccounts.meta.accounts.length === 1 && emailAccounts.meta.filterValue ) {
                            emailAccounts.filterTermPending = true;
                        }

                        return emailAccountsService.deleteEmail(account.email)
                            .then(function() {
                                emailAccounts.filterTermPending = false;

                                alertService.add({
                                    message: LOCALE.maketext("Account “[_1]” deleted.", account.user + "@" + account.domain),
                                    type: "success",
                                    closeable: true,
                                    autoClose: 10000,
                                    group: "emailAccounts"
                                });

                                account.delete_requested = false;
                                account.removing = false;
                                account.deleted = true;

                                delete selectedItems[account.email];
                                emailAccounts.checkedCount--;

                                // Special handling for when the last record is removed from a filtered list
                                // Allows the search to go red while the deleted status stays displayed for 10s
                                if ( emailAccounts.meta.filterValue && emailAccounts.meta.accounts.length === 1 && emailAccounts.meta.totalItems <= emailAccounts.meta.pageSize ) {
                                    emailAccounts.meta.accounts = [];
                                }

                                emailAccounts.clearStatus(account);
                            },
                            function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "emailAccounts"
                                });
                                account.delete_requested = false;
                                account.removing = false;
                                account.deleted = false;
                            }
                            );
                    };

                    /**
                     * Deletes multiple emails
                     *
                     * @method deleteMultiple
                     */
                    emailAccounts.deleteMultiple = function() {
                        emailAccounts.removingMultiple = true;

                        var accounts = [];
                        for (var i = 0, listLength = emailAccounts.meta.accounts.length; i < listLength; i++) {
                            if (emailAccounts.meta.accounts[i].selected && !emailAccounts.meta.accounts[i].isDefault) {
                                accounts.push(emailAccounts.meta.accounts[i]);
                            }
                        }

                        // If we're removing the last item in the list, clear the green on the search box
                        if ( emailAccounts.meta.accounts.length === 1 && emailAccounts.meta.filterValue ) {
                            emailAccounts.filterTermPending = true;
                        }

                        return emailAccountsService.deleteEmails(accounts)
                            .then(function() {
                                var message = "";
                                if (accounts.length > 1) {
                                    message = LOCALE.maketext("Deleted [numf,_1] email accounts.", accounts.length);
                                } else if (accounts.length === 1) {
                                    message = LOCALE.maketext("Email account “[_1]” deleted.", accounts[0].user + "@" + accounts[0].domain);
                                }

                                alertService.add({
                                    message: message,
                                    type: "success",
                                    closeable: true,
                                    autoClose: 10000,
                                    group: "emailAccounts"
                                });

                                clearSelectedState();
                                emailAccounts.removingMultiple = false;

                                for (var i = 0, len = accounts.length; i < len; i++) {
                                    delete selectedItems[accounts[0]];
                                }

                                return emailAccounts.fetch();
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "emailAccounts"
                                });
                                emailAccounts.removingMultiple = false;
                                emailAccounts.multiDeleteSelected = false;
                            });
                    };

                    /**
                     * Sets API params
                     * @method setApiParams
                     * @param {Object} emailAccounts
                     * @param {string} sortMethod
                     */
                    function setApiParams(emailAccounts, sortMethod) {
                        var apiParams = {
                            "api.sort": 1,
                            "api.sort_column_0": emailAccounts.meta.sortBy,
                            "api.sort_method_0": sortMethod,
                            "api.sort_reverse_0": emailAccounts.meta.sortDirection === "asc" ? 0 : 1,
                            "api.paginate": 1,
                            "api.paginate_start": ((emailAccounts.meta.currentPage - 1) * emailAccounts.meta.pageSize) + 1,
                            "api.paginate_size": emailAccounts.meta.pageSize,
                            "api.paginate_page": emailAccounts.meta.currentPage
                        };

                        if ( emailAccounts.meta.sortBy !== "user" ) {
                            apiParams["api.sort_column_1"] = "user";
                            apiParams["api.sort_method_1"] = "lexicographic";
                        }

                        switch (emailAccounts.quickFilter) {
                            case "restricted":
                                apiParams["api.filter_term_1"] = 1;
                                apiParams["api.filter_type_1"] = "eq";
                                apiParams["api.filter_column_1"] = "has_suspended";
                                break;
                            case "default":
                                apiParams["api.filter_term_1"] = "Main Account";
                                apiParams["api.filter_type_1"] = "eq";
                                apiParams["api.filter_column_1"] = "login";

                                // clearing search value on default quick filter
                                emailAccounts.meta.filterValue = "";
                                delete apiParams["api.paginate"];
                                delete apiParams["api.paginate_start"];
                                delete apiParams["api.paginate_size"];
                                delete apiParams["api.paginate_page"];
                                emailAccounts.meta.currentPage = 1;
                                break;
                            case "overUsed":
                                apiParams["api.filter_term_1"] = 100;
                                apiParams["api.filter_type_1"] = "gt";
                                apiParams["api.filter_column_1"] = "diskusedpercent";
                                break;
                        }

                        if ( emailAccounts.meta.filterValue && emailAccounts.meta.filterValue !== "" ) {
                            apiParams["api.filter"] = 1;
                            apiParams["api.filter_term_0"] = emailAccounts.meta.filterValue;
                            apiParams["api.filter_column_0"] = "login";
                        }
                        return apiParams;
                    }

                    /**
                     * Controls show/hide available accounts warings
                     * @method showNoAvailableAccountsWarning
                     */
                    emailAccounts.showNoAvailableAccountsWarning = function() {
                        $scope.showNoAvailableAccounts = !$scope.showNoAvailableAccounts;
                    };

                    /**
                     * Close callout
                     * @method closeCallout
                     */
                    emailAccounts.closeCallout = function() {
                        $scope.showNoAvailableAccounts = false;
                    };

                    /**
                     * Calls emailAccountsService.getEmailAccounts to load the email accounts for the current page
                     * @method fetch
                     */
                    emailAccounts.fetch = function() {

                        emailAccounts.loadingEmailAccounts = true;

                        var sortMethod = "lexicographic";

                        if ( emailAccounts.meta.sortBy === "_diskused" || emailAccounts.meta.sortBy === "diskusedpercent_float" || emailAccounts.meta.sortBy === "has_suspended" ) {
                            sortMethod = "numeric";
                        } else if ( emailAccounts.meta.sortBy === "_diskquota" ) {
                            sortMethod = "numeric_zero_as_max";
                        }

                        var apiParams = setApiParams(emailAccounts, sortMethod);

                        emailAccounts.meta.accounts = [];

                        // Setting min-height to the current height to prevent the page jumping
                        // around when the list is fetching
                        var container = angular.element("#popsAccountList");

                        if ( container && container[0] ) {
                            container.css({ minHeight: $window.getComputedStyle(container[0]).height });
                        }

                        var apiPromise = emailAccountsService.getEmailAccounts(apiParams);
                        emailAccounts.fetchPromise = apiPromise;

                        return apiPromise.then(
                            function(response) {

                                // We only want to actually process the response if it's the last request we sent
                                if ( emailAccounts.fetchPromise !== apiPromise ) {
                                    return;
                                }

                                clearSelectedState();

                                var data = response.data;
                                var metadata = response.meta;

                                emailAccounts.meta.totalItems = metadata.paginate.total_records;
                                emailAccounts.meta.totalPages = metadata.paginate.total_pages;
                                emailAccounts.meta.currentPage = metadata.paginate.current_page;

                                if (emailAccounts.meta.totalItems > _.min(emailAccounts.meta.pageSizes)) {
                                    emailAccounts.meta.showPager = true;
                                    var start = (emailAccounts.meta.currentPage - 1) * emailAccounts.meta.pageSize;
                                    emailAccounts.meta.start = start + 1;
                                    emailAccounts.meta.limit = start + data.length;

                                } else {

                                    // hide pager and pagination
                                    emailAccounts.meta.showPager = false;

                                    if (data.length === 0) {
                                        emailAccounts.meta.start = 0;
                                    } else {
                                        emailAccounts.meta.start = 1;
                                    }

                                    emailAccounts.meta.limit = data.length;
                                }

                                emailAccounts.meta.mobileItemCountText = LOCALE.maketext("[_1] - [_2] of [_3]",
                                    emailAccounts.meta.start, emailAccounts.meta.limit, emailAccounts.meta.totalItems
                                );

                                angular.element("#popsAccountList").css({ minHeight: "" });

                                for (var i = 0, len = data.length; i < len; i++) {
                                    if (selectedItems[data[i].email] && !data[i].isDefault) {
                                        data[i].selected = true;
                                        emailAccounts.checkedCount++;
                                    }
                                }

                                if (data.length > 0) {
                                    emailAccounts.selectAllState = emailAccounts.checkedCount === data.length;
                                } else {
                                    emailAccounts.selectAllState = false;
                                }

                                // This is done to improve performance of loading 100+ records at a time in Firefox
                                if (data.length > 100) {
                                    var tempEmailAccounts = [];
                                    var chunkSize = 50;

                                    while (data.length) {
                                        tempEmailAccounts.push(data.splice(0, chunkSize));
                                    }
                                    emailAccounts.meta.accounts = tempEmailAccounts.shift();

                                    bindEmailsToList(tempEmailAccounts);

                                } else {
                                    emailAccounts.meta.accounts = data;
                                }

                                emailAccounts.loadingEmailAccounts = false;
                                emailAccounts.filterTermPending = false;
                            },
                            function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "emailAccounts"
                                });
                                emailAccounts.loadingEmailAccounts = false;
                                emailAccounts.filterTermPending = false;
                            }
                        );
                    };

                    function bindEmailsToList(items) {

                        // push them in chunks
                        var emails = items.shift();

                        if (typeof emails !== "undefined" && emails !== null) {
                            $timeout(function() {
                                emailAccounts.meta.accounts = emailAccounts.meta.accounts.concat(emails);
                                bindEmailsToList(items);
                            }, 0);
                        }
                    }

                    /**
                     * Filters email
                     * @method filterEmails
                     */
                    emailAccounts.filterEmails = function() {

                        if (emailAccounts.quickFilter) {
                            emailAccounts.meta.currentPage = 1;
                            updateLocalStorage("quickFilter", emailAccounts.quickFilter);
                            updateLocalStorage("currentPage", emailAccounts.meta.currentPage);
                            return emailAccounts.fetch();
                        }
                    };

                    /**
                     * Gets css class that should be assinged to search field
                     * @method getSearchClass
                     * @returns {string} css class to be assigned to search field
                     */
                    emailAccounts.getSearchClass = function() {
                        if ( !emailAccounts.filterTermPending && !emailAccounts.loadingEmailAccounts && emailAccounts.meta.filterValue ) {
                            return emailAccounts.meta.accounts && emailAccounts.meta.accounts.length > 0 ? "success" : "danger";
                        } else {
                            return "";
                        }
                    };

                    /**
                     * Gets email accuont details
                     * @method getDetails
                     * @param {Object} account email account
                     * @param {Object} isExpanded expanded state
                     */
                    emailAccounts.getDetails = function(account, isExpanded) {
                        if (isExpanded) {
                            account.displayInnerEmail = showInnerEmail(account.email);
                        }
                        account.isExpanded = isExpanded;
                    };

                    /**
                     * Redirects to connect Devices interface
                     *
                     * @param {Object} emailAccount email account
                     */
                    emailAccounts.connectDevices = function(emailAccount) {
                        var path = emailAccounts.dprefix + "mail/clientconf.html?acct=" + encodeURIComponent(emailAccount.email);

                        window.location.href = path;
                    };

                    /**
                     * Redirects to manage account
                     * @method manageAccount
                     * @param {Object} emailAccount
                     * @param {string} scrollTo
                     */
                    emailAccounts.manageAccount = function(emailAccount, scrollTo) {
                        if (emailAccount && emailAccount.isDefault) {
                            $location.path("/manageDefault/");
                        } else {

                            var path = "/manage/" + encodeURIComponent(emailAccount.email);

                            if (typeof scrollTo !== "undefined" && scrollTo) {
                                path = path + "/" + scrollTo;
                            }

                            $location.path(path);
                        }
                    };

                    $scope.$on("$destroy", function() {
                        componentSettingSaverService.unregister(COMPONENT_NAME);
                    });

                    /**
                     * initialze
                     * @method init
                     */
                    function init() {

                        if ( app.firstLoad && PAGE.nvdata && PAGE.nvdata.hasOwnProperty(COMPONENT_NAME) ) {
                            emailAccounts.setMetaFromComponentSettings(PAGE.nvdata[COMPONENT_NAME]);
                        }

                        app.firstLoad = false;

                        emailAccounts.loadingEmailAccounts = true;
                        return componentSettingSaverService.register(COMPONENT_NAME)
                            .then(
                                function(result) {
                                    if ( result ) {

                                        if ( $routeParams.account && $routeParams.account !== result.filterValue ) {
                                            result.filterValue = $routeParams.account;
                                            emailAccounts.meta.currentPage = 1;
                                            emailAccounts.meta.accounts = undefined;
                                            emailAccounts.saveMetaToComponentSettings();
                                        }

                                        emailAccounts.setMetaFromComponentSettings(result);
                                    }

                                    if ( !emailAccounts.meta.accounts ) {
                                        return emailAccounts.fetch();
                                    }

                                },
                                function() {
                                    if ( !emailAccounts.meta.accounts ) {
                                        return emailAccounts.fetch();
                                    }
                                }
                            );
                    }

                    init();
                }
            ]
        );

        return controller;
    }
);
