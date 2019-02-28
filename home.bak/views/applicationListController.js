/*
 * home/views/applicationListController.js                Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false, PAGE: true */

define(
    [
        "angular",
        "lodash",

        // application related
        "app/services/applicationListService",
        "app/directives/draggableDirective",
        "app/directives/dropDirective",
        "app/directives/applicationListFilterDirective"
    ],
    function(angular, _) {

        // Retrieve the current application
        var app = angular.module("App");

        var controller = app.controller(
            "applicationListController", ["$scope", "applicationListService",
                function($scope, applicationListService) {

                    var applicationList = PAGE.appGroups;
                    var collapsedGroupsList = PAGE.collapsedGroups.split("|");

                    // Binding it to the scope so that
                    $scope.collapsedGroups = PAGE.collapsedGroups;

                    /* Updating the searchText model with the value in
                     * search Field if typed before angular bootstrap.
                     * Hack to ensure delayed search is preformed on the
                     * text in the search box, if user types in before angular
                     * bootstrap completes
                     */
                    var searchBox = document.querySelector("#quickjump");
                    if (searchBox && $scope.searchText !== searchBox.value) {
                        $scope.searchText = searchBox.value;
                    }

                    /**
                    * Clears search on Esc
                    *
                    * @method clearSearch
                    * @param {Event} event Event
                    */
                    $scope.clearSearch = function(event) {

                        // clear the search when pressing the Esc key
                        if (event.keyCode === 27) {
                            $scope.searchText = "";
                        }
                    };

                    var searchCache = {};

                    /**
                    * Search Groups
                    *
                    * @method searchGroup
                    * @param {Object} group Group
                    * @return {Boolean}  If the group needs to be displayed
                    */
                    $scope.searchGroup = function(group) {
                        if (!$scope.searchText) {
                            return 1;
                        }
                        if (!searchCache[$scope.searchText]) {
                            searchCache[$scope.searchText] = new RegExp($scope.searchText, "i");
                        }
                        var regex = searchCache[$scope.searchText];
                        var found = false;

                        var groupInfo = _.find(applicationList, function(app) {
                            return app.group === group;
                        });

                        var items = groupInfo.length ? groupInfo.items : [];

                        for (var i = 0, len = items.length; i < len; i++) {
                            found = regex.test(items[i].searchtext);
                            if (found) {
                                return found;
                            }
                        }
                    };

                    /**
                    * Search Item
                    *
                    * @method searchItem
                    * @param {Object} Item Item
                    * @return {Boolean} If the item searchtext matches the searchtext
                    */
                    $scope.searchItem = function(item) {
                        if (!$scope.searchText) {
                            return 1;
                        }
                        if (!searchCache[$scope.searchText]) {
                            searchCache[$scope.searchText] = new RegExp($scope.searchText, "i");
                        }
                        var regex = searchCache[$scope.searchText];

                        return regex.test(item.searchtext);
                    };

                    /**
                    * Toggles group and saves state in NvData
                    *
                    * @method toggleGroup
                    * @param {Object} group Group
                    */
                    $scope.toggleGroup = function(group) {
                        var groupBody = angular.element(document.querySelector("#" + group + "-body"));
                        var groupCollapseIndicator = angular.element(document.querySelector("#" + group + "-collapsed-indicator"));

                        // append to the group name for compatabiltiy with retro
                        group = group + "=0";

                        var index = collapsedGroupsList.indexOf(group);
                        if (index === -1) {
                            groupBody.removeClass("maximize");
                            collapsedGroupsList.push(group);
                            groupBody.addClass("minimized ng-hide");

                            groupCollapseIndicator.removeClass("fa-minus");
                            groupCollapseIndicator.addClass("fa-plus");
                        } else {
                            groupBody.removeClass("minimized ng-hide");
                            collapsedGroupsList.splice(index, 1);
                            groupBody.addClass("maximize");

                            groupCollapseIndicator.removeClass("fa-plus");
                            groupCollapseIndicator.addClass("fa-minus");
                        }

                        var groupList = collapsedGroupsList.join("|");

                        // updating the collapseGroups model with new changes
                        $scope.collapsedGroups = groupList;

                        // Save the changes to NvData
                        applicationListService.setCollapsedGroupsList(groupList);
                    };

                    /**
                    * Handles drag event
                    *
                    * @method handleDrag
                    * @param {String} itemID ID of the item thats being dragged.
                    */
                    $scope.handleDrag = function(itemID) {
                        var groupName = itemID.replace("-group", ""),
                            groupBody = angular.element(document.querySelector("#" + groupName + "-body"));

                        groupBody.removeClass("minimize maximize");

                        var startingPosition = _.findIndex(applicationList, function(group) {
                            return group.group === groupName;
                        });

                        var previousDropAreaId = "#top-drop-area";
                        if (startingPosition > 0) {
                            previousDropAreaId = "#" + applicationList[startingPosition - 1].group + "-drop-area";
                        }

                        // Hidding the DropArea of the group right above the item being moved. We dont want to
                        // drop the group in the same place
                        var hiddenDropArea = angular.element(document.querySelector(previousDropAreaId));
                        hiddenDropArea.addClass("drag-hidden");
                    };

                    /**
                    * Handles the case when a drag event is started but the item is never dropped into a dropArea
                    *
                    * @method handleDragEnd
                    */
                    $scope.handleDragEnd = function() {
                        var hiddenDropArea = angular.element(document.querySelectorAll(".drag-hidden"));

                        // On DragEnd ensures none of the dragAreas are hidden
                        hiddenDropArea.removeClass("drag-hidden");
                    };

                    /**
                    * Handles the drop of group in dropArea
                    *
                    * @method handleDrop
                    * @param {Object} item The item thats being moved
                    * @param {Object} dropArea The area where the item is dropped
                    */
                    $scope.handleDrop = function(item, dropArea) {

                        var groupToMove = item.getAttribute("data-group-name");
                        var moveAfter = dropArea.getAttribute("data-group-name");

                        var boxes = document.querySelector("#boxes");
                        var groupToMoveContainer, moveAfterContainer;

                        if (moveAfter) {
                            groupToMoveContainer = document.querySelector("#" + groupToMove + "-container");
                            moveAfterContainer = document.querySelector("#" + moveAfter + "-container");
                        } else {
                            groupToMoveContainer = document.querySelector("#" + groupToMove + "-container");
                            moveAfterContainer = document.querySelector("#top-drop-area");
                        }

                        // Moving DOM elements
                        if (boxes && groupToMoveContainer && moveAfterContainer) {
                            boxes.insertBefore(groupToMoveContainer, moveAfterContainer.nextSibling);
                        }

                        var oldPosition = _.findIndex(applicationList, function(group) {
                            return group.group === item.id.replace("-group", "");
                        });

                        var movedGroup = applicationList[oldPosition];
                        var newPosition = _.findIndex(applicationList, function(group) {
                            return group.group === dropArea.id.replace("-drop-area", "");
                        });

                        if (oldPosition > newPosition) {
                            newPosition += 1;
                        }

                        applicationList.splice(oldPosition, 1);
                        applicationList.splice(newPosition, 0, movedGroup);

                        var newOrder = _.map(applicationList, "group").join("|");
                        applicationListService.setGroupsOrder(newOrder);

                    };
                }
            ]);

        return controller;
    }
);
