/*
# mail/spam/directives/multiFieldEditor.js           Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        "use strict";

        var app = angular.module("cpanel.apacheSpamAssassin.directives.multiFieldEditor", []);

        app.directive("multiFieldEditor", function() {
            function _link(scope, element, attr) {
                scope.addNewLabel = scope.addNewLabel ? scope.addNewLabel : LOCALE.maketext("Add A New Item");
            }

            function _multiFieldEditorController($scope) {
                this.minValuesCount = $scope.minValuesCount || 0;
                this.ngModel = $scope.ngModel ? $scope.ngModel : new Array($scope.minValuesCount);

                if (this.ngModel.length < this.minValuesCount) {
                    this.ngModel.length = this.minValuesCount;
                }

                this.removeRow = function(rowKey) {
                    this.ngModel.splice(rowKey, 1);
                };

                var itemBeingAdded = -1;

                this.addRow = function() {
                    itemBeingAdded = this.ngModel.length;
                    this.ngModel.length++;
                };

                this.getAddingRow = function() {
                    return itemBeingAdded;
                };

                angular.extend($scope, this);
            }

            var TEMPLATE_PATH = "directives/multiFieldEditor.ptt";
            var RELATIVE_PATH = "mail/spam/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                restrict: "EA",
                require: ["ngModel"],
                transclude: true,
                scope: {
                    "parentID": "@id",
                    "minValuesCount": "=?",
                    "addNewLabel": "@?",
                    "ngModel": "="
                },
                link: _link,
                controller: ["$scope", _multiFieldEditorController]
            };
        });
    }
);
