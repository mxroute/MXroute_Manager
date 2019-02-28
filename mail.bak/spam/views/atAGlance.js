/*
# mail/spam/views/atAGlance.js                       Copyright 2018 cPanel, Inc.
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
        "app/services/spamAssassin"
    ],
    function(angular, _, LOCALE) {

        "use strict";

        var app = angular.module("cpanel.apacheSpamAssassin");

        var controller = app.controller(
            "atAGlance",
            ["$scope", "spamAssassin",
                function($scope, $service) {

                    function toggleAdditionalFeatures(showHide) {
                        $scope.showingAdditionalFeatures = showHide;
                    }

                    function _toggleEnable(key, _enable, _disable) {
                        if ($scope.settings[key]) {
                            return _disable();
                        }

                        return _enable();
                    }

                    function toggleEnable() {
                        return _toggleEnable("spam_enabled", $service.enableSpamAssassin, $service.disableSpamAssassin);
                    }

                    function toggleEnableAutoDelete() {
                        return _toggleEnable("spam_auto_delete", function() {
                            return $service.enableAutoDelete($service.spamAssassinSettings.spam_auto_delete_score);
                        }, $service.disableAutoDelete);
                    }

                    function toggleEnableSpamBox() {
                        return _toggleEnable("spam_box_enabled", $service.enableSpamBox, $service.disableSpamBox);
                    }

                    function whitelistCountString() {
                        return LOCALE.maketext("You currently have [quant,_1,whitelisted item,whitelisted items].", $scope.preferences.whitelist_from.length);
                    }
                    function blacklistCountString() {
                        return LOCALE.maketext("You currently have [quant,_1,blacklisted item,blacklisted items].", $scope.preferences.blacklist_from.length);
                    }
                    function scoreCountString() {
                        return LOCALE.maketext("You currently have [quant,_1,calculated spam score customization, calculated spam score customizations] on this account.", $scope.preferences.score.length);
                    }

                    angular.extend($scope, {
                        settings: $service.spamAssassinSettings,
                        toggleAdditionalFeatures: toggleAdditionalFeatures,
                        toggleEnableAutoDelete: toggleEnableAutoDelete,
                        toggleEnableSpamBox: toggleEnableSpamBox,
                        preferences: $service.userPreferences,
                        toggleEnable: toggleEnable,
                        whitelistCountString: whitelistCountString,
                        blacklistCountString: blacklistCountString,
                        scoreCountString: scoreCountString,
                        showingAdditionalFeatures: false,
                        spamBoxFeatureEnabled: $service.hasFeature("spamBox"),
                        autoDeleteFeatureEnabled: $service.hasFeature("spamAutoDelete"),
                    });

                }
            ]
        );

        return controller;
    }
);
