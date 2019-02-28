/*
# _assets/deferred/duplicate-id-warning.js           Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global console: false */

/**
 * Validates that there are not any duplicate ids. Only runs in debug mode.
 */
(function() {
    "use strict";

    // Warning Duplicate IDs
    var ids = {};

    if (document.querySelectorAll) {
        var els = document.querySelectorAll("[id]");
        for (var i = 0; i < els.length; i++ ) {
            var el = els[i];
            if (ids[el.id]) {
                console.warn("Duplicate ID #" + el.id); // eslint-disable-line no-console
            }
            ids[el.id] = 1;
        }
    }

}());
