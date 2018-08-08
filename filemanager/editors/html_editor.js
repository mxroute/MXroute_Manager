/*
# html_editor.js                                  Copyright(c) 2013 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* --------------------------*/
/* DEFINE GLOBALS FOR LINT
/*--------------------------*/
/* global CKEDITOR: true    */
/* --------------------------*/

CPANEL.editor = (function() {

    /* --------------------*/
    /* Shortcuts          */
    /* --------------------*/
    var DOM = YAHOO.util.Dom;

    /* --------------------*/
    /* Application State  */
    /* --------------------*/
    var appData;
    var customConfig;
    var form;

    /**
     * Initialize ckEditor
     *
     * @method initialize
     * @param  {Object} config configuration object
     * @param {Object} data additional data for editor
     */
    var initialize = function(config, data, customPlugins) {

        appData = data;

        // initialize required data in config for editor
        config.appData.imageUploadDir = appData.fileMetaData.dirPath;

        customConfig = config;
        form = DOM.get(appData.formID);

        for (var i = 0, l = customPlugins.length; i < l; i++) {
            console.log("Loading additional plugins: " + customPlugins[i].name);
            CKEDITOR.plugins.addExternal(customPlugins[i].name, customPlugins[i].path, "plugin.js"); // http://docs.cksource.com/ckeditor_api/symbols/CKEDITOR.resourceManager.html#addExternal
        }

        CKEDITOR.replace(data.container, config);

        // Add extra parameters for image upload
        CKEDITOR.on("dialogDefinition", function(dialog) {
            if (dialog.data.name === "image") {
                var user = config.appData;
                var extraParameters = "&dir=" + user.imageUploadDir + "&homeDir=" + user.homeDir + "&baseURL=" + user.baseURL;
                dialog.data.definition.contents[2].elements[0].action += extraParameters;
            }
        });

        // Add class for embedded media content
        CKEDITOR.addCss(".embededContent iframe { background-color: #ccc;}");

        // perform operations on instance ready
        CKEDITOR.on("instanceReady", onConfigureEditor);
    };


    /**
     * Event handler that configures the CKEditor called when
     * the instance is ready.
     *
     * @method onConfigureEditor
     * @param  {EventArg} e Editor event arguments
     */

    function onConfigureEditor(e) {

        var editor = e.editor;

        // ckEditor full screen mode
        editor.execCommand("maximize");
        DOM.replaceClass(form, "cpanelHide", "cpanelShow");
        if (appData.fileContentInfo.content !== undefined) {
            editor.setData(appData.fileContentInfo.content);
        }

        // custom save event
        editor.on("customSave", onSave, false);
        editor.on("customPreview", onPreview, false);

        // Set the focus on the editor
        editor.focus();
    }

    /**
     * Event handler called when the Save File action occurs.
     *
     * @method onSave
     * @param  {EventArg} e Editor event arguments
     */

    function onSave(e) {
        var editor = e.editor;
        if (editor.checkDirty) {
            var content = editor.getData();
            content = YAHOO.lang.trim(content);
            _saveFile(content);
        }
    }

    /**
     * Event handler called when the Preview File action occurs.
     *
     * @method onPreview
     * @param  {EventArg} e Editor event arguments
     */

    function onPreview(e) {
        var editor = e.editor;
        var content = editor.getData();
        content = content.trim();
        var win = window.open("", "CPreview");
        win.document.write(content);
        win.document.close();
    }

    /**
     * Handler for save file successes.
     *
     * @method  _saveSuccess
     * @private
     * @param  {Response} o Ajax Response object
     */

    function _saveSuccess(o) {
        var Dynamic_Notice = CPANEL.ajax.Dynamic_Notice,
            result = o.cpanel_raw,
            successMessage = "",
            notice;

        if (result.messages) {
            successMessage = result.messages.join(" ");
            notice = new Dynamic_Notice({
                content: LOCALE.maketext("Successfully saved the file: [_1]", successMessage),
                level: "success"
            });
        } else {
            notice = new Dynamic_Notice({
                content: LOCALE.maketext("Successfully saved the file."),
                level: "success"
            });
        }
    }

    /**
     * Handler for save file failures.
     *
     * @method  _saveFailure
     * @private
     * @param  {Response} o Ajax Response object
     */

    function _saveFailure(o) {
        var Dynamic_Notice = CPANEL.ajax.Dynamic_Notice,
            result = o.cpanel_raw,
            errorContent = "",
            notice;

        if (result.errors) {
            errorContent = result.errors.join(" ");
            notice = new Dynamic_Notice({
                content: LOCALE.maketext("Failed to saving the file with the following errors: [_1]", errorContent),
                level: "error"
            });
        } else {
            notice = new Dynamic_Notice({
                content: LOCALE.maketext("Failed to saving the file."),
                level: "error"
            });
        }
    }

    /**
     * API call to save the file content
     * @method  _saveFile
     * @private
     * @param  {String} content File content
     */

    function _saveFile(content) {

        var fileMetaData = appData.fileMetaData;

        var callback = {
            success: _saveSuccess,
            failure: _saveFailure
        };

        CPANEL.api({
            version: 3,
            module: "Fileman",
            func: "save_file_content",
            data: {
                dir: fileMetaData.dirPath,
                file: fileMetaData.fileName,
                content: content,
                to_charset: fileMetaData.charset,
                fallback: true
            },
            callback: callback
        });
    }

    return {
        initialize: initialize
    };

})();
