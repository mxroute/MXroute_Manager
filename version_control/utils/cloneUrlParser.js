/*
 * version_control/utils/cloneUrlParser.js         Copyright(c) 2018 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* eslint-env amd */

define(function() {
    "use strict";

    function parseCloneUrl(cloneUrl) {

        var parts = {};

        if (!cloneUrl) {
            return parts;
        }

        parts.scheme = parseUrlParts(cloneUrl.match(/^\S+:\/\//i));
        parts.userInfo = parseUrlParts(cloneUrl.match(/^\S+@/i));
        parts.ipv6Authority = parseUrlParts(cloneUrl.match(/^\[\S+\]/i));
        if (parts.ipv6Authority) {
            parts.ipv6Authority = parts.ipv6Authority.replace(/(\[|\])/gi, "");
        }
        parts.authority = ( parts.ipv6Authority === null ) ? parseUrlParts(cloneUrl.split(/((:\d+\/)|(\/|:))/i)) : null;
        parts.port = parseUrlParts(cloneUrl.match(/^:(\d+)/i), 1); // Parse out the port if it exists.
        parts.path = parseUrlParts(cloneUrl.match(/^\S+/i));
        parts.unparsed = cloneUrl;

        function parseUrlParts(matches, returnIndex) {
            returnIndex = returnIndex || 0;
            if ( matches !== null && matches.length > 0 ) {
                cloneUrl = cloneUrl.replace(matches[0], "");
                return matches[returnIndex];
            }
            return null;
        }

        return parts;
    }

    return {
        parse: parseCloneUrl,
    };

});
