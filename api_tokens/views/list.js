/*
# api_tokens/views/list.js                         Copyright 2019 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/directives/itemLister",
        "app/directives/itemListerView",
        "app/services/apiTokens",
        "app/views/create",
        "cjt/modules",
        "cjt/services/alertService",
        "cjt/directives/actionButtonDirective",
    ],
    function(angular, _, LOCALE, ItemLister, ItemListerView, APITokensService, CreateView) {

        "use strict";

        var VIEW_TITLE = LOCALE.maketext("List API Tokens");
        var MODULE_NAMESPACE = "cpanel.apiTokens.views.list";
        var TEMPLATE_URL = "views/list.ptt";
        var MODULE_DEPENDANCIES = [ ItemLister.namespace, ItemListerView.namespace, APITokensService.namespace ];

        var CONTROLLER_INJECTABLES = ["$scope", "$location", APITokensService.serviceName, "alertService", "apiTokens", "ITEM_LISTER_CONSTANTS"];
        var CONTROLLER_NAME = "ListController";
        var CONTROLLER = function APITokensListController($scope, $location, $service, $alertService, apiTokens, ITEM_LISTER_CONSTANTS) {

            /**
             *
             * Initialize the controller, called internally.
             *
             * @private
             *
             */
            $scope.init = function init() {
                $scope._apiTokens = apiTokens;
                $scope._filteredItems = [];
                $scope.selectedItems = [];
                $scope.confirmingDelete = false;
                $scope.deletingTokens = false;
                $scope.tableHeaderItems = [
                    {
                        field: "label",
                        label: LOCALE.maketext("Token Name"),
                        sortable: true
                    },
                    {
                        field: "createdOn",
                        label: LOCALE.maketext("Created"),
                        hiddenOnMobile: true,
                        sortable: true
                    },
                    {
                        field: "actions",
                        label: "",
                        sortable: false
                    }
                ];

                ["TABLE_ITEM_SELECTED", "TABLE_ITEM_DESELECTED", "ITEM_LISTER_SELECT_ALL", "ITEM_LISTER_DESELECT_ALL"].forEach(function(updateEventKey) {
                    $scope.$on(ITEM_LISTER_CONSTANTS[updateEventKey], $scope._updatedSelected);
                });

                $scope.$on(ITEM_LISTER_CONSTANTS.ITEM_LISTER_UPDATED_EVENT, function(event, parameters) {
                    $scope._filteredItems = parameters.items;
                    $scope._updatedSelected();
                });
            };

            /**
             *
             * On success of deleted tokens, this function notifies the user.
             *
             * @private
             *
             * @param {Array<String>} deletedTokenNames tokens that were deleted
             * @param {} updatedApiTokens
             */
            $scope._deleteTokenSuccess = function _deleteTokenSuccess(deletedTokenNames, updatedApiTokens) {
                $scope._apiTokens = updatedApiTokens;
                $alertService.success(LOCALE.maketext("The system successfully revoked the following [asis,API] [numerate,_1,token,tokens]: [list_and_quoted,_1]", deletedTokenNames));
                if ($scope._apiTokens.length === 0) {
                    $location.path(CreateView.route);
                }
                $scope.confirmingDelete = false;
                $scope.deletingTokens = false;
            };

            /**
             *
             * On update of the selected items, as emitted from the lister, this updates the local array
             *
             */
            $scope._updatedSelected = function _updatedSelected() {
                $scope.selectedItems = $scope._filteredItems.filter(function(item) {
                    return item.selected;
                });
            };

            /**
             *
             * Delete tokens
             *
             * @param {*} items token items to be deleted
             * @returns {Promise<Array>} returns the deletion promise and updated api tokens
             */
            $scope.deleteTokens = function deleteAPITokens(items) {
                var tokenNames = [];
                var tokenHashes = [];
                items.forEach(function(item) {
                    tokenHashes.push(item.id);
                    tokenNames.push(_.escape(item.label));
                });
                $scope.deletingTokens = true;
                return $service.deleteTokens(tokenHashes).then($scope._deleteTokenSuccess.bind($scope, tokenNames));
            };

            /**
             * Show the deletion confirmation message
             *
             */
            $scope.showDeletionConfirmationMessage = function showDeletionConfirmationMessage() {
                $scope.confirmingDelete = true;
            };

            /**
             * Hide the deletion confirmation message
             *
             */
            $scope.hideDeletionConfirmationMessage = function hideDeletionConfirmationMessage() {
                $scope.confirmingDelete = false;
            };

            /**
             * Generate a Label for the Delete Confirmation Button
             *
             * @returns {String} Delete Confirmation Button Label
             */
            $scope.confirmDeleteButtonLabel = function confirmDeleteButtonLabel() {
                return LOCALE.maketext("Revoke Selected [asis,API] [numerate,_1,Token,Tokens]", $scope.selectedItems.length);
            };

            /**
             * Get the current api tokens
             *
             * @returns {Array} current api tokens
             */
            $scope.getItems = function getItems() {
                return $scope._apiTokens;
            };

            /**
             * Return just the ids of the selected features
             *
             * @return {Array<String>} array of feature names
             *
             */
            $scope.getSelectedFeatureNames = function getSelectedFeatureNames() {
                return $scope.selectedItems.map(function(selectedFeature) {
                    return selectedFeature.id;
                });
            };

            /**
             * Get the delete confirmation message based on selected features.
             *
             * @returns {String} delete confirmation message
             */
            $scope.confirmDeleteMessage = function confirmDeleteMessage() {
                var selectedFeatureNames = $scope.getSelectedFeatureNames().map(_.escape);
                return LOCALE.maketext("Are you sure that you want to revoke the following [asis,API] [numerate,_1,token,tokens]: [list_and_quoted,_2]", selectedFeatureNames.length, selectedFeatureNames);
            };

            $scope.init();
        };

        var app = angular.module(MODULE_NAMESPACE, MODULE_DEPENDANCIES);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES.concat(CONTROLLER));

        var resolver = {
            "apiTokens": [ APITokensService.serviceName, "$location", function($service, $location) {
                return $service.fetchTokens().then(function(apiTokens) {
                    if (apiTokens.length) {
                        return apiTokens;
                    } else {
                        $location.path(CreateView.route);
                        return false;
                    }
                });
            }]
        };

        return {
            "id": "listAPITokens",
            "route": "/",
            "controller": CONTROLLER_NAME,
            "class": CONTROLLER,
            "templateUrl": TEMPLATE_URL,
            "title": VIEW_TITLE,
            "namespace": MODULE_NAMESPACE,
            "showResourcePanel": false,
            "resolve": resolver
        };
    }
);
