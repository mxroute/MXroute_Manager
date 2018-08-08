/*
# zone_editor/directives/convert_to_full_record_name.js           Copyright(c) 2016 cPanel, Inc.
#                                                                           All rights Reserved.
# copyright@cpanel.net                                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */
define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        var app = angular.module("cpanel.zoneEditor");
        app.directive("convertToFullRecordName",
            ["Zones",
                function(Zones) {
                    return {
                        restrict: "A",
                        require: "ngModel",
                        scope: {
                            domain: "="
                        },
                        link: function(scope, element, attrs, ngModel) {

                        // we cannot work without ngModel
                            if (!ngModel) {
                                return;
                            }

                            function format_zone(event_name) {
                                var full_record_name = Zones.format_zone_name(scope.domain, ngModel.$viewValue);
                                if (full_record_name !== ngModel.$viewValue) {
                                    ngModel.$setViewValue(full_record_name, event_name);
                                    ngModel.$render();
                                }
                            }

                            element.on("blur", function() {
                                format_zone("blur");
                            });

                            // trigger on Return/Enter
                            element.on("keydown", function(event) {
                                if (event.keyCode === 13) {
                                    format_zone("keydown");
                                }
                            });
                        }
                    };
                }
            ]);

    }
);
