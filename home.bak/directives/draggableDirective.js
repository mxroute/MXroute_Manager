/*
# home/directives/draggableDirective.js           Copyright(c) 2015 cPanel, Inc.
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
         * Directive that adds HTML5 draggable functionality to DOM objects
         */
        app.directive("draggable", [ function() {
            return {
                restrict: "A",
                scope: {
                    drag: "&",
                    dragEnd: "&"
                },
                link: function(scope, element) {

                    var dragElement = element[0];
                    dragElement.draggable = true;

                    dragElement.addEventListener("dragstart", function(e) {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text", this.id);
                        angular.element(this).addClass("drag");

                        var element = this;
                        scope.$apply(function(scope) {
                            var action = scope.drag();
                            if ( angular.isDefined(action) ) {
                                action(element.id);
                            }
                        });
                        return false;
                    }, false);

                    dragElement.addEventListener("dragend", function() {
                        angular.element(this).removeClass("drag");

                        var element = this;
                        scope.$apply(function(scope) {
                            var action = scope.dragEnd();
                            if ( angular.isDefined(action) ) {
                                action(element.id);
                            }
                        });

                        return false;
                    }, false);
                }
            };
        }]);
    }
);
