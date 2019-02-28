/*
# mail/authentication/manage.devel.js             Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

require(
    [
        "master/master",
        "app/manage"
    ],
    function(MASTER, APP) {
        MASTER();
        APP();
    }
);
