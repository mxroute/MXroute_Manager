/*
 * user_manager/directives/issueList.js            Copyright(c) 2015 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale"
    ],
    function(angular, LOCALE) {

        /**
         * This directive renders a list of issues using a common template.
         * Use the "issues" attribute to bind to an array of issue objects.
         *
         * Example:
         * <cp-issue-list issues="user.issues"></cp-issue-list>
         *
         * Example with an id prefix:
         * <li ng-repeat="user in users">
         *     <span>user.name</span>
         *     <cp-issue-list issues="user.issues" id-prefix="{{ $index }}"></cp-issue-list>
         * </li>
         */
        angular.module("App").directive("cpIssueList", [
            function() {
                var counter = 0;

                return {
                    templateUrl: "directives/issueList.phtml",
                    scope: {
                        issues: "=",  // The model. An array of issue objects.
                        idPrefix: "@" // Optional prefix for the generated IDs.
                    },
                    link: function(scope, elem, attrs) {
                        if (angular.isDefined(scope.issues) && !angular.isArray(scope.issues)) {
                            throw new TypeError("The issues attribute should evaluate to an array of issue objects.");
                        }

                        // Provide an automatically generated prefix if one is not provided.
                        scope.$watch("idPrefix", function(newVal) {
                            if (!newVal && newVal !== 0) {
                                scope.idPrefix = counter++;
                            }
                        });

                        /**
                         * Gets the best title for an issue.
                         * @param  {Object} issue   The issue object.
                         * @return {String}         The full title string for the issue.
                         */
                        scope.getIssueTitle = function(issue) {
                            if (issue.title) {
                                return issue.title;
                            }

                            if (issue.area === "quota") {
                                switch (issue.service) {
                                    case "email":
                                        return (issue.type === "error") ? LOCALE.maketext("Mail Quota Reached:") : LOCALE.maketext("Mail Quota Warning:");
                                    case "ftp":
                                        return (issue.type === "error") ? LOCALE.maketext("[asis,FTP] Quota Reached:") : LOCALE.maketext("[asis,FTP] Quota Warning:");
                                }
                            } else {
                                return (issue.type === "error") ? LOCALE.maketext("Error:") : LOCALE.maketext("Warning:");
                            }
                        };
                    }

                };
            }
        ]);
    }
);
