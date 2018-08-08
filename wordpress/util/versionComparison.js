/*
 * wordpress/util/versionComparison.js                        Copyright 2017 cPanel, Inc.
 *                                                                   All rights Reserved.
 * copyright@cpanel.net                                                 http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying isiteviews prohibited
 */

/* global define: false */

/**
 * TODO: Port to cjt2/util once we merge with the main product since this has general utility.
 */

define([
    "cjt/util/locale",
], function(LOCALE) {

    /**
     * @method  versionCompare
     * @source Derived from: https://gist.github.com/TheDistantSea/8021359
     * @reference http://stackoverflow.com/questions/6832596/how-to-compare-software-version-number-using-js-only-number
     * @param  {String} v1
     * @param  {String} v2
     * @param  {Object} options
     *   @param {Boolean} [options.lexicographical]
     *   @param {Boolean} [options.zeroExtend]
     * @return {Number}
     */
    function versionCompare(v1, v2, options) {

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

        var lexicographical = options && options.lexicographical,
            zeroExtend = options && options.zeroExtend,
            v1parts = v1.split("."),
            v2parts = v2.split(".");

        /**
         * Helper function to validate the phrases in a version.
         * A phrase is any section of a version where sections are
         * separated by periods: [.].
         *
         * @name isValidPhrase
         * @private
         * @param  {String}  phrase
         * @return {Boolean}
         */
        function isValidPhrase(phrase) {
            return (lexicographical ?
                        /^\d+[A-Za-z0-9_-]*$/ :
                        /^\d+$/)
                    .test(phrase);
        }

        if (!v1parts.every(isValidPhrase) ||
            !v2parts.every(isValidPhrase)) {
            return NaN;
        }

        if (zeroExtend) {
            while (v1parts.length < v2parts.length) {
                v1parts.push("0");
            }
            while (v2parts.length < v1parts.length) {
                v2parts.push("0");
            }
        }

        if (!lexicographical) {
            v1parts = v1parts.map(Number);
            v2parts = v2parts.map(Number);
        }

        for (var i = 0; i < v1parts.length; ++i) {
            if (v2parts.length === i) {
                return 1;
            }

            if (v1parts[i] === v2parts[i]) {
                continue;
            }
            else if (v1parts[i] > v2parts[i]) {
                return 1;
            }
            else {
                return -1;
            }
        }

        if (v1parts.length !== v2parts.length) {
            return -1;
        }

        return 0;
    }

    return versionCompare;
});
