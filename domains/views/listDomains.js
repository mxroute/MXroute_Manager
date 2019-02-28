/*
# domains/views/listDomains.js                       Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

/** @namespace cpanel.domains.views.listDomains */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/services/cpanel/componentSettingSaverService"
    ],
    function(angular, LOCALE) {

        "use strict";

        var app = angular.module("cpanel.domains");

        /**
         * View Controller for Domain Listing
         *
         * @module listDomains
         *
         * @param  {Object} $scope angular scope
         * @param  {Object} $local angular location Object
         * @param  {Array} domains array of domains to display
         * @param  {Object} ITEM_LISTER_CONSTANTS event constants for table actions
         *
         */

        var COMPONENT_NAME = "listDomainsView";

        var controller = app.controller(
            "listDomains",
            ["$scope", "$location", "$filter", "componentSettingSaverService", "currentDomains", "ITEM_LISTER_CONSTANTS", "PAGE",
                function($scope, $location, $filter, $CSSS, initialDomains, ITEM_LISTER_CONSTANTS, PAGE) {

                    var _tableConfigurationOptions = [];
                    var LIST_DOMAIN_EVENTS = {
                        HIDE_ASSOCIATED: "hideAssociatedSubdomains",
                        SHOW_ASSOCIATED: "showAssociatedSubdomains"
                    };

                    var associatedDomainsExist = initialDomains.some(function(domainObject) {
                        if (domainObject.associatedAddonDomain) {
                            return true;
                        }
                        return false;
                    });

                    /**
                     * Navigate to the Manage screen for a specific domain
                     *
                     * @method manageDomain
                     *
                     * @param  {String} domain domain to manage
                     *
                     */

                    function _manageDomain(domain) {
                        $location.path("manage").search("domain", domain);
                    }

                    function _itemChangeRequested(event, parameters) {
                        switch (parameters.actionType) {
                            case "manage":
                                _manageDomain(parameters.item.domain);
                                break;
                        }
                    }

                    function _itemListerUpdated(event, parameters) {
                        $scope.itemListerMeta = parameters.meta;
                        $scope.currentSearchFilterValue = $scope.itemListerMeta.filterValue;
                    }

                    /**
                     * On updating of the show associated addon domains checkbox, refilter domains
                     *
                     * @method onUpdateShowAssociated
                     *
                     */
                    function _filterAssociatedDomains(domain) {
                        if ($scope.showAssociatedSubdomains) {
                            return true;
                        }
                        if (!domain.associatedAddonDomain) {
                            return true;
                        }

                        return false;
                    }

                    var lastFiltered = true;

                    function _updateFiltered() {
                        var filteredDomains = $filter("filter")(initialDomains, _filterAssociatedDomains);
                        lastFiltered = $scope.showAssociatedSubdomains;

                        // Need to do this without destroying the original array
                        $scope.filteredDomains = filteredDomains;
                    }

                    function toggleShowAssociatedSubdomains() {
                        $scope.showAssociatedSubdomains = !$scope.showAssociatedSubdomains;
                        $CSSS.set(COMPONENT_NAME, { showAssociatedSubdomains: $scope.showAssociatedSubdomains });
                        _updateFiltered();
                        _updateTableConfigurationOptions();
                    }

                    function getFilteredDomains() {
                        if (lastFiltered !== $scope.showAssociatedSubdomains) {
                            _updateFiltered();
                        }
                        return $scope.filteredDomains;
                    }

                    function _updateTableConfigurationOptions() {
                        _tableConfigurationOptions.splice(0);

                        if (!associatedDomainsExist) {
                            return;
                        }

                        if ($scope.showAssociatedSubdomains) {
                            _tableConfigurationOptions.push({
                                label: LOCALE.maketext("Hide Associated Subdomains"),
                                event: LIST_DOMAIN_EVENTS.HIDE_ASSOCIATED
                            });
                        } else {
                            _tableConfigurationOptions.push({
                                label: LOCALE.maketext("Show Associated Subdomains"),
                                event: LIST_DOMAIN_EVENTS.SHOW_ASSOCIATED
                            });
                        }
                    }

                    $scope.$on(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, _itemChangeRequested);
                    $scope.$on(ITEM_LISTER_CONSTANTS.ITEM_LISTER_UPDATED_EVENT, _itemListerUpdated);
                    $scope.$on(LIST_DOMAIN_EVENTS.SHOW_ASSOCIATED, toggleShowAssociatedSubdomains);
                    $scope.$on(LIST_DOMAIN_EVENTS.HIDE_ASSOCIATED, toggleShowAssociatedSubdomains);

                    $scope.domains = initialDomains;
                    $scope.filteredDomains = initialDomains;
                    $scope.showAssociatedSubdomains = false;
                    $scope.tableHeaderItems = [];
                    $scope.tableHeaderItems.push({ field: "domain", sortable: true, label: LOCALE.maketext("Domain") });
                    if (PAGE.hasWebServerRole) {
                        $scope.tableHeaderItems.push({ field: "documentRoot", sortable: true, label: LOCALE.maketext("Document Root") });
                    }
                    $scope.tableHeaderItems.push({ field: "redirectsTo", sortable: true, label: LOCALE.maketext("Redirects To") });
                    $scope.tableHeaderItems.push({ field: "actions", label: LOCALE.maketext("Actions") });

                    _updateTableConfigurationOptions();

                    angular.extend($scope, {
                        getFilteredDomains: getFilteredDomains,
                        showAssociatedSubdomains: false,
                        toggleShowAssociatedSubdomains: toggleShowAssociatedSubdomains,
                        tableConfigurationOptions: _tableConfigurationOptions,
                    });

                    var registerSuccess = $CSSS.register(COMPONENT_NAME);
                    if ( registerSuccess ) {
                        registerSuccess.then(function _savedStateLoaded(result) {
                            if (result && $scope.showAssociatedSubdomains !== result.showAssociatedSubdomains) {
                                $scope.showAssociatedSubdomains = result.showAssociatedSubdomains;
                                _updateFiltered();
                                _updateTableConfigurationOptions();
                            }
                        });
                    }

                    $scope.$on("$destroy", function() {
                        $CSSS.unregister(COMPONENT_NAME);
                    });

                }
            ]
        );

        return controller;
    }
);
