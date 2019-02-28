//~~GENERATED~~
//-------------------------------------------------------------
// Source:    /usr/local/cpanel/base/frontend/paper_lantern/version_control/services/sshKeyVerification.js
// Generated: /usr/local/cpanel/base/frontend/paper_lantern/version_control/services/sshKeyVerification-zh.js
// Module:    /paper_lantern/version_control/services/sshKeyVerification-zh
// Locale:    zh
// This file is generated by the cpanel localization system
// using the bin/_build_translated_js_hash_files.pl script.
//-------------------------------------------------------------
// !!! Do not hand edit this file !!!
//-------------------------------------------------------------
(function() {
    // The raw lexicon.
    var newLex = {"The current identity of the SSH server at “[output,strong,_1]” does not match its identity in your account’s [asis,known_hosts] file.":"The current identity of the SSH server at “[output,strong,_1]” does not match its identity in your account’s [asis,known_hosts] file.","You have not connected this [asis,cPanel] account to the SSH server for “[output,strong,_1].” The system cannot verify the server’s identity.":"You have not connected this [asis,cPanel] account to the SSH server for “[output,strong,_1].” The system cannot verify the server’s identity."};

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
