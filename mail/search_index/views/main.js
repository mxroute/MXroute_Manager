/*
# mail/search_index/views/main.js      Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    [
        "angular",
        "cjt/util/locale",
        "app/services/searchIndex",
        "cjt/modules",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/alertList"
    ],
    function(angular, LOCALE) {

        var app = angular.module("cpanel.searchIndex");

        var controller = app.controller(
            "main",
            ["$scope", "searchIndex", "alertService", "PAGE",
                function($scope, $service, $alertService, PAGE) {
                    $scope.reIndexEmail = function() {

                        $alertService.clear();

                        return $service.reIndexEmail().then(function(result) {
                            $alertService.add({
                                message: LOCALE.maketext("The system has initiated a reindex of your email."),
                                replace: true,
                                id: "reIndexStatus",
                                type: "success"
                            });
                            if (result.messages) {
                                result.messages.forEach(function(message) {
                                    $alertService.add({
                                        message: message,
                                        replace: false,
                                        type: "warning"
                                    });
                                });
                            }
                        }).catch(function(error) {
                            $alertService.add({
                                message: LOCALE.maketext("The system encountered an error when it attempted to initiate a reindex of your email: [_1]", error),
                                replace: true,
                                id: "reIndexStatus",
                                type: "danger"
                            });
                        });
                    };
                }
            ]
        );

        return controller;
    }
);
