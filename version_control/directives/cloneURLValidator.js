/*
# version_control/directives/cloneURLValidator.js  Copyright(c) 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "app/utils/cloneUrlParser",
        "cjt/util/locale",
        "cjt/validator/validator-utils",
        "cjt/validator/ip-validators",
        "cjt/validator/domain-validators",
        "cjt/validator/validateDirectiveFactory",
    ],
    function(angular, cloneUrlParser, LOCALE, validationUtils, IP_VALIDATOR, DOMAIN_VALIDATOR) {
        "use strict";

        var cloneURLValidator = {

            /**
             * Validate a git-based clone url.
             *
             * Does not validate local paths like: file:///path/to/repo.git/ and /path/to/repo.git/
             *
             * @method validCloneUrl
             * @param {String} cloneUrl - Check if this is a valid clone url.
             * @return {object} result - Validator-Utils result.
             */
            validCloneUrl: function(cloneUrl) {
                var result = validationUtils.initializeValidationResult();

                // Check for blank string.
                if (typeof cloneUrl === "undefined" || cloneUrl === null) {
                    result.isValid = false;
                    result.add("cloneURLValidator", LOCALE.maketext("You must specify a valid clone URL."));
                    return result;
                }

                var parts = cloneUrlParser.parse(cloneUrl);
                var scheme = parts.scheme;
                var userInfo = parts.userInfo;
                var ipv6Authority = parts.ipv6Authority;
                var authority = parts.authority;
                var path = parts.path;
                var unparsed = parts.unparsed;

                // Check for valid protocols (http:// | https:// | ssh:// | git://)
                var protocolPattern = /^(?:git|ssh|https?)(?::\/\/)$/i;
                var hasValidProtocol = protocolPattern.test(scheme);

                // Check for invalid username and password (user:pass@)
                var userAndPassPattern = /^\S+:\S+@/i;
                if ( userAndPassPattern.test(userInfo) ) {
                    result.isValid = false;
                    result.add("cloneURLValidator", LOCALE.maketext("The clone URL [output,strong,cannot] include a password."));
                    return result;
                }

                // Check for valid username (username@)
                var emailPattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@/i;
                var hasValidUser = emailPattern.test(userInfo);

                // Assess if provided scheme and user@ is valid
                var preDomainValid = false;
                if ( hasValidProtocol && hasValidUser ) { // has both
                    preDomainValid = true;
                }
                if ( hasValidProtocol ^ hasValidUser ) { // has one or the other

                    // Prevents invalid non-required protocol.
                    if ( !hasValidProtocol && scheme !== null ) {
                        result.isValid = false;
                        result.add("cloneURLValidator", LOCALE.maketext("The provided clone URL [output,strong,must] include a valid protocol."));
                        return result;
                    }

                    preDomainValid = true;
                }
                if ( !preDomainValid ) {
                    result.isValid = false;
                    result.add("cloneURLValidator", LOCALE.maketext("Clone URLs [output,strong,must] include a valid protocol or username."));
                    return result;
                }

                // Check for valid ipv6
                if ( ipv6Authority !== null ) {
                    var validIPV6 = IP_VALIDATOR.methods.ipv6(ipv6Authority);

                    if ( !validIPV6.isValid ) {
                        var errorMsg = combineErrorMessages(validIPV6.messages);

                        result.isValid = false;
                        result.add("cloneURLValidator", errorMsg);
                        return result;
                    }
                }

                // Check for valid ipv4 or domain name
                if ( authority !== null &&  authority !== "") {

                    var validIPV4 = IP_VALIDATOR.methods.ipv4(authority);
                    var validFQDN = DOMAIN_VALIDATOR.methods.fqdn(authority);

                    if ( !validIPV4.isValid && !validFQDN.isValid ) {
                        result.isValid = false;
                        result.add("cloneURLValidator", LOCALE.maketext("The clone URL [output,strong,must] include a valid IP address or a fully-qualified domain name."));
                        return result;
                    }

                // If there is no valid ipv4, ipv6, or domain name
                } else if ( ipv6Authority === null ) {
                    result.isValid = false;
                    result.add("cloneURLValidator", LOCALE.maketext("The clone URL [output,strong,must] include a valid IP address or a fully-qualified domain name."));
                    return result;
                }

                // Check for ip/domain -> path delimiter: if there is a protocol and path starts with : then throw error
                var scpSyntaxPattern = /^:/i;
                var hasSCPsyntaxPathStart = scpSyntaxPattern.test(path);
                if ( hasValidProtocol && hasValidUser && hasSCPsyntaxPathStart ) {
                    result.isValid = false;
                    result.add("cloneURLValidator", LOCALE.maketext("The repository path should [output,strong,not] begin with “:” if it includes the protocol."));
                    return result;
                }

                // Check for valid path with .git extension (:|/ + path + .git? + /? )
                // This could also indicate a problem with the port number format.
                // This ignores any query string vars or page anchors.
                var pathAndExtensionPattern = /^(:|\/)\S*(\.git)?\/?/i;
                var hasValidPath = pathAndExtensionPattern.test(path);
                if ( !hasValidPath ) {
                    result.isValid = false;
                    result.add("cloneURLValidator", LOCALE.maketext("The path or port number is [output,strong,not] valid."));
                    return result;
                }

                // Check for any left over cloneUrl parts that indicates spaces were used in the URL construction.
                if ( unparsed !== "" ) {
                    result.isValid = false;
                    result.add("cloneURLValidator", LOCALE.maketext("The clone URL [output,strong,cannot] include whitespace characters."));
                    return result;
                }

                return result;

                /**
                 * Private method to combine all validation error messages from other validators.
                 * This method is used to reduce the number of LOCALE.maketext calls via re-useability.
                 *
                 * @method combineErrorMessages
                 * @param {array} msgArr - An array of messages from the validation-utils :: ValidationResult object.
                 * @return {string} msg - All messages combined into one string.
                 */
                function combineErrorMessages(msgArr) {
                    var msg = "";

                    for ( var a = 0, len = msgArr.length; a < len; a++ ) {
                        msg += ( a !== len - 1 ) ? (msgArr[a].message + " ") : msgArr[a].message;
                    }

                    return msg;
                }
            }
        };

        var validatorModule = angular.module("cjt2.validate");

        validatorModule.run(["validatorFactory",
            function(validatorFactory) {
                validatorFactory.generate(cloneURLValidator);
            }
        ]);

        return {
            methods: cloneURLValidator,
            name: "clone-url-validator",
            description: "Validation on git-based clone URLs.",
            version: 1.0
        };
    }
);
