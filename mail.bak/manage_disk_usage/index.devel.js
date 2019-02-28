/*
# base/webmail/paper_lantern/mail/manage_disk_usage/index.devel.js
#                                                    Copyright 2017 cPanel, Inc.
#                                                           All rights reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

require(
    [
        "master/master",
        "app/index"
    ],
    function(MASTER, APP) {
        MASTER();
        APP();
    }
);
