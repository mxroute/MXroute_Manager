/*
# user_manager/directives/webdiskServiceConfig.js Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "cjt/directives/toggleSwitchDirective",
        "cjt/filters/wrapFilter",
        "cjt/filters/htmlFilter",
        "app/services/directoryLookupService",
        "app/directives/limit",
        "app/directives/serviceConfigController"
    ],
    function(angular, _, CJT, LOCALE) {

        var module = angular.module("App");
        module.directive("webdiskConfig", [
            "defaultInfo",
            "sslInfo",
            "directoryLookupService",
            function(defaultInfo, sslInfo, directoryLookupService) {
                var TEMPLATE_PATH = "directives/webdiskServiceConfig.ptt";
                var RELATIVE_PATH = "user_manager/" + TEMPLATE_PATH;

                return {
                    restrict: "AE",
                    templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                    replace: true,
                    require: "ngModel",
                    scope: {
                        toggleService: "&toggleService",
                        isDisabled: "=ngDisabled",
                        showToggle: "=showToggle",
                        showUnlink: "=showUnlink",
                        unlinkService: "&unlinkService",
                        isInProgress: "&isInProgress",
                        enableDigestControls: "=enableDigestControls",
                        showDigestWarning: "=showDigestWarning",
                        showInfo: "=showInfo",
                        infoMessage: "@infoMessage",
                        showWarning: "=showWarning",
                        warningMessage: "@warningMessage",
                        showConflictDismiss: "=?",
                        conflictResolutionRequired: "=?",
                        linkAction: "&?"

                    },
                    controller: "serviceConfigController",
                    link: function(scope, element, attrs, ngModel) {
                        scope.ngModel = ngModel;

                        if (angular.isUndefined(scope.showDigestWarning)) {
                            scope.showDigestWarning = false;
                        }

                        if (angular.isUndefined(scope.showWarning) ||
                            angular.isUndefined(scope.warningMessage) ||
                            scope.warningMessage === "") {
                            scope.showWarning = false;
                        }

                        if (angular.isUndefined(scope.showInfo) ||
                            angular.isUndefined(scope.infoMessage) ||
                            scope.infoMessage === "") {
                            scope.showInfo = false;
                        }

                        if (angular.isUndefined(scope.showToggle)) {
                            scope.showToggle = true;
                        }

                        if (angular.isUndefined(scope.showUnlink)) {
                            scope.showUnlink = false;
                        }

                        if (angular.isUndefined(scope.enableDigestControls)) {
                            scope.enableDigestControls = true;
                        }

                        // Define how to draw the output when the model changes
                        ngModel.$render = function() {
                            scope.service = ngModel.$modelValue;
                            scope.validateConflictResolution();
                        };

                        scope.defaults = defaultInfo;
                        scope.allowDigestAuth = sslInfo.is_self_signed;

                        // Helper to call the directory lookup service
                        scope.completeDirectory = function(prefix) {
                            return directoryLookupService.complete(prefix);
                        };
                    }
                };
            }
        ]);
    }
);
