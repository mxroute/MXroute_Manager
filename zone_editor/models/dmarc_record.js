/*
# models/dmarc_record.js                         Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    function() {
        var dmarc_regex = /^[vV]\s*=\s*DMARC1\s*;\s*[pP]\s*=/;
        var dmarc_uri_regex = /^[a-z][a-z0-9+.-]*:[^,!;]+(?:![0-9]+[kmgt]?)?$/i;
        var dmarc_uri_scrub = function(val) {

            /* If the value doesn't have a valid URI scheme and it looks
             * vaguely like an email, turn it into a mailto: URI.  The email
             * check is extremely open ended to allow for internationalized
             * emails, which may be used in mailto: URIs -- no punycode
             * required. */
            // TODO: convert domain to punycode for shorter storage (and better validation)
            if (!/^[a-z][a-z0-9+.-]*:/i.test(val) && /@[^\s@]{2,255}$/.test(val)) {

                /* See https://tools.ietf.org/html/rfc6068#section-2 */
                val = "mailto:" + encodeURI(val).replace(/[\/?#&;=]/g, function(c) {
                    return "%" + c.charCodeAt(0).toString(16);
                });
            }

            /* Additionally, DMARC requires [,!;] to be URI encoded, as they are
             * used specially by DMARC fields. */
            var invalidChars = /[,!;]/g;
            if (invalidChars.test(val)) {

                /* Strip off a valid file size suffix before munging */
                var size = "";
                val = val.replace(/![0-9]+[kmgt]?$/i, function(trail) {
                    size = trail;
                    return "";
                });

                val = val.replace(invalidChars, function(c) {
                    return "%" + c.charCodeAt(0).toString(16);
                });

                val += size;
            }
            return val;
        };

        /**
         * Checks if a variable is defined, null, and not an empty string
         *
         * @method is_defined_and_not_null
         */
        var is_defined_and_not_null = function(val) {
            return val !== void 0 && val !== null && ((typeof val === "string") ? val.length > 0 : true);
        };

        /**
         * Creates a DMARC Record object
         *
         * @class
         */
        function DMARCRecord() {
            this.resetProperties();
        }

        /**
         * Set (or reset) the object properties to defaults
         *
         * @method resetProperties
         */
        DMARCRecord.prototype.resetProperties = function() {
            this.p = "none";
            this.sp = "none";
            this.adkim = "r";
            this.aspf = "r";
            this.pct = 100;
            this.fo = "0";
            this.rf = "afrf";
            this.ri = 86400;
            this.rua = "";
            this.ruf = "";
        };

        DMARCRecord.prototype.validators = {
            p: {
                values: ["none", "quarantine", "reject"],
                defValue: "none"
            },
            sp: {
                values: ["none", "quarantine", "reject"],
            },
            adkim: {
                values: ["r", "s"],
                defValue: "r"
            },
            aspf: {
                values: ["r", "s"],
                defValue: "r"
            },
            rf: {
                multi: ":",
                values: ["afrf", "iodef"],
                defValue: "afrf",
            },
            fo: {
                multi: ":",
                values: ["0", "1", "s", "d"],
                defValue: "0"
            },
            pct: {
                pattern: /^[0-9]{1,2}$|^100$/,
                defValue: 100
            },
            ri: {
                pattern: /^\d+$/,
                defValue: 86400
            },
            rua: {
                multi: ",",
                scrub: dmarc_uri_scrub,
                pattern: dmarc_uri_regex,
                defValue: ""
            },
            ruf: {
                multi: ",",
                scrub: dmarc_uri_scrub,
                pattern: dmarc_uri_regex,
                defValue: ""
            }
        };

        /**
         * Check whether a text string represents a minimal
         * DMARC record
         *
         * @method isDMARC
         * @param {String} stringToTest
         */
        DMARCRecord.prototype.isDMARC = function(stringToTest) {
            return dmarc_regex.test(stringToTest);
        };

        var processValue = function(propValue, validationOpts, filter) {

            /* Split up multi-valued items (as applicable), and strip whitespace */
            var values = [ propValue ];
            if (validationOpts.multi) {
                values = propValue.split(validationOpts.multi).map(function(s) {
                    return s.trim();
                });
            }

            if (validationOpts.scrub) {
                values = values.map(validationOpts.scrub);
            }

            if (filter) {

                /* Define the appropriate test for finding valid entries */
                var test;
                if (validationOpts.pattern) {
                    test = function(val) {
                        return validationOpts.pattern.test(val.toLowerCase());
                    };
                } else if (validationOpts.values) {
                    test = function(val) {
                        return validationOpts.values.indexOf(val.toLowerCase()) > -1;
                    };
                }

                values = filter(values, test);
            }

            var cleanedValue = values.join(validationOpts.multi);
            return cleanedValue;
        };

        /**
         * Validate the value of a given property.
         *
         * @method isValid
         * @param {String} propName
         * @param {String} propValue
         */
        DMARCRecord.prototype.isValid = function(propName, propValue) {
            var isValid;

            /* Return true iff every value is valid */
            processValue(propValue, this.validators[propName], function(values, validator) {
                isValid = values.every(validator);
                return values;
            });

            return isValid;
        };

        /**
         * Validate and save the value of the given property.  Invalid values
         * are stripped from the property.  If no valid values remain, the
         * default value is saved.
         *
         * @method setValue
         * @param {String} propName
         * @param {String} propValue
         * @param {boolean} removeInvalid (optional)
         */
        DMARCRecord.prototype.setValue = function(propName, propValue, removeInvalid) {
            var filter;
            if (removeInvalid) {
                filter = function(values, validator) {
                    return values.filter(validator);
                };
            }

            var cleanedValue = processValue(propValue, this.validators[propName], filter);

            if (cleanedValue.length) {
                if (typeof this[propName] === "number") {
                    this[propName] = parseInt(cleanedValue, 10);
                } else {
                    this[propName] = cleanedValue;
                }
            } else if (propName === "sp") {
                this.sp = this.p;
            } else {
                this[propName] = this.validators[propName].defValue;
            }
        };

        /**
         * Populate the DMARC record properties from a TXT record
         *
         * @method fromTXT
         * @param {String} rawText - The text from a TXT DNS record
         */
        DMARCRecord.prototype.fromTXT = function(rawText) {
            this.resetProperties();

            if (typeof rawText === "string") {
                var properties = rawText.split(";");
                for (var i = 0; i < properties.length; i++) {
                    var keyValue = properties[i].split("=");
                    var propName = keyValue[0].trim().toLowerCase();
                    var propValue = keyValue.slice(1).join("=").trim();
                    if (propName !== "v" && this.hasOwnProperty(propName)) {
                        this.setValue(propName, propValue);
                    }
                }
            }
        };

        /**
         * Return a string version of the DMARC record suitable for saving
         * as a DNS TXT record
         *
         * @method toString
         * @return {String}
         */
        DMARCRecord.prototype.toString = function() {
            var generated_record = "v=DMARC1;p=" + this.p;
            if (is_defined_and_not_null(this.sp)) {
                generated_record += ";sp=" + this.sp;
            }
            if (is_defined_and_not_null(this.adkim)) {
                generated_record += ";adkim=" + this.adkim;
            }
            if (is_defined_and_not_null(this.aspf)) {
                generated_record += ";aspf=" + this.aspf;
            }
            if (is_defined_and_not_null(this.pct)) {
                generated_record += ";pct=" + this.pct;
            }
            if (is_defined_and_not_null(this.fo)) {
                generated_record += ";fo=" + this.fo;
            }
            if (is_defined_and_not_null(this.rf)) {
                generated_record += ";rf=" + this.rf;
            }
            if (is_defined_and_not_null(this.ri)) {
                generated_record += ";ri=" + this.ri;
            }
            if (is_defined_and_not_null(this.rua)) {

                // fix mailto uri list if necessary
                this.setValue("rua", this.rua);
                generated_record += ";rua=" + this.rua;
            }
            if (is_defined_and_not_null(this.ruf)) {

                // fix mailto uri list if necessary
                this.setValue("ruf", this.ruf);
                generated_record += ";ruf=" + this.ruf;
            }
            return generated_record;
        };

        return DMARCRecord;
    }
);
