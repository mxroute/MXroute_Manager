/*
# home/directives/applicationListFilterDirective.js           Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular"
    ],
    function(angular) {

        // Retrieve the current application
        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        /**
         * Directive that filters the application list
         */
        app.directive("applicationListFilter", [ function() {
            return {
                restrict: "A",
                scope: {
                    "collapsedGroups": "=",
                    "searchText": "="
                },
                link: function(scope, element) {

                    var boxesContainer = element;

                    // Gathering elements that need to be manipulated during search/filtering of application list
                    var groups = angular.element(boxesContainer.find("[data-group-name]"));
                    var collapseIndicators = angular.element(boxesContainer.find("[data-collapsed-indicator]"));
                    var items = angular.element(boxesContainer.find("[data-item-search-text]"));
                    var groupBodies = angular.element(boxesContainer.find("[data-group-body]"));

                    /**
                    * Expands all the groups during search and hides the collapse/expand indicator
                    *
                    * @method expandAllGroups
                    */
                    function expandAllGroups() {
                        collapseIndicators.addClass("ng-hide");
                        groupBodies.removeClass("minimized ng-hide");
                    }

                    /**
                    * Sets the Group state back to the collapsed/expanded
                    * state based on the nvData when search gets cleared.
                    * @method setGroupState
                    */
                    function setGroupState() {
                        items.removeClass("ng-hide");
                        collapseIndicators.removeClass("ng-hide");
                        groups.removeClass("ng-hide");

                        var collapsedGroups = scope.collapsedGroups;

                        groupBodies.each(function() {
                            var groupBody = angular.element(this);
                            if (collapsedGroups.indexOf(groupBody.data("groupBody") + "=0") === -1) {
                                groupBody.removeClass("ng-hide");
                            } else {
                                groupBody.addClass("minimized ng-hide");
                            }
                        });
                    }

                    /**
                    * Filters the application list and groups based on search string.
                    * @method filterBy
                    */
                    function filterBy(value) {

                        var regex = new RegExp(value, "i");
                        var visibleGroups = [];

                        items.each(function() {
                            var item = angular.element(this);

                            if (!regex.test(item.data("itemSearchText"))) {
                                item.addClass("ng-hide");
                            } else {
                                var groupName = item.data("itemGroup");
                                if (visibleGroups.indexOf(groupName) === -1) {
                                    visibleGroups.push(groupName);
                                }
                                item.removeClass("ng-hide");
                            }

                        });

                        groups.each(function() {
                            var group = angular.element(this);
                            if (visibleGroups.indexOf(group.data("groupName")) === -1) {
                                group.addClass("ng-hide");
                            } else {
                                group.removeClass("ng-hide");
                            }
                        });
                    }

                    // Adding a watch on searchText  so that change in value will trigger filter
                    scope.$watch("searchText", function(newVal, oldVal) {
                        if (typeof oldVal === "undefined" || (oldVal === "" && newVal !== "")) {
                            expandAllGroups();
                            filterBy(newVal);
                        } else if (newVal === "") {
                            setGroupState();
                        } else {
                            filterBy(newVal);
                        }
                    }, true);
                }
            };
        }]);
    }
);
