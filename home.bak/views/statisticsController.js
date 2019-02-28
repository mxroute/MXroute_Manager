/*
 * home/views/statisticsController.js                Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    [
        "lodash",
        "angular",
        "cjt/util/locale",
        "app/services/statisticsService",
        "cjt/directives/spinnerDirective",
        "cjt/decorators/growlDecorator",
        "cjt/decorators/growlAPIReporter",
    ],
    function(_, angular, LOCALE) {
        "use strict";

        var USE_BYTES = {
            format_bytes: true,
            format_bytes_per_second: true, // for CloudLinux
        };

        function _massageStatsDataForDisplay(data) {
            for (var i = 0; i < data.length; i++) {
                var item = data[i];

                var isBytes = !!USE_BYTES[item.formatter];

                var formattedUsage = isBytes ? LOCALE.format_bytes(item.usage) : LOCALE.numf(item.usage);

                var formattedMax = null;
                if (item.formatter === "format_bytes_per_second") {
                    formattedUsage += "/s";

                    // Leave formattedMax null for the unlimited per-second items.
                    if (item.isLimited) {
                        formattedMax = LOCALE.format_bytes(item.maximum) + "/s";
                    }
                } else {
                    formattedMax = !item.isLimited ? "∞" : isBytes ? LOCALE.format_bytes(item.maximum) : LOCALE.numf(item.maximum);
                }

                _.assign(
                    item,
                    {
                        showPercent: !!(item.isLimited && item.maximum),
                        formattedPercent: LOCALE.numf(item.percent),
                        formattedMaximum: formattedMax,
                        formattedUsage: formattedUsage,
                    }
                );
            }

            return data;
        }

        // Retrieve the current application
        var app = angular.module("App");

        var controller = app.controller(
            "statisticsController", [
                "$scope",
                "spinnerAPI",
                "statisticsService",
                "growl",
                "$timeout",
                function(
                    $scope,
                    spinnerAPI,
                    statisticsService,
                    growl,
                    $timeout) {

                    spinnerAPI.start("loadingStatsSpinner");

                    /** We are running into browser limits on the number of
                     *  concurrent HTTP connections. We want these AJAX
                     *  calls to be low priority so that CSS/sprites/etc.
                     *  will load first; otherwise, the UI takes longer to
                     *  be usable.
                     *
                     *  We need to reduce the number of concurrent
                     *  HTTP calls, but for now this stop-gap will
                     *  ensure that AJAX post-back calls don’t delay the
                     *  loading of critical UI resources.
                     */
                    $timeout(function() {
                        statisticsService.fetchExtendedStats().then(function(response) {
                            $scope.statistics = _massageStatsDataForDisplay(response);
                        }).finally(function() {
                            spinnerAPI.stop("loadingStatsSpinner");
                        });
                    });

                    $scope.appUpgradeUrl = PAGE.appUpgradeUrl && ((PAGE.dprefix || "") + PAGE.appUpgradeUrl);

                    $scope.getStatStatus = function(percentage) {

                        if (percentage >= 80) {
                            return "danger";
                        }

                        if (percentage >= 60) {
                            return "warning";
                        }

                        if (percentage >= 40) {
                            return "info";
                        }

                        if (percentage >= 0) {
                            return "success";
                        }
                    };

                }
            ]);

        return controller;
    }
);
