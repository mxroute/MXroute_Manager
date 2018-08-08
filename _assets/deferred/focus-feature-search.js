/*
# _assets/deferred/focus-feature-search.js           Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global window: false, document: false */

(function() {
    "use strict";

    window.addEventListener("load", function() {

        // Don't move the focus if the application
        // has set it to something else already.
        if (document.activeElement) {
            var activeEl = document.activeElement;
            var tag = activeEl.tagName.toLowerCase();
            if (tag === "input" ||
                tag === "select" ||
                tag === "textarea") {
                return;
            }
        }

        // focus feature search input
        var featureSearchInput = document.getElementById("txtQuickFind");

        var indexSearchInput = document.querySelector("#quickjump");

        if (indexSearchInput &&
           indexSearchInput.value &&
           indexSearchInput.value !== "") {
            indexSearchInput.focus();
        } else if (featureSearchInput) {
            featureSearchInput.focus();
        }
    });

}());
