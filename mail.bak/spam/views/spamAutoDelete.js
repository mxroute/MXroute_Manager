/*
# mail/spam/views/spamAutoDelete.js                  Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    [
        "angular",
        "cjt/util/locale",
        "app/services/spamAssassin",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/actionButtonDirective",
        "cjt/validator/datatype-validators",
        "cjt/directives/validationContainerDirective"
    ],
    function(angular, LOCALE, ValidationUtils) {

        "use strict";

        var app = angular.module("cpanel.apacheSpamAssassin");

        var controller = app.controller(
            "spamAutoDelete",
            ["$scope", "spamAssassin",
                function($scope, $service) {

                    var _enable = $service.enableAutoDelete;
                    var _disable = $service.disableAutoDelete;
                    var workingSettings = {};

                    function toggleEnable() {
                        function _done() {
                            workingSettings.spam_auto_delete = $service.spamAssassinSettings.spam_auto_delete;
                        }
                        if (workingSettings.spam_auto_delete) {
                            return _disable().then(_done);
                        }

                        return _enable(workingSettings.spam_auto_delete_score).then(_done);
                    }

                    function updateSpamScore(spamAutoDeleteForm) {
                        return _enable(workingSettings.spam_auto_delete_score).then(function() {
                            spamAutoDeleteForm.$setPristine();
                        });
                    }

                    function _init() {
                        workingSettings = angular.copy($service.spamAssassinSettings);
                    }

                    _init();

                    angular.extend($scope, {
                        spamBoxFeatureEnabled: $service.hasFeature("spamBox"),
                        toggleEnable: toggleEnable,
                        updateSpamScore: updateSpamScore,
                        settings: workingSettings,
                        preferences: $service.userPreferences
                    });

                }
            ]
        );

        return controller;
    }
);
