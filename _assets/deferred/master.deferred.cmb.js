/*
# _assets/deferred/open-links-on-ios.js              Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global window: false, jQuery: false */

(function() {
    "use strict";

    if (("standalone" in window.navigator) &&
        window.navigator.standalone) {

        // Code to make links open inside the mobile window on iOS
        jQuery(document).ready(function($) {
            $("a").click(function(event) {
                var alink = document.createElement("a");
                alink.href = $(this).attr("href");
                if (alink &&
                    alink.protocol.indexOf("http") !== -1 &&
                    alink.host.indexOf(document.location.host) !== -1) {
                    event.preventDefault();
                    window.location = alink.href;
                }
            });
        });
    }

}());
/*
# _assets/deferred/register-nvdate.js                Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global window: false */

(function() {
    "use strict";

    if (window.register_interfacecfg_nvdata) {
        window.register_interfacecfg_nvdata("closedSpotlights");
    }
}());
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
