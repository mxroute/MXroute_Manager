//~~GENERATED~~
//-------------------------------------------------------------
// Source:    /usr/local/cpanel/base/frontend/paper_lantern/mail/boxtrapper/conf.js
// Generated: /usr/local/cpanel/base/frontend/paper_lantern/mail/boxtrapper/conf-sv.js
// Module:    /paper_lantern/mail/boxtrapper/conf-sv
// Locale:    sv
// This file is generated by the cpanel localization system
// using the bin/_build_translated_js_hash_files.pl script.
//-------------------------------------------------------------
// !!! Do not hand edit this file !!!
//-------------------------------------------------------------
(function() {
    // The raw lexicon.
    var newLex = {"Minimum [asis,Apache] [asis,SpamAssassin] Spam Score required to bypass [asis,BoxTrapper]:":"Lägsta [asis,Apache] [asis,SpamAssassin]-skräppostpoäng för att förbigå [asis,BoxTrapper]:","The minimum spam score must be numeric.":"Den lägsta skräppostpoängen måste vara numerisk.","The number of days that you wish to keep logs and messages in the queue.":"Antalet dagar du vill behålla loggar och meddelanden i kön.","The number of days to keep logs must be a positive integer.":"Antalet dagar som loggarna ska behållas, angett med ett positivt heltal."};

    if (!this.LEXICON) {
        this.LEXICON = {};
    }

    for(var item in newLex) {
        if(newLex.hasOwnProperty(item)) {
            var value = newLex[item];
            if (typeof(value) === "string" && value !== "") {
                // Only add it if there is a value.
                this.LEXICON[item] = value;
            }
        }
    }
})();
//~~END-GENERATED~~
