/*
# base/frontend/paper_lantern/mail/pops/filters/quotaProgressType.js Copyright(c) 2017 cPanel, Inc.
#                                                                              All rights Reserved.
# copyright@cpanel.net                                                            http://cpanel.net
# This code is subject to the cPanel license.                    Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular"
    ],
    function() {

        /**
         * Filter that returns the progress bar class to use based on the percentage used
         * @param {Integer} displayPercentage The percentage (0-100) to check
         * @return {String}                   Returns a string indicating the class name to apply to the progress bar
         *
         * @example
         * <uib-progressbar type="{{ emailAccount.diskusedpercent | quotaProgressType }}" value="emailAccount.diskusedpercent"></uib-progressbar>
         */

        var module;
        try {
            module = angular.module("cpanel.mail.Pops");
        } catch (e) {
            module = angular.module("cpanel.mail.Pops", []);
        }

        module.filter("quotaProgressType", function() {
            return function(displayPercentage) {
                if (displayPercentage >= 80) {
                    return "danger";
                } else if (displayPercentage >= 60) {
                    return "warning";
                } else if (displayPercentage >= 40) {
                    return "info";
                } else {
                    return "success";
                }
            };
        });

    }
);
