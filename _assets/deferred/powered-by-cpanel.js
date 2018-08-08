/*
# _assets/deferred/powered-by-cpanel.js              Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global window: false */

(function() {
    "use strict";

    // Code to make sure that powered by cpanel is
    // not removed by third party plugins or JavaScript
    window.addEventListener("load", function() {
        var img = document.getElementById("imgPoweredByCpanel");
        if (img === null ||
            img.getAttribute("src") !== window.MASTER.poweredByUrl) {
            window.location = "/";
        }
    });
}());
