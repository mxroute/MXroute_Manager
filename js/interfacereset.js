/* ***** BEGIN LICENSE BLOCK *****

# cpanel12 - interfacereset.js                  Copyright(c) 1997-2008 cPanel, Inc.
#                                                           All Rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited

 * ***** END LICENSE BLOCK *****
  * ***** BEGIN APPLICABLE CODE BLOCK ***** */


var interfaceConfigs = [];

function register_interfacecfg_nvdata(nvname) {
    interfaceConfigs.push(nvname);
}

var reset_all_interface_settings = function(securityToken) {

    var sFormData = "names=" + interfaceConfigs.join("|");
    for (var i = 0; i < interfaceConfigs.length; i++) {
        sFormData += "&" + interfaceConfigs[i] + "=";
        NVData[interfaceConfigs[i]] = "";
    }

    var success_function = function() {
        window.location.reload(true);
    };

    // refresh the page once the ajax call completes
    var callback = {
        success: success_function
    };

    var token = securityToken || CPANEL.security_token;

    if (self.YAHOO) {
        YAHOO.util.Connect.asyncRequest("POST", token + "/frontend/" + window.thisTheme + "/nvset.xml", callback, sFormData);
    } else {
        $.post( token + "/frontend/" + window.thisTheme + "/nvset.xml", sFormData, success_function);
    }
};

register_interfacecfg_nvdata("ignorecharencoding");
