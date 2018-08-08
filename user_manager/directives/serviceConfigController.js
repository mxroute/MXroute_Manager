/*
# user_manager/directives/serviceConfigController.js Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define([
    "angular",
    "cjt/util/test"

], function(angular, TEST) {
    var app = angular.module("App");
    app.controller("serviceConfigController", [
        "$scope",
        "$attrs",
        function($scope, $attrs) {

            /**
             * Does the service need conflict resolution?
             *
             * @method needsConflictResolution
             * @return {Boolean}
             */
            $scope.needsConflictResolution = function() {
                return $scope.hasConflict() && !$scope.isResolved();
            };

            /**
             * Would adding this service create a conflict?
             *
             * @method hasConflict
             * @return {Boolean}
             */
            $scope.hasConflict = function() {
                return $scope.service && $scope.service.isCandidate;
            };

            /**
             * Has the client resolved a conflict? Note that this method does not
             * test to see if there is a conflict in the first place.
             *
             * @method isResolved
             * @return {Boolean}
             */
            $scope.isResolved = function() {
                return $scope.service.willLink || $scope.service.willDismiss;
            };

            /**
             * Is there a link action attribute present?
             *
             * @method hasLinkAction
             * @return {Boolean}
             */
            $scope.hasLinkAction = function() {
                return !!$attrs.linkAction;
            };

            /**
             * Stages a merge candidate for dismissal.
             *
             * @method setDismiss
             */
            $scope.setDismiss = function() {
                $scope.service.willDismiss = true;
                $scope.service.enabled = false;
                $scope.validateConflictResolution();
            };

            /**
             * Stages a merge candidate for linking.
             *
             * @method setLink
             */
            $scope.setLink = function() {
                $scope.service.willLink = true;
                $scope.service.enabled = true;
                $scope.validateConflictResolution();
            };

            /**
             * Clears any existing conflict resolution markers. Used for the undo action.
             *
             * @method clearConflictResolution
             */
            $scope.clearConflictResolution = function() {
                $scope.service.willLink = $scope.service.willDismiss = false;
                $scope.validateConflictResolution();
            };

            /**
             * Stages the service for linking and runs the supplied linkAction method against the parent scope.
             *
             * @method runLinkAction
             * @return {Any}   Returns whatever is returned from the linkAction method.
             */
            $scope.runLinkAction = function() {
                $scope.isLinking = true;
                $scope.setLink();

                if (!$scope.hasLinkAction()) {
                    $scope.isLinking = false;
                    return;
                }

                var ret = $scope.linkAction({ service: $scope.service });

                if (TEST.isQPromise(ret)) {
                    ret.finally(function() {
                        $scope.isLinking = false;
                    });
                } else {
                    $scope.isLinking = false;
                }

                return ret;
            };

            /**
             * Sets validity for the control if conflict resolution is required.
             *
             * @method validateConflictResolution
             */
            $scope.validateConflictResolution = function() {
                if ($scope.conflictResolutionRequired) {
                    $scope.ngModel.$setValidity("conflictCleared", !$scope.needsConflictResolution());
                }
            };

            /**
             * Toggles the expanded/collapsed view of the service conflict summary.
             *
             * @method toggleConflictSummary
             */
            $scope.toggleConflictSummary = function() {
                $scope.isSummaryCollapsed = !$scope.isSummaryCollapsed;
            };
            $scope.isSummaryCollapsed = true;
        }
    ]);
});
