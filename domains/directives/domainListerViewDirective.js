/*
# domains/directives/domainListerViewDirective.js                     Copyright(c) 2018 cPanel, Inc.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.directives.domainListerView */

define(
    [
        "angular",
        "cjt/core",
        "app/directives/docrootDirective"
    ],
    function(angular, CJT) {

        "use strict";

        var module = angular.module("cpanel.domains.domainListerView.directive", [ "cpanel.domains.docroot.directive" ]);

        module.value("PAGE", PAGE);

        module.directive("domainListerView", function itemListerItem() {

            /**
             * Domain Lister View is a view that pairs with the item lister to
             * display domains and docroots as well as a manage link. It must
             * be nested within an item lister
             *
             * @module domain-lister-view
             * @restrict EA
             *
             * @example
             * <item-lister>
             *     <domain-lister-view></domain-lister-view>
             * </item-lister>
             *
             */

            var TEMPLATE_PATH = "directives/domainListerViewDirective.ptt";
            var RELATIVE_PATH = "domains/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,

                restrict: "EA",
                replace: true,
                require: "^itemLister",
                link: function($scope, $element, $attrs, $ctrl) {
                    $scope.domains = [];
                    $scope.showConfigColumn = $ctrl.showConfigColumn;
                    $scope.headerItems = $ctrl.getHeaderItems();
                    $scope.updateView = function updateView(viewData) {
                        $scope.domains = viewData;
                    };
                    $ctrl.registerViewCallback($scope.updateView.bind($scope));

                    $scope.$on("$destroy", function() {
                        $ctrl.deregisterViewCallback($scope.updateView);
                    });
                },
                controller: ["$scope", "ITEM_LISTER_CONSTANTS", "DOMAIN_TYPE_CONSTANTS", "PAGE", function($scope, ITEM_LISTER_CONSTANTS, DOMAIN_TYPE_CONSTANTS, PAGE) {

                    $scope.DOMAIN_TYPE_CONSTANTS = DOMAIN_TYPE_CONSTANTS;
                    $scope.EMAIL_ACCOUNTS_APP_EXISTS = PAGE.EMAIL_ACCOUNTS_APP_EXISTS;
                    $scope.webserverRoleAvailable = PAGE.hasWebServerRole;

                    $scope.getDomains = function getDomains() {
                        return $scope.domains;
                    };

                    /**
                     * dispatches a TABLE_ITEM_BUTTON_EVENT event
                     *
                     * @method actionButtonClicked
                     *
                     * @param  {String} type type of action taken
                     * @param  {String} domain the domain on which the action occurred
                     *
                     * @return {Boolean} returns the result of the $scope.$emit function
                     *
                     */
                    $scope.actionButtonClicked = function actionButtonClicked(type, domain) {
                        $scope.$emit(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, { actionType: type, item: domain, interactionID: domain.domain });
                    };

                }]

            };

        });
    }
);
