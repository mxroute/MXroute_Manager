/*
# mail/spam/views/configurations.js                  Copyright 2018 cPanel, Inc.
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
        "app/services/spamAssassin",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/toggleLabelInfoDirective",
        "app/directives/multiFieldEditorItem",
        "app/directives/multiFieldEditor",
        "app/directives/scoreField",
        "cjt/directives/formWaiting"
    ],
    function(angular, _, LOCALE) {

        "use strict";

        var app = angular.module("cpanel.apacheSpamAssassin");

        var controller = app.controller(
            "configurations",
            ["$scope", "$location", "spamAssassin", "userPreferences",
                function($scope, $location, $service, preferences) {

                    function _updatePreference(key) {
                        return $service.updateUserPreference(key, $scope.workingPreferences[key]).then(function() {

                            if (key === "required_score") {

                                // Using drop down, update required_score_select from upstream
                                preferences["required_score_select"] = $scope.workingPreferences["required_score_select"] = preferences["required_score"].toString();
                                $scope.workingPreferences.customRequiredScoreValue = $scope.workingPreferences.required_score;
                                preferences.customRequiredScoreValue = $scope.workingPreferences.required_score;
                                _updateKeyPristine("required_score_select");
                                _updateKeyPristine("customRequiredScoreValue");
                            }

                            _updateKeyPristine(key);
                        });
                    }

                    var _preferencePristine = {};
                    $scope.workingPreferences = {};
                    $scope.customRequiredScore = {
                        score: "custom",
                        label: LOCALE.maketext("Custom")
                    };

                    function updateWhitelistFrom() {
                        return _updatePreference("whitelist_from");
                    }

                    function updateBlacklistFrom() {
                        return _updatePreference("blacklist_from");
                    }

                    function updateRequiredScore() {
                        if ($scope.workingPreferences["required_score_select"] !== "custom") {

                            // Using drop down, update required_score before sending it upstream
                            $scope.workingPreferences["required_score"] = Number($scope.workingPreferences["required_score_select"]);
                        } else {
                            $scope.workingPreferences["required_score"] = $scope.workingPreferences.customRequiredScoreValue;
                        }
                        return _updatePreference("required_score").then(_updateRequiredScoreOptions);
                    }

                    function updateTestingScores() {
                        return _updatePreference("score");
                    }

                    function checkPristine(key) {
                        return _preferencePristine[key];
                    }

                    function disableSpamAssassin() {
                        return $service.disableSpamAssassin().then(function() {
                            $location.path("/");
                        });
                    }

                    function _updateRequiredScoreOptions() {

                        $scope.requiredScoreOptions = [
                            { score: 1, label: LOCALE.maketext("Aggressive, Many False Positives ([_1])", 1) },
                            { score: 4, label: LOCALE.maketext("Recommended for Well-Tested Servers ([_1])", 4) },
                            { score: 5, label: LOCALE.maketext("Default ([_1])", 5) },
                            { score: 8, label: LOCALE.maketext("Recommended For Internet service providers ([_1])", 8) },
                            { score: 10, label: LOCALE.maketext("Passive, Only Very Obvious Spam ([_1])", 10) },
                            $scope.customRequiredScore
                        ];

                        var currentScoreIndex = [1, 4, 5, 8, 10].indexOf($scope.workingPreferences.required_score);
                        $scope.workingPreferences.customRequiredScoreValue = $scope.workingPreferences.required_score;

                        if (currentScoreIndex === -1) {

                            $scope.workingPreferences["required_score_select"] = "custom";

                            // Sort doesn't do equals because there are no duplicates
                            $scope.requiredScoreOptions = $scope.requiredScoreOptions.sort(function(a, b) {
                                return a.score > b.score ? 1 : -1;
                            });
                        } else {

                            // Exists, suppliment with "current"
                            $scope.requiredScoreOptions[currentScoreIndex].label += " (" + LOCALE.maketext("Current") + ")";
                        }

                    }

                    function getRequiredScoreOptions() {
                        if ($scope.requiredScoreOptions) {
                            return $scope.requiredScoreOptions;
                        }

                        _updateRequiredScoreOptions();

                        return $scope.requiredScoreOptions;

                    }

                    function _updateKeyPristine(key) {
                        _preferencePristine[key] = _.isEqual($scope.workingPreferences[key], preferences[key]);
                    }

                    function _watchKey(key, collection) {
                        var watchFunction = collection ? "$watchCollection" : "$watch";
                        $scope[watchFunction]("workingPreferences." + key, function(newValue, oldValue) {
                            _updateKeyPristine(key);
                        });
                    }

                    function _init() {
                        $scope.workingPreferences = angular.copy(preferences);
                        preferences.customRequiredScoreValue = $scope.workingPreferences.required_score;
                        $scope.workingPreferences.customRequiredScoreValue = $scope.workingPreferences.required_score;


                        ["required_score", "required_score_select", "customRequiredScoreValue"].forEach(function(key) {
                            _watchKey(key);
                        });

                        ["score", "whitelist_from", "blacklist_from"].forEach(function(key) {
                            _watchKey(key, true);
                        });

                        preferences.required_score_select = $scope.workingPreferences.required_score_select = $scope.workingPreferences.required_score.toString();
                    }

                    angular.extend($scope, {
                        settings: $service.spamAssassinSettings,
                        getSymbolicTestNames: $service.getSymbolicTestNames,
                        symbolicTestNames: $service.symbolicTestNames,
                        updateWhitelistFrom: updateWhitelistFrom,
                        updateBlacklistFrom: updateBlacklistFrom,
                        updateRequiredScore: updateRequiredScore,
                        updateTestingScores: updateTestingScores,
                        disableSpamAssassin: disableSpamAssassin,
                        getRequiredScoreOptions: getRequiredScoreOptions,
                        checkPristine: checkPristine
                    });

                    _init();

                }
            ]
        );

        return controller;
    }
);
