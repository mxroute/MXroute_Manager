/*
# passenger/directives/cp_edit_form_inline.js                          Copyright(c) 2017 cPanel, Inc.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/core",
    ],
    function(angular, LOCALE, CJT) {

        var app = angular.module("cpanel.applicationManager");

        app.directive("tableRowForm", function() {

            return {
                restrict: "A",
                scope: {
                    model: "=formModel",
                    onSave: "&onSave",
                    onCancel: "&onCancel"
                },
                require: ["^form"],
                replace: true,
                templateUrl: "passenger/directives/table_row_form.ptt",
                link: function($scope, $element, $attrs, $ctrl) {
                    $scope.form = $ctrl[0];

                    $scope.envarName = $scope.model.name;
                    $scope.envarValue = $scope.model.value;

                    /**
                     * Disable the save button if:
                     * - all the environment variable fields have not been modified
                     * - any of the environment variable fields have errors
                     */
                    $scope.checkSaveDisabledStatus = function() {
                        return ($scope.form.envarName.$pristine && $scope.form.envarValue.$pristine) ||
                            ($scope.form.envarName.$invalid || $scope.form.envarValue.$invalid);
                    };

                    $scope.handleCancel = function() {
                        return $scope.onCancel({ "envar": $scope.model });
                    };

                    $scope.handleSave = function() {
                        return $scope.onSave({ "envar": $scope.model, "name": $scope.envarName, "value": $scope.envarValue });
                    };

                }
            };

        });
    }
);
