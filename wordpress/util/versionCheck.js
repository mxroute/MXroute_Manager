/* wordpress/util/versionCheck.js                             Copyright 2017 cPanel, Inc.
 *                                                                   All rights Reserved.
 * copyright@cpanel.net                                                 http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying isiteviews prohibited
 */

/* global define: false */

/**
 * NOTES:
 *   1) These rules are derived from the wordpress.org description of major
 *   and minor updates described here:
 *
 *   https://make.wordpress.org/core/handbook/about/release-cycle/version-numbering/
 */

define([
    "cjt/util/locale",
    "lodash"
], function(LOCALE, _) {

    /**
     * Checks if the upgrade between two version is a major upgrade.
     * Note, if v2 is not an upgrade to v1 then the function returns false.
     *
     * We will assume the the first 2 digits always exist in the version
     * number.
     *
     * @method  isMajorUpgrade
     * @param  {String} v1
     * @param  {String} v2
     * @return {Boolean}
     */
    function isMajorUpgrade(v1, v2) {

        // Validate the inputs
        if (_.isUndefined(v1) ||
            _.isUndefined(v2) ||
            typeof(v1) !== "string" ||
            typeof(v2) !== "string") {
            throw new Error(LOCALE.maketext("You must pass two string arguments to the version comparison."));
        }

        if (v1 === "" || v2 === "") {
            throw new Error(LOCALE.maketext("You must pass two defined string arguments to the version comparison. These usually resemble a form similar to: 1.0.0.1."));
        }

        if (v1 === v2) {
            return false;
        }

        var v1Parts = v1.split(/[.]/);
        var v2Parts = v2.split(/[.]/);

        // 1 => 2 (1.?.? => 2.0.0)  // major upgrade
        // 1 => 1.1 (1.0 => 1.1)    // major upgrade
        if ((v1Parts[0] < v2Parts[0]) ||
            (v1Parts[0] === v2Parts[0] && v1Parts[1] < v2Parts[1])) {
            return true;
        }
        return false;
    }

    /**
     * Checks if the upgrade between two version is a minor upgrade.
     * Note, if v2 is not an upgrade to v1 then the function returns false.
     *
     * The third digit in the version may or may not be present. A missing
     * digit is assumed to be 0.
     *
     * @method  isMinorUpgrade
     * @param  {String} v1
     * @param  {String} v2
     * @return {Boolean}
     */
    function isMinorUpgrade(v1, v2) {

        // Validate the inputs
        if (typeof(v1) === "undefined" ||
            typeof(v2) === "undefined" ||
            typeof(v1) !== "string" ||
            typeof(v2) !== "string") {
            throw new Error(LOCALE.maketext("You must pass two string arguments to the version comparison."));
        }

        if (v1 === "" || v2 === "") {
            throw new Error(LOCALE.maketext("You must pass two defined string arguments to the version comparison. These usually resemble a form similar to: 1.0.0.1."));
        }

        if (v1 === v2) {
            return false;
        }

        var v1Parts = v1.split(/[.]/);
        var v2Parts = v2.split(/[.]/);

        // Auto extend the 0s
        if (v1Parts.length === 2) {
            v1Parts.push("0");
        }
        if (v2Parts.length === 2) {
            v2Parts.push("0");
        }

        if (v1Parts[0] === v2Parts[0] && v1Parts[1] === v2Parts[1]) {
            return v1Parts[2] < v2Parts[2];
        }
        return false;
    }

    return {
        isMajorUpgrade: isMajorUpgrade,
        isMinorUpgrade: isMinorUpgrade,
    };
});
