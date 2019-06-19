/*
# mail/search_index/index.devel.js                  Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/*
# account_preferences/index.devel.js               Copyright 2019 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

// Loads the application with the non-combined files
require(
    [
        "master/master",
        "app/index"
    ],
    function(MASTER, APP) {

        "use strict";

        MASTER();
        APP();
    }
);
