/*
# mail/spam/views/spamBox.js      Copyright 2018 cPanel, Inc.
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
        "cjt/directives/actionButtonDirective"
    ],
    function(angular, LOCALE) {

        "use strict";

        var app = angular.module("cpanel.apacheSpamAssassin");

        var controller = app.controller(
            "spamBox",
            ["$scope", "spamAssassin",
                function($scope, $service) {

                    var _enable = $service.enableSpamBox;
                    var _disable = $service.disableSpamBox;
                    var folderSizeSet = false;

                    function _getSpamBoxSize() {
                        if (folderSizeSet) {
                            return;
                        }

                        folderSizeSet = true;
                        return $service.getSpamBoxSize().then(function(size) {
                            $scope.folderSizeString = LOCALE.format_bytes(size);
                            $scope.folderSize = size;
                        }, function() {
                            folderSizeSet = false;
                        });
                    }

                    function toggleEnable() {
                        if ($scope.settings.spam_box_enabled) {
                            return _disable();
                        }

                        return _enable();
                    }

                    function _clearDefaultFolder() {
                        return $service.clearSpamBoxFolder().then(function() {
                            folderSizeSet = false;
                            return _getSpamBoxSize();
                        });
                    }

                    function _clearAllSpamBoxFolders() {
                        return $service.clearAllSpamBoxFolders().then(function() {
                            folderSizeSet = false;
                            return _getSpamBoxSize();
                        }).finally(function() {
                            $scope.showConfirmClearAll = false;
                        });
                    }

                    function _toggleConfirmDeleteAll() {
                        $scope.showConfirmClearAll = !$scope.showConfirmClearAll;
                    }

                    angular.extend($scope, {
                        toggleEnable: toggleEnable,
                        showConfirmClearAll: false,
                        folderSize: 0,
                        clearFolder: _clearDefaultFolder,
                        clearAllSpamBoxFolders: _clearAllSpamBoxFolders,
                        settings: $service.spamAssassinSettings,
                        preferences: $service.userPreferences,
                        toggleConfirmDeleteAll: _toggleConfirmDeleteAll,
                    });

                    $scope.$watch("settings.spam_box_enabled", function() {
                        if ($scope.settings.spam_box_enabled) {
                            _getSpamBoxSize();
                        }
                    });

                }
            ]
        );

        return controller;
    }
);
