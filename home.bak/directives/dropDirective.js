/*
# home/directives/dropDirective.js                Copyright(c) 2015 cPanel, Inc.
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
         * Directive that adds HTML5 drop functionality to DOM objects
         */
        app.directive("dropArea", [ function() {
            return {
                scope: {
                    drop: "&"
                },
                link: function(scope, element) {
                    var dropAreaElement = element[0];
                    dropAreaElement.addEventListener("dragover", function(e) {
                        e.dataTransfer.dropEffect = "move";
                        if (e.preventDefault) {
                            e.preventDefault();
                        }
                        angular.element(this).addClass("drag-over");
                        return false;
                    }, false);

                    dropAreaElement.addEventListener("dragenter", function() {
                        angular.element(this).addClass("drag-over");
                        return false;
                    }, false);

                    dropAreaElement.addEventListener("dragleave", function() {
                        angular.element(this).removeClass("drag-over");
                        return false;
                    }, false);

                    dropAreaElement.addEventListener("drop", function(e) {
                        if (e.stopPropagation) {
                            e.stopPropagation();
                        }
                        if (e.preventDefault) {
                            e.preventDefault();
                        }
                        angular.element(this).removeClass("drag-over");

                        var dropTarget = this,
                            element = document.getElementById(e.dataTransfer.getData("text"));

                        scope.$apply(function(scope) {
                            var action = scope.drop();
                            if ( angular.isDefined(action) ) {
                                action(element, dropTarget);
                            }
                        });
                        return false;
                    }, false);
                }
            };
        }]);
    }
);
