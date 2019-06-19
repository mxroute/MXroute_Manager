/*
# api_tokens/views/manage.js                       Copyright 2019 cPanel, L.L.C.
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
        "app/services/apiTokens",
        "app/filters/htmlSafeString",
        "app/validators/uniqueTokenName",
        "cjt/modules",
        "cjt/services/alertService",
        "cjt/directives/actionButtonDirective",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/indeterminateState"
    ],
    function(angular, _, LOCALE, APITokensService, HTMLSafeStringFilter) {

        "use strict";

        var CSSS_COMPONENT_NAME = "manageAPITokenView";
        var VIEW_TITLE = LOCALE.maketext("Manage [asis,API] Token");
        var MODULE_NAMESPACE = "cpanel.apiTokens.views.manage";
        var TEMPLATE_URL = "views/manage.ptt";
        var MODULE_DEPENDANCIES = [
            "cjt2.directives.validationContainer",
            "cjt2.directives.validationItem",
            "cjt2.directives.toggleSwitch",
            "cjt2.directives.search",
            "cjt2.directives.indeterminateState",
            HTMLSafeStringFilter.namespace
        ];

        var CONTROLLER_INJECTABLES = ["$scope", "$location", "$routeParams", "alertService", APITokensService.serviceName, "componentSettingSaverService", "CAN_CREATE_LIMITED", "apiTokens"];
        var CONTROLLER_NAME = "ManageTokenController";
        var CONTROLLER = function APITokensListController($scope, $location, $routeParams, $alertService, $service, $CSSS, CAN_CREATE_LIMITED, apiTokens) {

            $scope.pageTitle = VIEW_TITLE;
            $scope.RTL = LOCALE.is_rtl();
            $scope.showAllHelp = false;
            $scope.ui = {
                confirmingRevocation: false
            };
            $scope.selectedFeatures = [];
            $scope.checkAll = {
                all: false
            };
            $scope.apiTokens = apiTokens;
            $scope.working = {};


            /**
             * Initate the view
             *
             */
            $scope.init = function init() {
                $CSSS.register(CSSS_COMPONENT_NAME).then(function CSSSLoaded(data) {
                    if (data) {
                        $scope.showAllHelp = data.showAllHelp;
                        $scope.stayOnView = data.stayOnView;
                    }
                });

                var currentTokenID = $routeParams["token"];
                var currentToken = $service.getTokenById(currentTokenID);

                if (!currentToken) {
                    $location.path("/");
                    return;
                }

                // For contingency of shipping without limited
                $scope.canEditFeatureRestrictions = !currentToken.unrestricted || CAN_CREATE_LIMITED;

                $scope.current = currentToken;
                $scope.working = {
                    name: currentToken.id,
                    unrestricted: currentToken.unrestricted,
                    features: {}
                };

                currentToken.features.forEach(function(feature) {
                    $scope.working.features[feature] = true;
                    $scope.selectedFeatures.push(feature);
                });

                if (!$scope.current.unrestricted) {
                    $service.getFeatures().then($scope._featuresLoaded);
                }

            };

            /**
             * Update the nvdata saved
             *
             * @private
             *
             */
            $scope._updateCSSS = function _updateCSSS() {
                $CSSS.set(CSSS_COMPONENT_NAME, {
                    showAllHelp: $scope.showAllHelp
                });
            };

            /**
             * Set the scope features to the passed features
             *
             * @param {Array<Object>} features
             */
            $scope._featuresLoaded = function _featuresLoaded(features) {
                $scope.features = features;
            };

            /**
             * Toggle Showing or Hiding All help
             *
             */
            $scope.toggleHelp = function toggleHelp() {
                $scope.showAllHelp = !$scope.showAllHelp;
                $scope._updateCSSS();
            };

            $scope._tokenRenamed = function _tokenRenamed(originalName, newName) {
                $alertService.success(LOCALE.maketext("You have successfully renamed the API Token “[_1]” to “[_2]”.", _.escape(originalName), _.escape(newName)));
            };

            $scope._renameToken = function _renameToken(originalName, newName) {
                return $service.renameToken(originalName, newName).then($scope._tokenRenamed.bind($scope, originalName, newName));
            };

            $scope._getFeatureById = function _getFeatureById(id) {
                var features = $scope.features;
                for (var i = 0; i < features.length; i++) {
                    if (features[i].id === id) {
                        return features[i];
                    }
                }
                return;
            };

            $scope._tokenRestrictionUpdated = function _tokenRestrictionUpdated(tokenName, unrestricted, features) {
                if (unrestricted) {
                    $alertService.success({
                        message: LOCALE.maketext("You have successfully set the [asis,API] token “[_1]” to unrestricted.", _.escape(tokenName)),
                        replace: false
                    });
                } else {
                    var featureNames = features.map(function(featureId) {
                        return $scope._getFeatureById(featureId).label;
                    }).map(_.escape);
                    $alertService.success({
                        message: LOCALE.maketext("The [asis,API] Token “[_1]” is now limited to the following features: [list_and_quoted,_2].", tokenName, featureNames),
                        replace: false
                    });
                }
            };

            /**
             * Update the token
             *
             * @param {Object} workingToken
             * @returns {Promise<String>} returns the promise chain
             */
            $scope.update = function update(workingToken) {
                var originalToken = $scope.current;
                var updatePromise;
                var updatingRestrictions = workingToken.unrestricted !== $scope.current.unrestricted || $scope.selectedFeatures.sort().join() !== $scope.current.features.sort().join();
                if (originalToken.id !== workingToken.name) {

                    // Rename it
                    updatePromise = $scope._renameToken(originalToken.id, workingToken.name);

                    // If we're not also updating restrictions, add the finally.
                    if (!updatingRestrictions) {
                        updatePromise.finally($scope.backToListView);
                    }
                }

                if (updatingRestrictions) {
                    var updateRestriction = $service.updateTokenRestrictions.bind($service, workingToken.name, workingToken.unrestricted, $scope.selectedFeatures);
                    var _restrictionUpdated = $scope._tokenRestrictionUpdated.bind($scope, workingToken.name, workingToken.unrestricted, $scope.selectedFeatures);
                    if (updatePromise) {
                        updatePromise.then(updateRestriction).then(_restrictionUpdated);
                    } else {
                        updatePromise = updateRestriction().then(_restrictionUpdated);
                    }

                    updatePromise.finally($scope.backToListView);

                }
                return updatePromise;
            };

            /**
             * Hide or Reveal the Feature Chooser
             *
             */
            $scope.unrestrictedToggled = function unrestrictedToggled() {
                if (!$scope.working.unrestricted && !$scope.features) {

                    // load the features
                    $service.getFeatures().then($scope._featuresLoaded);
                }
            };

            /**
             * Toggle (de)selecting all features in the feature chooser
             *
             */
            $scope.toggleSelectAllFeatures = function toggleSelectAllFeatures() {
                $scope.working.features = $scope.working.features || {};
                if ($scope.selectedFeatures.length < $scope.features.length) {
                    $scope.features.forEach(function selectAll(feature) {
                        $scope.working.features[feature.id] = true;
                    });
                } else {
                    $scope.features.forEach(function selectAll(feature) {
                        $scope.working.features[feature.id] = false;
                    });
                }

                $scope.updateSelectedFeatures();
            };

            /**
             * Determine if a partial number of items is selected
             *
             * @returns {Booolean} indeterminate state
             */
            $scope.getFeaturesIndeterminateState = function getFeaturesIndeterminateState() {
                return $scope.selectedFeatures.length && $scope.features.length && $scope.features.length !== $scope.selectedFeatures.length;
            };

            /**
             * Update the selected features list
             *
             */
            $scope.updateSelectedFeatures = function updateSelectedFeatures() {
                $scope.selectedFeatures = [];
                angular.forEach($scope.working.features, function(featureSelected, featureKey) {
                    if (featureSelected) {
                        $scope.selectedFeatures.push(featureKey);
                    }
                });
            };

            /**
             * Return to the lister view
             *
             */
            $scope.backToListView = function backToListView() {
                $location.path("/");
            };

            /**
             * Show the revocation confirmation dialog
             *
             */
            $scope.showRevokeConfirm = function showRevokeConfirm() {
                $scope.ui.confirmingRevocation = true;
            };

            /**
             * Hide the revocation confirmation dialog
             *
             */
            $scope.hideRevokeConfirm = function hideRevokeConfirm() {
                $scope.ui.confirmingRevocation = false;
            };

            /**
             * Notify user of the success of a token revocation
             *
             * @param {String} token
             */
            $scope._tokenRevoked = function _tokenRevoked(token) {
                $alertService.success(  LOCALE.maketext("You have successfully revoked the following [asis,API] [numerate,_1,token,tokens]: “[_1]”", _.escape(token)) );
            };

            /**
             * Revoke a token
             *
             * @param {APIToken} token
             * @returns {Promise} revocation promise
             */
            $scope.revokeToken = function revokeToken(token) {

                return $service.deleteTokens([token.id]).then( $scope._tokenRevoked.bind($scope, token.id) ).then( $scope.backToListView );

            };

            $scope.$on("$destroy", $CSSS.unregister.bind($CSSS, CSSS_COMPONENT_NAME));

            $scope.init();

        };

        var app = angular.module(MODULE_NAMESPACE, MODULE_DEPENDANCIES);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES.concat(CONTROLLER));

        var resolver = {
            "apiTokens": [ APITokensService.serviceName, function($service) {
                return $service.fetchTokens();
            }]
        };

        return {
            "id": "manageAPIToken",
            "route": "/manage",
            "controller": CONTROLLER_NAME,
            "class": CONTROLLER,
            "templateUrl": TEMPLATE_URL,
            "title": VIEW_TITLE,
            "namespace": MODULE_NAMESPACE,
            "showResourcePanel": true,
            "resolve": resolver
        };
    }
);
