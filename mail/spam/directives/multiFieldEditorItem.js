/*
# mail/spam/directives/multiFieldEditorItem.js           Copyright 2018 cPanel, Inc.
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
        "cjt/core",
        "app/directives/multiFieldEditor",
        "cjt/directives/validationContainerDirective"
    ],
    function(angular, _, LOCALE, CJT) {

        "use strict";

        var app = angular.module("cpanel.apacheSpamAssassin.directives.multiFieldEditorItem", []);

        app.directive("multiFieldEditorItem", ["$timeout", function($timeout) {

            function _link(scope, element, attr, controllers) {

                scope.canRemove = _.isUndefined(scope.canRemove) || !(scope.canRemove.toString() === "0" || scope.canRemove.toString() === "false" );

                var MFE = controllers.pop();

                if (scope.index === MFE.getAddingRow() ) {
                    $timeout(function() {
                        MFE.itemBeingAdded = -1;
                        if (element.find("select").length) {
                            if (element.find("select").chosen) {
                                element.find("select").chosen()
                                    .trigger("chosen:activate")
                                    .trigger("chosen:open");
                            }
                        } else {
                            element.find("input").focus();
                        }
                    }, 10);
                }

                scope.remove = function() {
                    MFE.removeRow(scope.index);
                };
            }

            var TEMPLATE_PATH = "directives/multiFieldEditorItem.ptt";
            var RELATIVE_PATH = "mail/spam/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                restrict: "EA",
                require: ["^^multiFieldEditor"],
                transclude: true,
                scope: {
                    "index": "=",
                    "label": "@",
                    "labelFor": "@",
                    "canRemove": "=",
                    "parentID": "@id"
                },
                link: _link
            };
        }]);
    }
);
