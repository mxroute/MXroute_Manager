/*
# filemanager.js                             Copyright(c) 1997-2018 cPanel, Inc.
#                                                           All Rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
#
# Portions Copyright (c) 2006, Yahoo! Inc.
# All rights reserved.  See ../yui/license.txt for those portions only.
*/

/* global homedir: false, LANG: false */

/* eslint-disable camelcase, strict, no-unused-vars */

var searchDataSource;
var homeicon = "<span class=\"fas fa-home\"></span>";
var EDITOR_SIZE_LIMIT = 1048576; // 1024 * 1024
var useaspx = 0;
var inited_panels = {};
var DDM = YAHOO.util.DDM;
var loaded_docroots = 0;
var web_docroots = {};
var cwd;

var usejson = 1;
var TEXT_FIELD_FOCUS = 0;

var CtrlKeyPressed = 0;
var AltKeyPressed = 0;
var SVis = 0;
var selectedFilesCount = 0;
var locCache = {};

var selectedFilesCache = {};

var updatecallback;

var waitpanel;
var resultspanel;

var filesDataTable;
var searchDataTable;

var lastSelectTime = 0;
var viewportHeight = 0;
var selectWindowRegion;
var selectStartX = 0;
var selectStartY = 0;
var selectMode = 0;
var selector = null;
var selectEl = null;
var selectorEl = null;
var selectOvers = {};
var selectStartScrollLeft;
var selectStartScrollTop;

var NAME_COLUMN_MINIMUM_WIDTH = 200;

var TABLE_HEADER_HEIGHT = 47; // height of the table header + margin + border
var GUTTER_SPACE = 12;

var closeButtons = [{
    text: "Close",
    handler: handleCancel
}];
var myContextMenu;

var node_labelStyle = {};
node_labelStyle[homedir + "/public_ftp"] = "icon-publicftp";
node_labelStyle[homedir + "/public_html"] = "icon-publichtml";
node_labelStyle[homedir + "/www"] = "icon-publichtml";
node_labelStyle[homedir + "/mail"] = "icon-mail";

var bOffset = 0;
var osmode = "unix";
var quirksmode = "Mozilla";
var osCheck = navigator.userAgent.toLowerCase();
var is_major = parseInt(navigator.appVersion);
var is_minor = parseFloat(navigator.appVersion);

var EVENT = YAHOO.util.Event;

if (osCheck.indexOf("win") !== -1 || osCheck.indexOf("Windows") !== -1) {
    osmode = "win32";
}
if (osCheck.indexOf("mac") !== -1) {
    osmode = "mac";
}
if (navigator.appVersion.indexOf("MSIE") !== -1) {
    quirksmode = "MSIE";
}
if (navigator.appVersion.indexOf("Safari") !== -1) {
    quirksmode = (is_minor > 4 ? "Safari5" : "Safari");
}
if (navigator.appVersion.indexOf("Opera") !== -1 || navigator.userAgent.indexOf("Opera") !== -1) {
    quirksmode = "Opera";
}
var isOldIE = (quirksmode === "Opera" || quirksmode === "MSIE") ? 1 : 0;

if (quirksmode === "Opera") {
    if (is_minor < 9.21) {
        alert("Use of Opera older then 9.21 with this file manager is not recommended.");
    }
}

var tree_area = DOM.get("subleft");
var tree_area_padding = (parseFloat(DOM.getStyle(tree_area, "padding-top")) || 0) + (parseFloat(DOM.getStyle(tree_area, "padding-bottom")) || 0);
var tree_resize_listener = function(e) {
    var vp_height = DOM.getViewportHeight();
    var y_pos = DOM.getY(tree_area);
    DOM.setStyle(tree_area, "height", (vp_height - y_pos - tree_area_padding) + "px");
};

// The 100ms delay seems necessary for something or other.
EVENT.onDOMReady(function() {
    setTimeout(tree_resize_listener, 100);
});
EVENT.on(window, "resize", tree_resize_listener);

YAHOO.namespace("fileman");

YAHOO.util.DDM.mode = YAHOO.util.DDM.POINT;

YAHOO.fileman.DDFile = function(id, sGroup) {
    this.initFile(id, "files");
};

YAHOO.fileman.DDFile.prototype = new YAHOO.util.DDProxy();


YAHOO.fileman.DDFile.TYPE = "DDFile";


YAHOO.fileman.DDFile.prototype.autoScroll = function(x, y, h, w) {
    return 0;

    // The below code will properly scroll the left and right areas, however the DDFile
    // object does not understand the drag object targets have moved so we have not enabled this code

    if (this.scroll) {
        var filesareaEl = document.getElementById("filesarea_scrollable");
        var subleftEl = document.getElementById("subleft");

        // The client height
        var clientH = this.DDM.getClientHeight();

        // The amt scrolled down
        var st = this.DDM.getScrollTop();

        // Location of the bottom of the element
        var bot = h + y;

        // The distance from the cursor to the bottom of the visible area,
        // adjusted so that we don't scroll if the cursor is beyond the
        // element drag constraints
        var toBot = (clientH + st - y - this.deltaY);

        // How close to the edge the cursor must be before we scroll
        // var thresh = (document.all) ? 100 : 40;
        var thresh = 40;

        // How many pixels to scroll per autoscroll op.  This helps to reduce
        // clunky scrolling. IE is more sensitive about this ... it needs this
        // value to be higher.
        var scrAmt = (document.all) ? 80 : 30;

        // Scroll down if we are near the bottom of the visible page and the
        // obj extends below the crease
        if (bot > clientH && toBot < thresh) {
            if (subleftEl.scrollTop < subleftEl.scrollHeight) {
                subleftEl.scrollTop += scrAmt;
            }
            if (filesareaEl.scrollTop < filesareaEl.scrollHeight) {
                filesareaEl.scrollTop += scrAmt;
            }
        }

        y -= document.getElementById("top").offsetHeight;

        // Scroll up if the window is scrolled down and the top of the object
        // goes above the top border
        if (y < st && y - st < thresh) {
            if (subleftEl.scrollTop > 0) {
                subleftEl.scrollTop -= scrAmt;
            }
            if (filesareaEl.scrollTop > 0) {
                filesareaEl.scrollTop -= scrAmt;
            }
        }
    }
};

YAHOO.fileman.DDFile.prototype.initFile = function(id, sGroup) {
    if (!id) {
        return;
    }

    this.init(id, sGroup);
    this.initFrame();

    this.isTarget = false;
    this.isFile = true;
    this.action = "move";


    this.type = YAHOO.fileman.DDFile.TYPE;
};

/**
 * Determines if a source directory contains a destination directory
 *
 * @param  {string} src  - the source directory
 * @param  {string} dest - the destination directory
 * @return {boolean}
 */
function srcDirContainsDestDir(src, dest) {

    // make sure the directories end in a slash
    if (dest[dest.length - 1] !== "/") {
        dest += "/";
    }
    if (src[src.length - 1] !== "/") {
        src += "/";
    }

    var result = src.slice(0, dest.length);
    return dest === result;
}

function selectAllFiles() {
    filesDataTable.selectAllRows();
}

function unselectAllFiles() {
    filesDataTable.unselectAllRows();

    // this will case the below event to fire

    // var rows = filesDataTable.getRows();
    // if (rows.length) {
    //    handleRowUnSelect({target:rows});
    // }
}

function unselectFile(fileRow) {
    filesDataTable.unselectRow(fileRow);

    // this will case the below event to fire
    // handleRowUnSelect({target:fileRow});

}

function selectFile(fileRow) {
    filesDataTable.selectRow(fileRow);

    // this will case the below event to fire
    // handleRowSelect({target:fileRow});
}

YAHOO.fileman.DDFile.prototype.startDrag = function(x, y) {
    var thisId = this.getEl().id;
    var inGroup = 0;
    selectedFilesCount = 0;
    var dragRow = filesDataTable.getRow(this.fileId);

    if (dragRow && !filesDataTable.isSelected(dragRow)) {
        selectFile(dragRow);
    }
    var selectedFiles = filesDataTable.getSelectedTrEls();
    selectedFilesCount = selectedFiles.length;

    var Files = filesDataTable.getRows();
    var files_length = Files.length;
    for (var i = 0; i < files_length; i++) {
        DDM.getDDById(Files[i].id).unlock();
    }

    var sis = document.getElementById("filesi");
    if (selectedFilesCount > 0) {
        sis.innerHTML = selectedFilesCount + (selectedFilesCount > 1 ? " Files" : " File");
    }
};


YAHOO.fileman.DDFile.prototype.endDrag = function(e) {
    document.getElementById("copyi").style.display = "none";
    document.getElementById("filesi").style.display = "none";
    var Files = filesDataTable.getRows();
    var files_length = Files.length;
    for (var i = 0; i < files_length; i++) {
        DDM.getDDById(Files[i].id).lock();
    }
    var SFiles = filesDataTable.getSelectedTrEls();
    var sfiles_length = SFiles.length;
    for (i = 0; i < sfiles_length; i++) {
        DDM.getDDById(SFiles[i].id).unlock();
    }

};

YAHOO.fileman.DDFile.prototype.onDrag = function(e, id) {
    if (!(CtrlKeyPressed || e.ctrlKey || e.shiftKey || selectedFilesCount > 0)) {
        return;
    }
    var mouseX = YAHOO.util.Event.getPageX(e);
    var mouseY = YAHOO.util.Event.getPageY(e);

    if (selectedFilesCount > 0) {
        var sis = document.getElementById("filesi").style;
        sis.display = "block";

        sis.top = (mouseY + 7) + "px";
        sis.left = (mouseX + 23) + "px";
        sis = null;
    } else {
        document.getElementById("filesi").style.visible = "none";
    }

    if (CtrlKeyPressed || e.ctrlKey || e.shiftKey) {
        var cis = document.getElementById("copyi").style;
        if (!SVis) {
            cis.display = "block";
            SVis = 1;
        }
        cis.top = (mouseY + 7) + "px";
        cis.left = (mouseX + 7) + "px";
        cis = null;
    } else {
        if (SVis) {
            document.getElementById("copyi").style.display = "none";
            SVis = 0;
        }
    }
};

YAHOO.fileman.DDFile.prototype.onDragDrop = function(e, id) {
    var BestMatch = DDM.getDDById(id);

    if (BestMatch.action) {
        var action = BestMatch.action;

        if (action == "move" && (CtrlKeyPressed || e.ctrlKey || e.shiftKey)) {
            action = "copy";
        }

        var targetPath = BestMatch.filePath;

        if (targetPath != null) {
            var fileList;
            if (this.id.match(/^ygtvt/) || this.id.match(/^ygtvcontent/)) {
                fileList = [this.filePath];
            } else {
                fileList = filesDataTable.getSelectedTrEls().map(getFilePathFromRow);
            }

            if (action == "unlink") {
                scheduleFileOp("unlink", fileList, []);
                alert("Trash Operations are disabled because the system is in test mode!");

                //  + fileList.join(",") + "?");
            } else if (fileList.some(function(f) {
                return f !== targetPath && f.replace(/\/[^\/]+$/, "") !== targetPath;
            })) {
                if (action == "copy" || action == "move" || action == "rename") {
                    scheduleFileOp(action, fileList, [targetPath]);
                } else {
                    alert("Unhandled action: " + action + " from " + fileList.join(",") + " to " + targetPath);
                }
            }
        }
    }


    SVis = 0;
    getRealObj(BestMatch.id).style.backgroundColor = "";
    document.getElementById("copyi").style.display = "none";
    document.getElementById("filesi").style.display = "none";

};

function getRealObj(Stxt) {
    if (Stxt.match(/^ygtvt/)) {
        return document.getElementById(Stxt).parentNode;
    } else {
        return document.getElementById(Stxt);
    }
}

// Don't show "droppable" state unless we really can drop the dragged "thingie"
// onto this target.
YAHOO.fileman.DDFile.prototype.onDragEnter = function(e, BestMatch) {
    var dest_dir = DDM.getDDById(BestMatch).filePath;
    if (dest_dir !== this.filePath && dest_dir !== this.filePath.replace(/\/[^\/]+$/, "")) {
        getRealObj(BestMatch).style.backgroundColor = "#aaa";
    }
};


YAHOO.fileman.DDFile.prototype.onDragOut = function(e, BestMatch) {
    getRealObj(BestMatch).style.backgroundColor = "";
};

function xmlStaterrorFunction(o) {
    setLoading();
    if (!o) {
        return;
    }
    alert("Error: " + o.status + " " + o.statusText + " There was a problem fetching the files information: " + o.responseText);
    refreshFiles();
}

// send the AJAX request to take action with a file

function scheduleFileOp(op, srcFileList, destFileList, metadata, setdata, fileList) {
    var i = 0;

    if (/chmod/i.test(op)) {
        if (!/^[0-7]{3,4}$/.test(metadata)) {
            alert(LANG.chmod_error);
            refreshFiles();
            return false;
        }
        if (metadata.length < 4) {
            metadata = "0" + metadata;
        }
    } else if (/rename/i.test(op)) {
        var destFile = destFileList[0];
        var records = filesDataTable.getRecordSet();
        for (i = 0; i < records._records.length; i++) {
            if (destFile == records._records[i]._oData.file) {
                alert(YAHOO.lang.substitute(LANG.rename_conflict, {
                    file: destFile
                }));
                refreshFiles();
                return false;
            }
        }
    } else if (/unlink/i.test(op)) {
        var all_files_in_trash = 1;
        var trash_dir = homedir + "/.trash";

        // add a check for the deleteme metadata here and bypass the check below
        if (metadata && metadata.deleteme) {

            // reset the metadata structure
            metadata = {};

            // forcefully delete files
            op = "unlink";
        } else {

            // only remove files that are in the trash
            for (i = 0; i < srcFileList.length; i++) {
                if (srcFileList[i].substring(0, trash_dir.length) !== trash_dir) {
                    all_files_in_trash = 0;
                }
            }
            if (!all_files_in_trash) {
                op = "trash";
            }
        }
    } else if (/emptytrash/i.test(op)) {
        srcFileList = [homedir + "/.trash"];
        op = "unlink";
    }

    var callback = {
        success: FileOpCallBack,
        failure: xmlStaterrorFunction,
        argument: {
            srcFileList: srcFileList,
            destFileList: destFileList,
            fileop: op,
            setdata: setdata,
            metadata: metadata,
            fileList: fileList,
            selected_rows: filesDataTable.getSelectedTrEls()
        }
    };
    var sFormData = "cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop&cpanel_jsonapi_apiversion=2&filelist=1&multiform=1&doubledecode=0&op=" + op + "&metadata=" + metadata + "&";
    for (i = 0; i < srcFileList.length; i++) {
        sFormData += "sourcefiles=" + safeencode(srcFileList[i]) + "&";
    }
    for (i = 0; i < destFileList.length; i++) {
        sFormData += "destfiles=" + safeencode(destFileList[i]) + "&";
    }
    var sUrl = CPANEL.security_token + "/json-api/cpanel";
    YAHOO.util.Connect.asyncRequest("POST", sUrl, callback, sFormData);
}

YAHOO.widget.Node.prototype.get_common_ancestor = function(node2) {
    var cur_node1 = this;
    do {
        var cur_node2 = node2;
        do {
            if (cur_node1 === cur_node2) {
                return cur_node1;
            }
        } while (cur_node2 = cur_node2.parent);
    } while (cur_node1 = cur_node1.parent);

    return;
};

function FileOpCallBack(o) {
    var root = fastJsonParse(o.responseText);
    if (root == null) {
        alert("There was a problem fetching the file list! Please reload and try again.");
        return;
    }
    var i;
    var thisFilesList = root.cpanelresult.data;
    var doRefresh = false;
    var doTreeRefresh = false;
    var nodenuker = function() {};
    var nuke_table_rows = [];
    var cwdlen = cwd.length;
    var destBase, destfileDir, dest_name;

    // Need to check if the call actually failed here
    if (root.cpanelresult.event.result === 0) {
        alert("FileOp Failure: " + root.cpanelresult.event.reason);
        return;
    }

    if (o.argument.fileop == "chmod") {
        var rows = o.argument.fileList || [o.argument.selected_rows[0]];

        var cur_row;
        for (var r = 0; cur_row = rows[r]; r++) {
            var oRecord = filesDataTable.getRecord(cur_row);
            filesDataTable.updateCell(oRecord, "nicemode", o.argument.metadata);
        }

        return;
    }

    // TODO: Make ops like extract not set nodenuker() multiple times.
    // This loop doesn't need to be done, for example, with unlink.
    for (i = 0; i < thisFilesList.length; i++) {
        var result = thisFilesList[i].result;
        var source = YAHOO.util.DataSource.parseString(thisFilesList[i].src);

        if (!source) {
            var error = thisFilesList[i].err || "Unknown";
            alert("FileOp Failure (source could not be read) : " + error);
            break;
        }
        var dest = YAHOO.util.DataSource.parseString(thisFilesList[i].dest);
        if (dest) {
            destBase = getFileBase(dest);
            destfileDir = destBase[0];
            dest_name = destBase[1];
        }
        var efileBase = getFileBase(source);
        var esrcfileDir = efileBase[0];
        var efileName = efileBase[1];

        if (parseInt(result, 10)) {
            var move_was_rename = (o.argument.fileop === "move") && (thisFilesList.length === 1) && (destfileDir === cwd) && !filesDataTable.getRecordSet().getRecords().some(function(r) {
                return r.getData("file") === dest_name;
            });

            if (move_was_rename || (o.argument.fileop === "rename")) {
                nodenuker = function() {
                    nukeNode(esrcfileDir, 1);
                };
                var myDD = DDM.getDDById(o.argument.metadata.id);
                myDD.filePath = dest;
                if (o.argument.setdata) {
                    var oRecord = filesDataTable.getRecord(o.argument.selected_rows[0]);
                    filesDataTable.getRecordSet().updateKey(oRecord, "file", dest_name);
                    filesDataTable.render();
                }
                doRefresh = true;
            } else if (o.argument.fileop == "trash" || o.argument.fileop == "unlink" || o.argument.fileop == "restorefile") {
                nuke_table_rows.push(efileName);
                nodenuker = function() {
                    o.argument.srcFileList.forEach(remove_path_from_tree);
                };
                if (o.argument.fileop == "restorefile") {
                    var is_dir;
                    if (o.argument.selected_rows[i]) {
                        is_dir = /-directory$/i.test(filesDataTable.getRecord(o.argument.selected_rows[i]).getData("mimetype"));
                    } else {
                        srcDir = RootFileTree.getNodeByProperty("path", source);
                        if (srcDir && srcDir.data) {
                            is_dir = /dir/i.test(srcDir.data.type);
                        }
                    }
                    if (is_dir) {
                        doTreeRefresh = true;
                    }
                }
            } else if (o.argument.fileop == "compress") {
                var rawoutput = thisFilesList[i].output;
                var tmsg = "";
                if (rawoutput.length == 4096) {
                    tmsg = "</pre><br /><b>Output Truncated by browser<pre>";
                }
                var output = unescape(rawoutput);
                if (destfileDir == cwd) {
                    doRefresh = true;
                }
                nodenuker = function() {
                    nukeNode(esrcfileDir, 1);
                };
                show_results("Compression Results", output + tmsg);

            } else if (o.argument.fileop == "extract") {
                var rawoutput = thisFilesList[i].output;
                var tmsg = "";
                if (rawoutput.length == 4096) {
                    tmsg = "</pre><br /><b>Output Truncated by browser<pre>";
                }
                var output = unescape(rawoutput);
                if (dest == cwd) {
                    doRefresh = true;
                }
                nodenuker = function() {
                    nukeNode(esrcfileDir, 1);
                };
                show_results("Extraction Results", output + tmsg);
            } else if (o.argument.fileop == "move" || o.argument.fileop == "copy") { // non-rename

                // TODO: FB 110709. Need to fix the following test case
                // copy a directory to a new directory that does not exist
                // tree should update and show the new directory
                var is_dir;
                if (o.argument.selected_rows[i]) {
                    is_dir = /-directory$/i.test(filesDataTable.getRecord(o.argument.selected_rows[i]).getData("mimetype"));
                } else {
                    srcDir = RootFileTree.getNodeByProperty("path", source);
                    if (srcDir && srcDir.data) {
                        is_dir = /dir/i.test(srcDir.data.type);
                    }
                }

                if (is_dir) {
                    var dest_node = RootFileTree.getNodeByProperty("path", destfileDir);
                    if (dest_node) {
                        if (dest_node.isLeaf) {
                            dest_node.isLeaf = false;
                            dest_node.updateIcon();
                        } else if (dest_node.hasChildren() !== undefined) {
                            nodenuker = function() {
                                nukeNode(dest_node, null);
                            };
                        }
                    }

                    if (o.argument.fileop == "move") {
                        remove_path_from_tree(source);
                    }
                }

                // if the destination directory and the current directory are the same,
                // we should refresh regardless if this is a directory or not
                if (destfileDir === cwd) {
                    doRefresh = true;
                } else if (o.argument.fileop === "move") {

                    // we are not in the destination directory, but since this
                    // is a move we need to remove the file or folder from the
                    // file list
                    nuke_table_rows.push(efileName);
                }
            } else if (o.argument.fileop == "link") {
                if (dest == cwd) {
                    doRefresh = true;
                }
            }
        } else {
            var error = thisFilesList[i]["err"] || thisFilesList[i]["error"] || root.cpanelresult["error"] || "Unknown";
            if (source) {
                alert("FileOp Failure on: " + source + ": " + error);
            } else {
                alert("FileOp Failure : " + error);
            }
            doRefresh = true;
        }
    }

    if (nuke_table_rows.length) {
        unselectAllFiles();

        var files_records = {};
        var records = filesDataTable.getRecordSet().getRecords();
        var cur_rec;
        for (var r = 0; cur_rec = records[r]; r++) {
            files_records[cur_rec.getData("file")] = cur_rec;
        }
        nuke_table_rows = nuke_table_rows.map(function(file) {
            return filesDataTable.getTrEl(files_records[file]);
        });

        // case 42899: setting renderLoopSize tells YUI to delete the DOM rows
        // in a non-blocking queue, which produces strange errors unless we
        // ensure that each row is deleted both in memory and in the DOM before
        // proceeding to the next. YUI2 bug #2529089
        // This was not fixed in YUI 2.9.0.
        var tbody = filesDataTable.getTbodyEl();
        var _last_deleted_record_index = null;
        var row_deleter = function(ev) {

            // in case there are two things deleting rows at the same time,
            // listen for exactly the row we expect within this function.
            if (!ev || (ev.recordIndex === _last_deleted_record_index)) {
                var row = nuke_table_rows.pop();
                _last_deleted_record_index = filesDataTable.getRecordIndex(row);
                filesDataTable.deleteRow(row);
                if (nuke_table_rows.length === 0) {
                    filesDataTable.removeListener("rowDeleteEvent", row_deleter);
                }
            }
        };
        filesDataTable.addListener("rowDeleteEvent", row_deleter);
        row_deleter();
    }

    nodenuker();
    waitpanel.hide();

    // refresh the file list if we need to
    if (doRefresh) {
        refreshFiles();
    }

    // refresh the tree
    if (doTreeRefresh) {
        refreshTree();
    }

    thisFilesList = null;
    i = null;
}

function debug(txt) {
    if (window.console) {
        window.console.log(txt);
    } else if (console) {
        console.log(txt);
    } else {
        alert(txt);
    }
}

function getFileBase(filePath) {
    var fileA = filePath.split("/");
    var fb = [];

    fb[0] = "";
    fb[1] = fileA.pop(); // filename
    fb[0] = fileA.join("/"); // dir
    return fb;
}

// send null for "expand" to auto-detect

function nukeNode(the_node, expand) {
    if (!the_node) {
        return;
    }

    if (!(the_node instanceof YAHOO.widget.Node)) {
        the_node = RootFileTree.getNodeByProperty("path", the_node);
    }

    var expanded = the_node.expanded;
    RootFileTree.removeChildren(the_node);
    if (expand || (expand === null && expanded)) {
        the_node.expand();
    }
}

function refreshTree() {
    var rootNode = RootFileTree.getRoot().children[0];
    nukeNode(rootNode, true);
}

function add_path_to_tree(path, next_dir) {
    var parent_path = path.replace(/\/[^\/]+$/, "");
    var parent_node = RootFileTree.getNodeByProperty("path", parent_path);

    if (!parent_node) {
        return;
    }

    // If we're adding a node to a node that we know already has other nodes
    // but is not yet rendered, then there is nothing to do here.
    if (!parent_node.childrenRendered && !parent_node.isLeaf) {
        return;
    }

    var next_node;
    if (next_dir && parent_node.children.length > 0) {
        next_dir = next_dir.replace(/^.*\/([^\/]+)/, "$1");
        next_node = RootFileTree.getNodeByProperty("path", parent_path + "/" + next_dir);
    }

    var new_node = new FM_Tree_Node(path.replace(/^.*\/([^\/]+)/, "$1"), parent_node, {
        isLeaf: true
    });

    if (next_node) {
        new_node.insertBefore(next_node);
    }

    parent_node.isLeaf = false;

    parent_node.refresh();
}

function remove_path_from_tree(path) {
    var node = RootFileTree.getNodeByProperty("path", path);
    var parent_node, parent_is_now_a_leaf;

    if (node) {
        parent_node = node.parent;
        parent_is_now_a_leaf = !node.nextSibling && !node.previousSibling;
        RootFileTree.removeNode(node, true);
    } else {

        // Handle the case where we have a node that is not rendered in the tree.
        var the_match = path.match(/^(.*)\/([^\/]+)\/?$/);
        if (the_match[1] === cwd) {
            var records = filesDataTable.getRecordSet().getRecords();
            parent_node = RootFileTree.getNodeByProperty("path", the_match[1]);

            // determine if there are any directories in the list
            // if no directories, then it is a leaf
            // therefore, the leaf should be collapsed
            var len = records.length;
            if (records.length > 0) {
                parent_is_now_a_leaf = true;
            }
            for (var i = 0; i < len; i++) {
                var tmp = records[i];
                if (/-directory/i.test(tmp.getData("mimetype"))) {
                    parent_is_now_a_leaf = false;
                    break;
                }
            }
        }
    }

    if (parent_is_now_a_leaf) {
        if (!parent_node) {
            parent_node = RootFileTree.getNodeByProperty("path", cwd);
        }

        var root = RootFileTree.getRoot();
        var rootNode = root.children[0];

        // make sure we do not mark the root node as a leaf
        if (parent_node && parent_node.data.path !== rootNode.data.path) {
            parent_node.isLeaf = true;
            parent_node.collapse();
            parent_node.updateIcon();
        }
    }
}

var RootFileTree;
var uriHistoryPos = 0;
var uriHistory = [];

var myDataSource;

function setupFilesTable(fileTable, reinit) {
    if (!fileTable) {
        fileTable = this;
    }

    var Rows = fileTable.getTbodyEl().rows;
    var numrows = fileTable.getRecordSet().getLength();

    for (var i = 0; i < numrows; i++) {
        var dragObject = (reinit ? DDM.getDDById(Rows[i].id) : new YAHOO.fileman.DDFile(Rows[i]));

        var oRecord = fileTable.getRecord(i);
        var oData = oRecord.getData();

        var type = oData.mimetype;
        if (type.match("-directory") || type == "mail" || type == "publichtml" || type == "publicftp") {
            dragObject.type = "dir";
            dragObject.isTarget = true;
        } else {
            dragObject.type = "file";
        }
        dragObject.action = "move";
        dragObject.fileId = i;
        dragObject.filePath = cwd + "/" + oData.file;
        dragObject.lock();
    }

    if (reinit) {
        return;
    }

    if (numrows > 0) {
        fileTable.hideTableMessage();
    }
    if (updatecallback) {
        updatecallback();
        updatecallback = null;
    }
}


function handleunselectAllRowsEvent() {
    var Rows = this.getRows();
    handleRowUnSelect({
        target: Rows
    });
}


YAHOO.widget.DataTable.prototype.selectAllRows = function() {
    var Rows = this.getRows();
    for (var i = 0; i < Rows.length; i++) {
        this.selectRow(Rows[i]);
    }
    handleRowSelect();
};

YAHOO.widget.DataTable.prototype.getRows = function() {

    // TODO: keep internal array if this is non performant
    return this.getTbodyEl().getElementsByTagName("tr");
};


YAHOO.widget.DataTable.prototype.onDataReturnSearch = function(sRequest, oResponse) {
    waitpanel.hide();
    show_panel("search-results");

    document.getElementById("search-results-div").style.display = "block";
    searchDataTable.clearRows();
    searchDataTable.showTableMessage(YAHOO.widget.DataTable.MSG_LOADING, YAHOO.widget.DataTable.CLASS_LOADING);

    this.onDataReturnInitializeTable(sRequest, oResponse);
};

/**
 * Handles data return for replacing all existing of table with new rows.
 *
 * @method onDataReturnReplaceRows
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 */
YAHOO.widget.DataTable.prototype.onDataReturnReplaceRows = function(sRequest, oResponse) {
    this.set("MSG_EMPTY", LANG.dir_empty);
    unselectAllFiles();

    load_docroots();
    this.onDataReturnInitializeTable(sRequest, oResponse);
};


function xmlLoaderrorFunction(o) {
    if (!o) {
        return;
    }
    alert("Error: " + o.status + " " + o.statusText + " There was a problem fetching the files information: " + o.responseText);
    o.argument.fnLoadComplete();
}

// safeencode() is also in base/cpanel_langedit/template.html

function safeencode(st) {
    var enc = encodeURIComponent(st);
    var ecp = -1;
    var safeenc = "";

    for (var i = 0; i < enc.length; i++) {

        if (ecp >= 0) {
            ecp++;
        }
        if (ecp >= 3) {
            ecp = -1;
        }
        if (ecp == 1 || ecp == 2) {
            safeenc += enc.substring(i, i + 1).toLowerCase();
        } else {
            safeenc += enc.substring(i, i + 1);
        }
        if (enc.substring(i, i + 1) == "%") {
            ecp = 0;
        }
    }

    return safeenc.replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/,/g, "%2c").replace(/'/g, "%27");
}

function handleColumnSort(opts) {
    unselectAllFiles();
}

function FM_Tree_Node(name, parent_node, opts) {
    var node_opts = {
        label: name,
        path: (parent_node.data.path || "") + "/" + name.replace(/^\/+/, "")
    };
    if (opts) {
        YAHOO.lang.augmentObject(node_opts, opts);
    }
    FM_Tree_Node.superclass.constructor.call(this, node_opts, parent_node, false);
}
YAHOO.lang.extend(FM_Tree_Node, YAHOO.widget.TextNode, {
    refresh: function() {
        var ret = FM_Tree_Node.superclass.refresh.apply(this, arguments);
        var children = this.children;
        for (var c = 0; c < children.length; c++) {
            children[c].sync_dd();
        }

        return ret;
    },
    sync_dd: function() {
        if (this.dd) {
            if (this.dd.getEl() === this.getContentEl() && DDM.verifyEl(this.getContentEl())) {
                return;
            }

            this.dd.unreg();
        }

        this.dd = new YAHOO.fileman.DDFile(this.contentElId);
        YAHOO.lang.augmentObject(this.dd, {
            type: "dir",
            isTarget: true,
            filePath: this.data.path
        }, true);
    }
});

function parsejsonFile(o) {
    var root = fastJsonParse(o.responseText);
    if (root == null) {
        alert("There was a problem fetching the json file list! Please reload and try again.");
        return;
    }

    var node = o.argument.node;
    var dragMKList = {};

    var filelist = root.cpanelresult.data;

    for (var i = 0; i < filelist.length; i++) {
        if (!filelist[i].file) {
            continue;
        }
        var file;

        //        try {
        //            file = decodeURIComponent(filelist[i].file);
        //        } catch(e) {
        file = filelist[i].file;

        //        }

        var filePath = filelist[i].path + "/" + filelist[i].file;

        var newNode = new FM_Tree_Node(filelist[i].file, node, {
            type: filelist[i].type,
            isLeaf: filelist[i].isleaf == "1" // fuzzy equality OK
        });

        if (filePath in node_labelStyle) {
            newNode.labelStyle = node_labelStyle[filePath];
        }

        dragMKList[filePath] = newNode;
    }

    o.argument.fnLoadComplete();

}

YAHOO.widget.DataTable.prototype.clearRows = function() {
    this.getRecordSet().reset();
    this.render();
};


function actionHandler(action) {
    var selectedFiles = filesDataTable.getSelectedTrEls();
    if (/edit/i.test(action)) {
        if (selectedFiles.length > 1) {
            alert(LANG.tooMany);
            return false;
        }
        if (selectedFiles.length < 1) {
            alert(LANG.tooFew);
            return false;
        }
        if (!actionlist[action].test(selectedFiles)) {
            if (/htmledit/i.test(action)) {
                alert(LANG.notValidHTML);
            } else {
                alert(LANG.notValid);
            }
            return false;
        }
    }

    if (actionlist[action].test(selectedFiles)) {
        actionlist[action].handler(selectedFiles);
    }

    return false;
}

var actionlist = {
    "unselectall": {
        handler: function() {
            unselectAllFiles();
        },
        test: function(fileList) {
            if (fileList && fileList[0]) {
                return true;
            }
            return false;
        }
    },
    "selectall": {
        handler: function() {
            selectAllFiles();
        },
        test: function() {
            return true;
        }
    },
    "home": {
        handler: function() {
            updateFileList(homedir);
        },
        test: function() {
            if (cwd != homedir) {
                return true;
            }
            return false;
        }
    },
    "navup": {
        handler: function() {
            navigateUp();
        },
        test: function() {
            if (cwd != homedir) {
                return true;
            }
            return false;
        }
    },
    "navback": {
        handler: function() {
            navigateBack();
        },
        test: function() {
            if (uriHistoryPos > 0) {
                return true;
            }
            return false;
        }
    },
    "navnext": {
        handler: function() {
            navigateNext();
        },
        test: function() {
            if (uriHistoryPos < uriHistory.length - 1) {
                return true;
            }
            return false;
        }
    },
    "refresh": {
        handler: function() {
            refreshFiles();
        },
        test: function() {
            return true;
        }
    },
    "upload": {
        handler: function() {
            uploadFiles();
        },
        test: function() {
            return true;
        }
    },
    "newfile": {
        handler: function() {
            show_panel("newfile");
        },
        test: function() {
            return true;
        }
    },
    "newfolder": {
        handler: function() {
            show_panel("newfolder");
        },
        test: function() {
            return true;
        }
    },
    "copy": {
        handler: function() {
            show_panel("copy");
        },
        test: function(fileList) {
            if (fileList && fileList[0]) {
                return true;
            }
            return false;
        }
    },
    "move": {
        handler: function() {
            show_panel("move");
        },
        test: function(fileList) {
            if (fileList && fileList[0]) {
                return true;
            }
            return false;
        }
    },
    "download": {
        handler: function() {
            downloadFiles();
        },
        test: function(fileList) {
            if (fileList && fileList[0]) {
                var type = filesDataTable.getRecord(fileList[0]).getData("mimetype");
                if (!(type.match("-directory") || type == "mail" || type == "publichtml" || type == "publicftp")) {
                    return true;
                }
            }
            return false;
        }
    },
    "leechprotect": {
        handler: function() {
            dir_uri_action("../htaccess/leechprotect/dohtaccess.html?dir=");
        },
        test: function() {
            return !actionlist.download.test.apply(this, arguments);
        }
    },
    "indexmanager": {
        handler: function() {
            dir_uri_action("../indexmanager/dohtaccess.html?dir=");
        },
        test: function() {
            return !actionlist.download.test.apply(this, arguments);
        }
    },
    "dirprotect": {
        handler: function(fileList) {
            dir_uri_action("../htaccess/dohtaccess.html?dir=");
        },
        test: function() {
            if (!webprotect_feature) {
                return false;
            }
            return !actionlist.download.test.apply(this, arguments);
        }
    },
    "delete": {
        handler: function() {
            if (srcDirContainsDestDir(cwd, homedir + "/.trash")) {
                show_panel("delete");
            } else {
                show_panel("trash");
            }
        },
        test: function(fileList) {
            if (fileList && fileList[0]) {
                return true;
            }
            return false;
        }
    },
    "restore": {
        handler: function() {
            if (cwd === homedir + "/.trash") {
                show_panel("restore");
            }
        },
        test: function(fileList) {
            if (cwd !== homedir + "/.trash") {
                return false;
            } else if (fileList && fileList[0]) {
                return true;
            } else {
                return false;
            }
        }
    },
    "viewtrash": {
        handler: function() {
            updateFileList(homedir + "/.trash");
        },
        test: function() {
            if (!srcDirContainsDestDir(cwd, homedir + "/.trash")) {
                return true;
            } else {
                return false;
            }
        }
    },
    "emptytrash": {
        handler: function() {
            show_panel("emptytrash");
        },
        test: function() {
            if (srcDirContainsDestDir(cwd, homedir + "/.trash")) {
                return true;
            }
            return false;
        }
    },
    "rename": {
        handler: function() {
            show_panel("rename");
        },
        test: function(fileList) {
            if (fileList && fileList[0]) {
                return true;
            }
            return false;
        }
    },
    "edit": {
        handler: function(fileList) {
            var fileName = filesDataTable.getRecord(fileList[0]).getData("file");
            var panel_name = "edit";
            var charset_input_id = "edit-charset";

            var charset_SEl = document.getElementById(charset_input_id);
            if (!charset_SEl.options || !charset_SEl.options.length) {
                populate_charset(charset_SEl);

                // at this point, the selected charset is _DETECT_,
                // which tells the server to auto-detect
            }

            if (!self.NVData || !NVData.ignorecharencoding) {
                show_loading(YAHOO.lang.substitute(LANG.detecting_encoding, {
                    file_html: fileName.html_encode()
                }), "");

                var encoding_callback = function(encodings) {
                    var encoding = encodings[0].encoding;
                    select_charset(charset_SEl, encoding);
                    waitpanel.hide();
                    show_panel(panel_name);
                };
                cpanel_jsonapi2(encoding_callback, "Encoding", "guess_file", "file", cwd + "/" + fileName);
            } else {

                // this needs to set up the panel without actually showing it
                // so blackhole the panel's .show() method
                init_panels(panel_name);
                var panel = panels[panel_name].panel;
                var real_show = panel.show;
                panel.show = function() {};
                show_panel(panel_name);
                panel.show = real_show;
                handleEdit(panel);
            }
        },
        test: function(fileList) {
            if (fileList && fileList[0]) {
                var is_file = actionlist.download.test.apply(this, arguments);
                if (is_file) {
                    return filesDataTable.getRecord(fileList[0]).getData("size") < EDITOR_SIZE_LIMIT;
                }
            }
            return false;
        }
    }
};

actionlist.htmledit = {
    handler: function(fileList) {
        var fileName = filesDataTable.getRecord(fileList[0]).getData("file");

        var htmleditSEl = document.getElementById("htmledit-urls");
        var htmleditBSEl = document.getElementById("htmledit-basedir");
        htmleditSEl.options.length = 0;
        var editfile = fileList[0];
        var didsel = 0;
        var itemcount = -1;
        for (var domain in web_docroots) {
            var docroot = web_docroots[domain];
            var begin_cwd = cwd.substring(0, docroot.length);
            var end_cwd = cwd.substring(docroot.length);
            if (begin_cwd == docroot) {
                itemcount++;
                htmleditSEl.options[itemcount] = new Option("http://" + domain + end_cwd + "/" + fileName, "http://" + domain + end_cwd);
                htmleditBSEl.options[itemcount] = new Option(docroot, docroot);

                if (domain == maindomain) {
                    htmleditSEl.options[itemcount].selected = true;
                    htmleditBSEl.options[itemcount].selected = true;
                    didsel = 1;
                }

            }
        }
        if (!didsel) {
            if (!htmleditSEl.options.length) {
                itemcount++;
                htmleditSEl.options[itemcount] = new Option("http://" + maindomain + "/" + fileName, "http://" + maindomain);
                htmleditBSEl.options[itemcount] = new Option(cwd, cwd);
            }
            htmleditSEl.options[itemcount].selected = true;
            htmleditBSEl.options[itemcount].selected = true;
        }

        var htmledit_charset_SEl = document.getElementById("htmledit-charset");
        if (!htmledit_charset_SEl.options || !htmledit_charset_SEl.options.length) {
            populate_charset(htmledit_charset_SEl);

            // at this point, the selected charset is _DETECT_,
            // which tells the server to auto-detect
        }

        if (!self.NVData || !NVData.ignorecharencoding) {
            show_loading(YAHOO.lang.substitute(LANG.detecting_encoding, {
                file_html: fileName.html_encode()
            }), "");

            document.getElementById("htmledit-encodings").style.display = "";

            var encoding_callback = function(encodings) {
                var encoding = encodings[0].encoding;
                select_charset(htmledit_charset_SEl, encoding);
                show_panel("htmledit");
                waitpanel.hide();
            };
            cpanel_jsonapi2(encoding_callback, "Encoding", "guess_file", "file", cwd + "/" + fileName);
        } else {
            document.getElementById("htmledit-encodings").style.display = "none";
            show_panel("htmledit");
        }
    },
    test: function(fileList) {
        if (fileList && fileList[0]) {
            var is_editable = actionlist.edit.test.apply(this, arguments);
            if (is_editable) {
                var name = filesDataTable.getRecord(fileList[0]).getData("file");
                if (/\.html?$/i.test(name)) {
                    return true;
                }
                var type = filesDataTable.getRecord(fileList[0]).getData("mimetype");
                if (/html/i.test(type)) {
                    return true;
                }
            }
        }
        return false;
    }
};

actionlist.compress = {
    handler: function() {
        show_panel("compress");
    },
    test: function(fileList) {
        if (fileList && fileList[0]) {
            return true;
        }
        return false;
    }
};

actionlist.extract = {
    handler: function() {
        show_panel("extract");
    },

    test: function(fileList) {
        if (fileList && fileList[0] && !fileList[1]) {
            var record_data = filesDataTable.getRecord(fileList[0]).getData();
            var type = record_data.mimetype;
            if ((type === "application/zip") || /\.zip$/.test(record_data.file)) {
                return HAS_UNZIP;
            }
            if (type === "application/x-gzip" || type === "application/x-tar" || type === "application/x-bzip2" || type === "application/x-bzip" || type === "application/x-rar-compressed") {
                return true;
            }
            if (type.match(/package|archive|compress/i)) {
                return true;
            }
        }
        return false;
    }
};

actionlist.chmod = {
    handler: function() {
        show_panel("chmod");
    },
    test: function(fileList) {
        if (fileList && fileList[0]) {
            var record_data = filesDataTable.getRecord(fileList[0]).getData();
            return record_data.type !== "link";
        }
        return false;
    }
};

actionlist.view = {
    handler: function() {
        viewFiles();
    },
    test: function() {
        return actionlist.download.test.apply(this, arguments);
    }
};


var contextMenuItems = [{
    action: "download",
    displayName: "Download",
    obj: actionlist.download,
    className: "fas fa-download"
}, {
    action: "view",
    displayName: "View",
    obj: actionlist.view,
    className: "fas fa-eye"
}, {
    action: "edit",
    displayName: "Edit",
    obj: actionlist.edit,
    className: "fas fa-pencil-alt"
}, {
    action: "htmledit",
    displayName: "HTML Edit",
    obj: actionlist.htmledit,
    className: "far fa-edit"
}, {
    action: "move",
    displayName: "Move",
    obj: actionlist.move,
    className: "glyphicon glyphicon-move"
}, {
    action: "copy",
    displayName: "Copy",
    obj: actionlist.copy,
    className: "far fa-copy"
}, {
    action: "rename",
    displayName: "Rename",
    obj: actionlist.rename,
    className: "fas fa-file"
}, {
    action: "chmod",
    displayName: "Change Permissions",
    obj: actionlist.chmod,
    className: "fas fa-key"
}, {
    action: "delete",
    displayName: "Delete",
    obj: actionlist["delete"],
    className: "glyphicon glyphicon-remove"
}, {
    action: "restore",
    displayName: "Restore",
    obj: actionlist.restore,
    className: "fas fa-undo"
}, {
    action: "extract",
    displayName: "Extract",
    obj: actionlist.extract,
    className: "glyphicon glyphicon-resize-full"
}, {
    action: "compress",
    displayName: "Compress",
    obj: actionlist.compress,
    className: "glyphicon glyphicon-resize-small"
}, {
    action: "dirprotect",
    displayName: "Password Protect",
    obj: actionlist.dirprotect,
    className: "fas fa-lock"
}, {
    action: "leechprotect",
    displayName: "Leech Protect",
    obj: actionlist.leechprotect,
    className: "fas fa-shield-alt"
}, {
    action: "indexmanager",
    displayName: "Manage Indices",
    obj: actionlist.indexmanager,
    className: "fas fa-wrench"
}, ];

function navigateUp() {
    var thisdirs = cwd.split("/");
    thisdirs.pop();
    var newdir = thisdirs.join("/");
    if (newdir.length <= homedir.length) {
        if (cwd != homedir) {
            updateFileList(homedir);
        }
    } else {
        updateFileList(newdir);
    }
}

function navigateBack() {
    var newpath;
    var goBackok = uriHistoryPos > 0;
    if (goBackok) {
        uriHistoryPos--;
        newpath = uriHistory[uriHistoryPos];
        updateFileList(newpath, 1);
    }
}

function navigateNext() {
    var newpath;
    var goNextok = uriHistoryPos < uriHistory.length - 1;
    if (goNextok) {
        uriHistoryPos++;
        newpath = uriHistory[uriHistoryPos];
        updateFileList(newpath, 1);
    }
}


function updateFileList(dir, didgo, callback) {


    //    unselectAllFiles();
    // this will be called once the xml data is returned anyways

    filesDataTable.set("MSG_EMPTY", filesDataTable.get("MSG_LOADING"));

    filesDataTable.getRecordSet().reset();
    filesDataTable.render();


    // Sends a request to the DataSource for more data
    var oCallback = {
        success: filesDataTable.onDataReturnReplaceRows,
        failure: filesDataTable.onDataReturnReplaceRows,
        scope: filesDataTable,
        argument: filesDataTable.getState()
    };
    var staleCache = new Date();

    if (showhidden === null) {
        showhidden = 0;
    }

    myDataSource.sendRequest("dir=" + safeencode(dir) + "&showdotfiles=" + showhidden + "&cache_fix=" + staleCache.getTime(), oCallback);

    updatecallback = callback;
    cwd = dir;

    refresh_selected_tree_node();

    var safedir = dir.replace(new RegExp("^" + homedir.regexp_encode()), "").replace(/^\//, "");

    document.getElementById("location").value = safedir;

    if (!didgo) {
        if (uriHistory[uriHistory.length - 1] != cwd) {
            uriHistory.push(cwd);
        }
        uriHistoryPos = uriHistory.length - 1;
    }

    for (var i in selectedFilesCache) {
        delete selectedFilesCache[i];
    }
}

var SELECTED_TREE_NODE;

function refresh_selected_tree_node() {
    if (RootFileTree) {
        var selected = RootFileTree.getNodeByProperty("path", cwd);
        if (selected) {
            if (SELECTED_TREE_NODE) {
                DOM.removeClass(SELECTED_TREE_NODE.getContentEl(), "selectedNode");
            }
            DOM.addClass(selected.getContentEl(), "selectedNode");
            SELECTED_TREE_NODE = selected;
        }
    }
}

function uploadFiles() {
    document.getElementById("actionform").action = "upload-ajax.html";
    document.getElementById("actionform_dir").value = cwd;
    document.getElementById("actionform").submit();
}

var editFile = function(usecode, file) {
    var filea = file.split("/");
    var filename = filea.pop();
    var dir = filea.join("/");

    if (usecode == 2) {
        document.getElementById("actionform").action = "./editors/html_editor.html";
    } else {
        document.getElementById("actionform").action = "editit.html";
    }

    document.getElementById("actionform_file").value = filename;
    document.getElementById("actionform_dir").value = dir;

    var the_form = document.getElementById("actionform");
    if (usecode == 1) {
        var extra_input = document.createElement("input");
        extra_input.type = "hidden";
        extra_input.name = "edit";
        extra_input.value = "1";
        the_form.appendChild(extra_input);
        the_form.submit();
        the_form.removeChild(extra_input);
    } else {
        the_form.submit();
    }
};

function changeCompression() {
    var selectedFiles = filesDataTable.getSelectedTrEls();
    setCompressFileName(selectedFiles);
}

function setCompressFileName(selectedFiles) {
    var compresstypes = document.compressform.compresstype;
    var ctype = "zip";
    for (var i = 0; i < compresstypes.length; i++) {
        if (compresstypes[i].checked) {
            ctype = compresstypes[i].value;
            break;
        }
    }
    document.getElementById("compressfilepath").value = getRelPath(getFilePathFromRow(selectedFiles[0])) + "." + ctype;
}

function viewFile(file) {
    var filea = file.split("/");
    var filename = filea.pop();
    var dir = filea.join("/");
    document.getElementById("actionform").action = "showfile.html";
    document.getElementById("actionform_file").value = filename;
    document.getElementById("actionform_dir").value = dir;
    document.getElementById("actionform").submit();
}


function viewFiles() {
    var selectedFiles = filesDataTable.getSelectedTrEls();
    if (selectedFiles[0]) {
        viewFile(getFilePathFromRow(selectedFiles[0]));
    }
}

function getFilePathFromRow(row) {
    var oRecord = filesDataTable.getRecord(row);
    var oData = oRecord.getData();
    return cwd + "/" + oData.file;
}

// NOTE: This function doesn't seem to be used anywhere.
function editFiles(usecode) {
    var selectedFiles = filesDataTable.getSelectedTrEls();
    if (selectedFiles[0]) {
        editFile(usecode, getFilePathFromRow(selectedFiles[0]));
    }
}

function emptyTrash() {
    scheduleFileOp("emptytrash", [], []);
}

function deleteFiles(options) {
    var selectedFiles = filesDataTable.getSelectedTrEls();
    if (selectedFiles[0]) {
        var srcFileList = filesDataTable.getSelectedTrEls().map(getFilePathFromRow);
        var destFileList = [];
        scheduleFileOp("unlink", srcFileList, destFileList, options);
    }
}

function restoreFiles() {
    var selectedFiles = filesDataTable.getSelectedTrEls();
    if (selectedFiles[0]) {
        var srcFileList = filesDataTable.getSelectedTrEls().map(getFilePathFromRow);
        var destFileList = [];
        scheduleFileOp("restorefile", srcFileList, destFileList);
    }
}

function downloadFiles() {
    var selectedRows = filesDataTable.getSelectedTrEls();
    var number_of_files = selectedRows.length;
    if (number_of_files > 0) {

        // ensure that the user really wants to download multiple items at once
        if ((number_of_files > 1) && !confirm(LANG.confirm_download)) {
            return;
        }

        var files = selectedRows.map(getFilePathFromRow);

        var interval_id = setInterval(function() {
            if (files.length) {
                downloadFile(files.shift());
            } else {
                clearInterval(interval_id);
            }
        }, 200);
    }
}


function refreshFiles() {
    updateFileList(cwd);
}

function finishedLoading() {
    alert("done");
}

function clickFolder(e) {
    var clicked_node = e.node;
    var dir = clicked_node.data.path;
    updateFileList(dir);

    // default behavior is to focus and expand/collapse the folder;
    // prevent the collapse when it's the label that was clicked
    if (clicked_node.expanded) {
        clicked_node.focus();
        return false;
    } else {
        return true; // allow default behavior if the node isn't expanded
    }
}


var myFileTree = (function() {
    function loadNodeData(node, fnLoadComplete) {
        var callback = {
            success: parsejsonFile,
            failure: xmlLoaderrorFunction,
            argument: {
                node: node,
                fnLoadComplete: fnLoadComplete
            }
        };
        if (showhidden === null) {
            showhidden = 0;
        }
        var staleCache = new Date();
        var sUrl = CPANEL.security_token + "/json-api/cpanel";
        var post = "cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=listfiles&cpanel_jsonapi_apiversion=2&checkleaf=1&types=dir&dir=" + safeencode(node.data.path) + "&showdotfiles=" + showhidden + "&cache_fix=" + staleCache.getTime();
        YAHOO.util.Connect.asyncRequest("POST", sUrl, callback, post);
    }

    function buildTree() {

        // create a new tree:
        RootFileTree = new YAHOO.widget.TreeView("treeContainer");

        // Turn dynamic loading on for entire tree.
        // 1 -> display leaf nodes as leaf nodes
        // (I wonder who would want otherwise and why...)
        RootFileTree.setDynamicLoad(loadNodeData, 1);

        RootFileTree.subscribe("clickEvent", clickFolder);

        // get root node for tree:
        var root = RootFileTree.getRoot();

        // add child nodes for tree:
        var rootNode = new FM_Tree_Node(homedir, root);

        // whenever we expand, and the expansion creates new node HTML,
        // attach DDFile listeners to the new nodes.
        RootFileTree.subscribe("expand", function(expandee) {

            // This is only false if we know there are no children.
            if (expandee.hasChildren() === false) {
                return;
            }
            if (expandee.childrenRendered) {
                return;
            }

            this.subscribe("expandComplete", function completed(next_expandee) {
                this.unsubscribe("expandComplete", completed);

                refresh_selected_tree_node();

                if (next_expandee === expandee && expandee.childrenRendered) {
                    for (var c = 0; c < expandee.children.length; c++) {
                        expandee.children[c].sync_dd();
                    }
                }
            });
        });

        RootFileTree.removeNode = function(node, refresh) {
            var id = node.contentElId;
            var p = node.parent;
            var ret = YAHOO.widget.TreeView.prototype.removeNode.call(this, node);
            if (ret) {
                if (refresh) {
                    p.refresh();
                }
                var dd = DDM.getDDById(id);
                if (dd) {
                    dd.unreg();
                }
            }

            return ret;
        };

        RootFileTree.removeChildren = function(node) {
            var ids = node.children.map(function(c) {
                return c.contentElId;
            });
            var ret = YAHOO.widget.TreeView.prototype.removeChildren.apply(this, arguments);
            var new_ids = {};
            for (var c = 0, child; child = node.children[c++]; /* nothing*/ ) {
                new_ids[child.contentElId] = true;
            }
            for (var i = 0, id; id = ids[i++]; /* nothing*/ ) {
                if (!new_ids[id]) {
                    var dd = DDM.getDDById(id);
                    if (dd) {
                        dd.unreg();
                    }
                }
            }

            return ret;
        };

        rootNode.expand();
        RootFileTree.draw();

        // will be generated as needed by the dynamic loader.
        rootNode.getLabelEl().innerHTML = homeicon + " (" + homedir.html_encode() + ")";

        rootNode.sync_dd();
    }


    return {
        init: buildTree
    };
})();

EVENT.addListener(window, "load", myFileTree.init, myFileTree, true);

function dirnav() {

    // Send out for data in an asynchronous request
    updateFileList(homedir + document.getElementById("location").value);
    refreshTree();
}

function downloadFile(path) {
    var download_box = document.createElement("iframe");
    download_box.name = "download_box_" + Math.random();
    download_box.style.display = "none";
    document.body.appendChild(download_box);
    download_box.src = CPANEL.security_token + "/download?skipencode=1&file=" + safeencode(path); // must be done AFTER appended or safari will have an activity error

    var interval_id = setInterval(function() {
        document.body.removeChild(download_box);
        clearInterval(interval_id);
    }, 300000); // remove after 5 minutes so they can still click ok in firefox
}

function deactivateButton(action) {
    var buttonEl = document.getElementById("action-" + action);
    if (!buttonEl) {
        return;
    }

    var button = buttonEl.getElementsByTagName("img");

    if (button.length > 0 && !button[0].src.match("grey")) {
        var bn = button[0].src.split(".");
        var ext = bn.pop();
        button[0].src = bn.join(".") + "_grey." + ext;
    }
    DOM.addClass(buttonEl, "disabled");
}

function activateButton(action) {
    var buttonEl = document.getElementById("action-" + action);
    if (!buttonEl) {
        return;
    }
    var button = buttonEl.getElementsByTagName("img");

    if (button.length > 0 && button[0].src.match("_grey")) {
        button[0].src = button[0].src.replace("_grey", "");
    }
    DOM.removeClass(buttonEl, "disabled");
}

function handleSelections(oArgs) {
    var selectedFiles = [];
    for (var i in selectedFilesCache) {
        if (selectedFilesCache[i]) {
            selectedFiles.push(selectedFilesCache[i]);
        }
    }
    for (var action in actionlist) {
        if (actionlist[action].test(selectedFiles)) {
            if (actionlist[action].enabled !== true) {
                actionlist[action].enabled = true;
                activateButton(action);
            }
        } else {
            if (actionlist[action].enabled !== false) {
                actionlist[action].enabled = false;
                deactivateButton(action);
            }
        }
    }
}


function formatSearchFile(elCell, oRecord, tbl, oData) {
    CPANEL.util.set_text_content(elCell, getRelPath(oData));
}

var MimeTypesIconClasses = {
    "unix-directory": "fas fa-folder",
    "httpd-unix-directory": "fas fa-folder",

    "package-x-generic": "far fa-file-archive",

    "application-cgi": "far fa-file-code",
    "application-perl": "far fa-file-code",
    "application-ruby": "far fa-file-code",
    "application-x-httpd-php": "far fa-file-code",
    "text-html": "far fa-file-code",
    "text-css": "far fa-file-code",
    "text-vbscript": "far fa-file-code",
    "text-x-config": "far fa-file-code",
    "text-x-generic-template": "far fa-file-code",
    "text-cgi": "far fa-file-code",
    "text-x-script": "far fa-file-code",
    "text-x-log": "far fa-file-code",
    "text-x-sql": "far fa-file-code",
    "text-xml": "far fa-file-code",
    "text-x-registry": "far fa-file-code",

    "application-certificate": "fas fa-certificate",

    "text-x-generic": "fas fa-file-alt",
    "text-plain": "fas fa-file-alt",

    "application-msword": "far fa-file-word",
    "application-vnd.openxmlformats-officedocument.wordprocessingml.document": "far fa-file-word",
    "application-vnd.openxmlformats-officedocument.wordprocessingml.template": "far fa-file-word",
    "application-vnd.ms-word.document.macroEnabled.12": "far fa-file-word",
    "application-vnd.ms-word.template.macroEnabled.12": "far fa-file-word",

    "application-vnd.ms-excel": "far fa-file-excel",
    "application-vnd.openxmlformats-officedocument.spreadsheetml.sheet": "far fa-file-excel",
    "application-vnd.openxmlformats-officedocument.spreadsheetml.template": "far fa-file-excel",
    "application-vnd.ms-excel.sheet.macroEnabled.12": "far fa-file-excel",
    "application-vnd.ms-excel.template.macroEnabled.12": "far fa-file-excel",
    "application-vnd.ms-excel.addin.macroEnabled.12": "far fa-file-excel",
    "application-vnd.ms-excel.sheet.binary.macroEnabled.12": "far fa-file-excel",
    "x-office-spreadsheet-template": "far fa-file-excel",
    "x-office-spreadsheet": "far fa-file-excel",

    "application-vnd.ms-powerpoint": "far fa-file-powerpoint",
    "application-vnd.openxmlformats-officedocument.presentationml.presentation": "far fa-file-powerpoint",
    "application-vnd.openxmlformats-officedocument.presentationml.template": "far fa-file-powerpoint",
    "application-vnd.openxmlformats-officedocument.presentationml.slideshow": "far fa-file-powerpoint",
    "application-vnd.ms-powerpoint.addin.macroEnabled.12": "far fa-file-powerpoint",
    "application-vnd.ms-powerpoint.presentation.macroEnabled.12": "far fa-file-powerpoint",
    "application-vnd.ms-powerpoint.template.macroEnabled.12": "far fa-file-powerpoint",
    "application-vnd.ms-powerpoint.slideshow.macroEnabled.12": "far fa-file-powerpoint",
    "x-office-presentation-template": "far fa-file-powerpoint",
    "x-office-presentation": "far fa-file-powerpoint",

    "application-octet-stream": "far fa-file",
    "x-office-document": "far fa-file",
    "x-office-document-template": "far fa-file",

    "application-pdf": "far fa-file-pdf",

    "application-x-executable": "fas fa-terminal",

    "x-office-address-book": "fas fa-book",

    "x-office-calendar": "fas fa-calendar-alt",
    "text-calendar": "fas fa-calendar-alt",

    "application-x-img": "far fa-file-image",
    "x-office-drawing": "far fa-file-image",
    "image-x-generic": "far fa-file-image",

    "audio-basic": "far fa-file-audio",
    "audio-midi": "far fa-file-audio",
    "audio-mpeg": "far fa-file-audio",
    "audio-x-aiff": "far fa-file-audio",
    "audio-x-generic": "far fa-file-audio",
    "audio-x-mpegurl": "far fa-file-audio",
    "audio-x-realaudio": "far fa-file-audio",
    "audio-x-wav": "far fa-file-audio",
    "audio-x-pn-realaudio": "far fa-file-audio",

    "video-mpeg": "far fa-file-video",
    "video-quicktime": "far fa-file-video",
    "video-vnd.mpegurl": "far fa-file-video",
    "video-x-generic": "far fa-file-video",
    "video-x-sgi-movie": "far fa-file-video",
    "video-x-msvideo": "far fa-file-video",

    "mail": "fas fa-envelope",
    "publichtml": "fas fa-globe",
    "publicftp": "fas fa-exchange-alt"
};

function getMimeImageClass(type) {
    return MimeTypesIconClasses[type];
}

function formatImageCellNoCheck(elCell, oRecord, tbl, oData) {
    var iconClass = getMimeImageClass(unescape(oData));

    elCell.innerHTML = '<i class="' + iconClass + '" aria-hidden="true"></i>';
    YAHOO.util.Dom.addClass(elCell, "diricon");
}

function formatImageCell(elCell, oRecord, tbl, oData) {
    var iconClass = getMimeImageClass(unescape(oData));
    elCell.innerHTML = '<i class="' + iconClass + '" aria-hidden="true"></i>';

    if (oRecord.getData("type") === "link") {
        elCell.innerHTML = '<i class="' + iconClass + '" aria-hidden="true"></i><i class="fas fa-link fa-rotate-90" aria-hidden="true"></i>';
    }

    YAHOO.util.Dom.addClass(elCell, "diricon");
}

function formatTxt(elCell, oRecord, tbl, oData) {
    CPANEL.util.set_text_content(elCell, oData);
}


function handleRowSelect() {
    var elements = filesDataTable.getSelectedRows();
    if (!isLikeAnArray(elements)) {
        elements = [elements];
    }
    for (var i = 0; i < elements.length; i++) {
        var oId = elements[i];
        if (!oId) {
            continue;
        }
        if (typeof oId == "object") {
            selectedFilesCache[oId.id] = oId;
            oId = oId.id;
        } else {
            selectedFilesCache[oId] = document.getElementById(oId);
        } /* yui bug */
        if (!oId) {
            continue;
        }

        var oDD = DDM.getDDById(oId);
        if (oDD) {
            oDD.unlock();
            oDD.isTarget = false;
        }
    }
    if (selectMode != 2) {
        handleSelections();
    }
}

function handleRowUnSelect(oArgs) {
    var elements = oArgs.target;
    if (!isLikeAnArray(elements)) {
        elements = [elements];
    }
    for (var i = 0; i < elements.length; i++) {
        var oId = elements[i];
        if (!oId) {
            continue;
        }
        if (typeof oId == "object") {
            oId = oId.id;
            delete selectedFilesCache[oId];
        } else {
            delete selectedFilesCache[oId];
        } /* yui bug */
        if (!oId) {
            continue;
        }
        var oDD = DDM.getDDById(oId);
        if (oDD) {
            oDD.lock();
            if (oDD.type != "file") {
                oDD.isTarget = true;
            }
        }
    }
    if (selectMode != 2) {
        handleSelections();
    }
}


function upgradeFm() {

    // if (self["cpversion"] && cpversion.match(/UNKNOWN|EDGE/)) {
    usejson = 1;

    // }

    /*
    The code is here to support editing the filename inline
    but it too often confuses people and is a usability issue

    see case 14330
     {key:"name",label:"Name",sortable:true,editor:"textbox",formatter:formatTxt},
*/
    var file_field_formatter = function(el, oRecord, oColumn, oData) {
        el.innerHTML = "<span class=\"renameable\" title=\"" + oData.html_encode() + "\">" + oData.html_encode() + "</span>";
        var rename_wrapper = el.firstChild;

        var the_table = this;

        EVENT.on(rename_wrapper, "dblclick", YAHOO.util.Event.stopPropagation);
        EVENT.on(rename_wrapper, "click", function(e) {
            if (!filesDataTable.isSelected(oRecord)) {
                return true;
            }

            YAHOO.util.Event.stopPropagation(e);

            var scratch = document.getElementById("renameField");
            if (scratch) {
                if (DOM.isAncestor(el, scratch)) {
                    scratch.blur();
                } else {
                    return true;
                }
            }

            var do_rename = function() {
                TEXT_FIELD_FOCUS = 0;
                new_value = rename_field.value;
                key_listener.disable();

                var row = the_table.getRow(oRecord);

                if (new_value && (new_value != oData)) {
                    var selectedFiles = [row];
                    var fileList = [cwd + "/" + oRecord.getData("file")];
                    var destList = [new_value];
                    scheduleFileOp("rename", fileList, destList, row, 1);
                    rename_field.disabled = true;
                    EVENT.removeListener(rename_field, "blur", cancel_rename);
                    rename_field.blur();
                } else {
                    cancel_rename();
                }
            };

            var cancel_rename = function() {
                CPANEL.util.set_text_content(rename_wrapper, oData);
            };

            var rename_key = function(type, args, obj) {
                switch (args[0]) {
                    case 27: // esc
                        cancel_rename();
                        break;
                    case 13: // enter
                        do_rename();
                        break;
                }
            };

            rename_wrapper.innerHTML = "<input id=\"renameField\" width=\"100%\" value=\"" + oData.html_encode() + "\" />";
            TEXT_FIELD_FOCUS = 1;
            var rename_field = rename_wrapper.firstChild;
            rename_field.focus();

            EVENT.on(rename_field, "blur", cancel_rename);
            EVENT.on(rename_field, "mousedown", YAHOO.util.Event.stopPropagation);
            EVENT.on(rename_field, "dragstart", YAHOO.util.Event.stopPropagation);
            EVENT.on(rename_field, "click", YAHOO.util.Event.stopPropagation);
            EVENT.on(rename_field, "dblclick", YAHOO.util.Event.stopPropagation);
            var key_listener = new YAHOO.util.KeyListener(rename_field, {
                keys: [27, 13]
            }, rename_key);
            key_listener.enable();
        });
    };

    var today_string = CPANEL.cldr.datetime_format
        .replace("{0}", CPANEL.DateTime.time_format_short)
        .replace("{1}", LANG.today);
    var yesterday_string = CPANEL.cldr.datetime_format
        .replace("{0}", CPANEL.DateTime.time_format_short)
        .replace("{1}", LANG.yesterday);

    // We can't assume a day is 86,400,000 milliseconds because of leap seconds.
    // NB: JavaScript "does the right thing" with the 1st/last of the month.
    var now = new Date();
    var midnight_s = (new Date(now.getFullYear(), now.getMonth(), now.getDate())).getTime() / 1000;
    var yesterday_s = (new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)).getTime() / 1000;
    var tomorrow_s = (new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)).getTime() / 1000;

    var mtime_formatter = function(cell, rec, col, data) {
        var format_string;
        if (data < tomorrow_s) { // time-warp safe
            if (data >= midnight_s) {
                format_string = today_string;
            } else if (data >= yesterday_s) {
                format_string = yesterday_string;
            }
        }

        var temp_date = (new Date(1000 * data));
        if (temp_date.toString() !== "Invalid Date") {
            temp_date = temp_date.toCpLocaleString(format_string);
        }
        CPANEL.util.set_text_content(cell, temp_date);
    };

    now = new Date();
    var match = now.toString().match(/\(([^\)]+)\)$/);
    var tz_header = match ? " (" + match[1] + ")" : "";

    var opera_quirks = quirksmode == "Opera";

    var myColumnHeaders = [{
        key: "mimename",
        label: "&nbsp;",
        type: "string",
        sortable: false,
        width: 35,
        formatter: formatImageCell
    }, {
        key: "file",
        label: "Name",
        sortable: true,
        formatter: opera_quirks ? formatTxt : file_field_formatter
    }, {
        key: "size",
        label: "Size",
        type: "string",
        sortable: true,
        width: 100,
        formatter: function(c, rec, col, d) {
            c.innerHTML = rec.getData("humansize");
        }
    }, {
        key: "mtime",

        // label: "Modified" + tz_header,
        label: "Last Modified",
        sortable: true,
        formatter: mtime_formatter,
        width: 200
    }, {
        key: "mimetype",
        label: "Type",
        width: 180,
        sortable: true
    }, {
        key: "nicemode",
        label: "Permissions",
        width: 100,
        type: "number",
        sortable: true,
        editor: opera_quirks ? null : "textbox"
    }];

    window.COLUMN_PADDING_BORDER = 1; // 1px right border
    window.NON_NAME_COLUMN_WIDTHS_TOTAL = myColumnHeaders.reduce(function(a, b) {
        if ("width" in b) {
            return a + b.width + window.COLUMN_PADDING_BORDER;
        }
        return a;
    }, 18); // 18px scrollbar padding

    var emptyDS = new YAHOO.util.DataSource();
    emptyDS.responseType = YAHOO.util.DataSource.TYPE_JSARRAY;
    emptyDS.responseSchema = {
        resultNode: "file",
        resultsList: "files",
        fields: ["mimename", "file", "humansize", "size", "mimetype", "nicemode", "mtime", "type"]
    };

    myDataSource = new YAHOO.util.DataSource(CPANEL.security_token + "/json-api/cpanel?cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=listfiles&cpanel_jsonapi_apiversion=2&needmime=1&");
    myDataSource.doBeforeCallback = function(oRequest, oFullResponse, oParsedResponse) {
        if (oFullResponse && oFullResponse.cpanelresult && oFullResponse.cpanelresult.data && oFullResponse.cpanelresult.data[0] && (oFullResponse.cpanelresult.data)[0].absdir) {
            cwd = (oFullResponse.cpanelresult.data)[0].absdir;
        }
        return oParsedResponse;
    };


    myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
    myDataSource.responseSchema = {
        resultsList: "cpanelresult.data",
        fields: [{
            key: "mimename"
        }, {
            key: "file",
            parser: YAHOO.util.DataSource.parseString
        }, {
            key: "humansize"
        }, {
            key: "size",
            parser: Number
        }, // So "" from the API becomes 0.
        {
            key: "mimetype"
        }, {
            key: "nicemode"
        }, {
            key: "mtime"
        }, {
            key: "type"
        }
        ]
    };
    var markup = YAHOO.util.Dom.get("filesarea");
    var containerEl = YAHOO.util.Dom.get("subright");

    var heightTxt = (containerEl.offsetHeight - DOM.get("midtoolbar").offsetHeight - DOM.get("top").offsetHeight - TABLE_HEADER_HEIGHT - bOffset) + "px";
    var Cwidth = (containerEl.offsetWidth - GUTTER_SPACE - bOffset);
    var widthTxt = Cwidth + "px";

    var nameColWidth = Cwidth - window.COLUMN_PADDING_BORDER - window.NON_NAME_COLUMN_WIDTHS_TOTAL;
    if (nameColWidth < NAME_COLUMN_MINIMUM_WIDTH) {
        nameColWidth = NAME_COLUMN_MINIMUM_WIDTH;
    }

    myColumnHeaders[1]["width"] = nameColWidth;

    var myColumnSet = new YAHOO.widget.ColumnSet(myColumnHeaders);
    filesDataTable = new YAHOO.widget.DataTable("filesarea", myColumnSet, emptyDS, {
        MSG_EMPTY: "", // initial setting
        MSG_LOADING: CPANEL.icons.ajax + " " + LANG.loading,
        scrollable: true,
        height: heightTxt,
        width: widthTxt,
        renderLoopSize: 200
    });

    filesDataTable.onEventSelectRow = function(oArgs) {
        var row = oArgs.target;
        if (row.nodeName.toLowerCase() !== "tr") {
            row = DOM.getAncestorByTagName(row, "tr");
            if (!row) {
                return;
            } // ruh-roh!
        }

        if (this.isSelected(row) && this.getSelectedRows().length === 1) {
            this.unselectRow(row);
        } else {
            arguments.callee.overridee.apply(this, arguments);
        }
    };
    filesDataTable.onEventSelectRow.overridee = YAHOO.widget.DataTable.prototype.onEventSelectRow;

    filesDataTable.subscribe("postRenderEvent", setupFilesTable);

    function resizeFileWindow() {
        if (!filesDataTable || !filesDataTable.getHdContainerEl()) {
            window.setTimeout(resizeFileWindow, 1000);
            return;
        }

        var containerEl = DOM.get("subright");
        var heightTxt = (containerEl.offsetHeight - DOM.get("midtoolbar").offsetHeight - DOM.get("top").offsetHeight - TABLE_HEADER_HEIGHT - bOffset) + "px";
        var Cwidth = (containerEl.offsetWidth - GUTTER_SPACE - bOffset);
        var widthTxt = Cwidth + "px";

        var nameCol = filesDataTable.getColumn("file");
        var nameColWidth = Cwidth - window.COLUMN_PADDING_BORDER - window.NON_NAME_COLUMN_WIDTHS_TOTAL;
        if (nameColWidth < NAME_COLUMN_MINIMUM_WIDTH) {
            nameColWidth = NAME_COLUMN_MINIMUM_WIDTH;
        }

        filesDataTable.setColumnWidth(nameCol, nameColWidth);

        filesDataTable.set("width", widthTxt);
        filesDataTable.set("height", heightTxt);
        filesDataTable.validateColumnWidths();
    }

    EVENT.addListener(window, "resize", resizeFileWindow);

    filesDataTable.dataSource = myDataSource;
    var handleSelectChooser = function(oArgs) {
        var elements = oArgs.target;
        var scratch = document.getElementById("renameField");
        if (scratch) {
            scratch.blur();
        }

        if (this.isSelected(oArgs.target)) {
            handleRowSelect();
        } else {
            handleRowUnSelect(oArgs);
        }
    };

    function handleCellClick() {
        myContextMenu.hide();
    }

    function handleDblClick(e) {
        var row = EVENT.getTarget(e);
        var path = getFilePathFromRow(row);
        var type = filesDataTable.getRecord(row).getData("mimetype");
        var windowSwitch = function() {
            if (type.match("-directory") || type == "mail" || type == "publichtml" || type == "publicftp") {
                updateFileList(path);
            } else {
                downloadFile(path);
            }
        };
        window.setTimeout(windowSwitch, 100);
    }

    function handleCellEdit(e) {
        var oColumn = e.editor.getColumn();
        var oRecord = e.editor.getRecord();
        var oData = oRecord.getData();
        if (oColumn.key == "file") {
            var srcFileList = [cwd + "/" + e.oldData];
            var destFileList = [cwd + "/" + e.newData];
            if (srcFileList[0] != destFileList[0]) {
                scheduleFileOp("rename", srcFileList, destFileList, e.editor.cell.parentNode);
            }
        } else {

            /* chmod*/
            var srcFileList = [cwd + "/" + oData.file];
            var destFileList = [];
            if (e.oldData != e.newData) {
                scheduleFileOp("chmod", srcFileList, destFileList, e.newData);
            }
        }
    }


    /*
  This is a hack to make it account for the scroll

*/

    /*
    YAHOO.widget.ColumnEditor.prototype.moveContainerTo = function(el) {
        var x,y;

        // Don't use getXY for Opera
        if(navigator.userAgent.toLowerCase().indexOf("opera") != -1) {
            x = el.offsetLeft;
            y = el.offsetTop;
            while(el.offsetParent) {
                x += el.offsetParent.offsetLeft;
                y += el.offsetParent.offsetTop;
                el = el.offsetParent;
            }
        }
        else {
            x = parseInt(YAHOO.util.Dom.getX(el),10);//xy[0] + 1;
            y = parseInt(YAHOO.util.Dom.getY(el),10);//xy[1] + 1;
        }

        this.container.style.left = x + "px";
        this.container.style.top = y - document.getElementById("filesarea").scrollTop + "px";
    };
*/

    function fixupTextbox(e, p) {
        filesDataTable.activeEditor.container.style.top = filesDataTable.activeEditor.container.offsetTop - document.getElementById("filesarea").scrollTop + "px";
        filesDataTable.activeEditor.show();
    }

    function resetScroll() {
        window.scrollTop = 0;
    }

    filesDataTable.subscribe("columnSortEvent", handleColumnSort);
    filesDataTable.subscribe("editorSaveEvent", handleCellEdit);
    filesDataTable.subscribe("cellClickEvent", filesDataTable.onEventShowCellEditor);
    filesDataTable.subscribe("cellClickEvent", filesDataTable.onEventSelectRow);
    filesDataTable.subscribe("cellClickEvent", handleCellClick);
    filesDataTable.subscribe("rowDblclickEvent", handleDblClick);
    filesDataTable.subscribe("rowClickEvent", handleSelectChooser);
    filesDataTable.subscribe("editorShowEvent", resetScroll);
    filesDataTable.subscribe("unselectAllRowsEvent", handleunselectAllRowsEvent);

    //    filesDataTable.subscribe("editorShowEvent",fixupTextbox);


    var onContextMenuShow = function(p_sType, p_aArgs, p_oMenu) {
        var row = this.contextEventTarget;
        while (row.tagName.toLowerCase() != "tr") {
            row = row.parentNode;
            if (row.tagName.toLowerCase == "body") {
                row = null;
                break;
            }
        }
        if (row) {
            if (!filesDataTable.isSelected(row)) {
                unselectAllFiles();
                selectFile(row);
            }
            var menuItems = this.getItems();

            for (var i = 0, length = contextMenuItems.length; i < length; i++) {
                if (contextMenuItems[i].obj.test([row])) {
                    if (contextMenuItems[i].obj.menabled !== true) {
                        contextMenuItems[i].obj.menabled = true;
                        menuItems[i].cfg.setProperty("disabled", false);
                        menuItems[i].cfg.setProperty("visible", true);
                        menuItems[i]._oAnchor.parentNode.style.display = "";
                    }
                } else {
                    if (contextMenuItems[i].obj.menabled !== false) {
                        contextMenuItems[i].obj.menabled = false;
                        menuItems[i].cfg.setProperty("disabled", true);
                        menuItems[i]._oAnchor.parentNode.style.display = "none";
                    }
                }
            }
        }
    };

    var onContextMenuClick = function(p_sType, p_aArgs, p_oMenu) {
        var task = p_aArgs[1];

        if (task) {
            if (task.cfg.getProperty("disabled")) {
                return;
            }

            // Extract which row was context-clicked
            var row = this.contextEventTarget;
            while (row.tagName.toLowerCase() != "tr") {
                row = row.parentNode;
                if (row.tagName.toLowerCase == "body") {
                    row = null;
                    break;
                }
            }

            if (row) {
                if (contextMenuItems[task.index]) {
                    var actionName = contextMenuItems[task.index].action;
                    actionHandler(actionName);
                } else {
                    alert("Event not handled: index:" + task.index + " name:" + task.toString());
                }
            }
        }
    };


    myContextMenu = new YAHOO.widget.ContextMenu("mycontextmenu", {
        trigger: filesDataTable.getBody()
    });

    var contextMenuItem = "";
    for (var i = 0, length = contextMenuItems.length; i < length; i++) {
        contextMenuItem = '<i class="' + contextMenuItems[i].className + '" aria-hidden="true"></i>&nbsp' + contextMenuItems[i].displayName;
        myContextMenu.addItem(contextMenuItem);
    }
    myContextMenu.render(document.body);
    myContextMenu.clickEvent.subscribe(onContextMenuClick);
    myContextMenu.triggerContextMenuEvent.subscribe(onContextMenuShow);

    var beginLoad;
    if (workingdir) {
        beginLoad = function() {
            updateFileList(workingdir);
        };
    } else {
        beginLoad = function() {
            updateFileList(homedir);
        };
    }

    var domWait = function() {
        YAHOO.util.Event.onDOMReady(beginLoad);
    };

    window.setTimeout(domWait, 50);

    EVENT.addListener(filesDataTable.getBody(), "mousedown", handleSelectBoxMouseDown);

}

// this function runs whenever a key is pressed on the page
// there's only one shortcut right now (delete), but it would make sense to add some more hotkeys in the future and give an option to enable/disable them

function checkKeys(e) {

    // 46 is the delete key
    if (e.keyCode == 46) {

        // Don't do anything if the focus is on a text box or if there is
        // a panel already shown.
        if (Shown_Panel) {
            return;
        }
        if (TEXT_FIELD_FOCUS != 0) {
            return;
        }

        // If a file is selected and the focus is not on a text input box, show the delete file panel
        var selectedFiles = filesDataTable.getSelectedTrEls();
        if (selectedFiles && selectedFiles[0]) {
            if (srcDirContainsDestDir(cwd, homedir + "/.trash")) {
                show_panel("delete");
            } else {
                show_panel("trash");
            }
        }
    }
}

function _create_new(is_dir) {
    var dir = this.form.path.value;
    var filename = this.form.name.value;

    var url = CPANEL.security_token + "/json-api/cpanel";
    var callback = {
        success: function(o) {
            try {
                var json = YAHOO.lang.JSON.parse(o.responseText);
                if (json.cpanelresult.error) {
                    alert("ERROR: " + json.cpanelresult.error);
                } else {
                    var resp = json.cpanelresult.data[0];
                    if (is_dir) {
                        if (resp.path !== cwd) {
                            throw "Directory changed";
                        }

                        // Now that the directory is created, the file table will refresh.
                        // Once that is done, find out where the server put the directory
                        // in the file listing, and create a tree node in the same order.
                        // This way we avoid guessing the file system's ordering in JS.
                        var new_name = resp.name;
                        var new_path = cwd + "/" + new_name;
                        filesDataTable.subscribe("dataReturnEvent", function adder(args) {
                            this.unsubscribe("dataReturnEvent", adder);
                            var records = args.response.results;
                            var i = 0,
                                len = records.length,
                                cur;

                            // First find the newly-created directory.
                            while (i < len && records[i].file !== new_name) {
                                i++;
                            }

                            // Now find the next directory.
                            do {
                                i++;
                            } while ((cur = records[i]) && !/-directory/i.test(cur.mimetype));

                            add_path_to_tree(new_path, cur && cur.file);
                        });

                        /*
                    var node = RootFileTree.getNodeByProperty("path", resp.path);
                    if ( node ) {
                        if ( node.isLeaf ) {
                            add_path_to_tree(resp.path + "/" + resp.name);
                        }
                        else {
                            nukeNode( node, null );
                        }
                    }
*/
                    }

                    refreshFiles();
                }
            } catch (e) {
                alert("AJAX error; please reload this page and try again.");
                if (window.console) {
                    console.log(e, o && o.responseText);
                }
            }
        }
    };
    var api_func = is_dir ? "mkdir" : "mkfile";
    var post = "cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=" + api_func + "&path=" + safeencode(dir) + "&name=" + safeencode(filename);
    YAHOO.util.Connect.asyncRequest("POST", url, callback, post);
}

function create_new_file() {
    _create_new.call(this);
}

function create_new_dir() {
    _create_new.call(this, true);
}

function handleSubmit() {
    this.submit();
}

function handleCancel() {
    TEXT_FIELD_FOCUS = 0;
    this.cancel();
    waitpanel.hide();
}

function handleMove(e) {
    var target = this.getData().movefilepath;
    if (target === "") {
        target = "/";
    }

    var fileList = filesDataTable.getSelectedTrEls().map(getFilePathFromRow);
    var destList = [target];
    scheduleFileOp("move", fileList, destList, filesDataTable.getSelectedTrEls()[0]);
    this.hide();
    return false;
}

function handleDelete(e) {
    deleteFiles(this.getData());
    this.hide();
    return false;
}

function handleEmptyTrash() {
    emptyTrash();
    updateFileList(homedir);
    this.hide();
    return false;
}

function handleRestore(e) {
    restoreFiles();
    this.hide();
    return false;
}

function disableEncodings(panelid) {
    show_panel("encodingsdisabled");
    var eEl = document.getElementById(panelid + "-encodings");
    if (eEl) {
        eEl.style.display = "none";
    }
    SetNvData("ignorecharencoding", 1);
    handleEdit(panels["edit"].panel);
}

function handleEdit(panel) {
    if (!panel || !panel.getData) {
        panel = this;
    }
    waitpanel.hide();
    var formData = panel.getData();
    document.getElementById("actionform_temp_charset").value = formData.charset;
    editFile(1, cwd + "/" + formData.file);
    panel.hide();
    return false;
}

function handleSavePrefs() {
    var ignoreCharCode = document.getElementById("prefs-ignorecharencoding").checked;
    var showHiddenFiles = document.getElementById("optionselect_showhidden").checked;


    if (ignoreCharCode) {
        if (!NVData["ignorecharencoding"]) {
            SetNvData("ignorecharencoding", 1);
            DOM.get("edit-charset").selectedIndex = 0;
        }
    } else {
        SetNvData("ignorecharencoding", 0);
    }

    if (showHiddenFiles) {
        if (!NVData["showhiddenfiles"]) {
            SetNvData("showhiddenfiles", 1);
            showhidden = 1;
        }
    } else {
        SetNvData("showhiddenfiles", 0);
        showhidden = 0;
    }


    setDefaultDirectory();

    // Refresh tree view to show or hide hidden files
    myFileTree.init();

    // Refresh the details view to show or hide hidden files
    // for the currently selected directory
    updateFileList(cwd);

    this.hide();

}

function setDefaultDirectory() {
    var defaultDirPref = null;

    var defaultDirType = null;
    var defaultDirDomain = null;

    if (document.getElementById("dirselect_homedir").checked) {
        defaultDirType = "homedir";
        defaultDirPref = homedir;
    } else if (document.getElementById("dirselect_webroot").checked) {
        defaultDirType = "webroot";
        defaultDirPref = homedir + "/public_html";
    } else if (document.getElementById("dirselect_ftproot").checked) {
        defaultDirType = "ftproot";
        defaultDirPref = homedir + "/public_ftp";
    } else if (document.getElementById("rbtnDomainRoot").checked) {
        defaultDirType = "domainrootselect";

        var domainSelect = document.getElementById("ddlDomainSelect");
        var value = domainSelect.options[domainSelect.selectedIndex].value;

        defaultDirDomain = value;
        defaultDirPref = web_docroots[value];
    } else {
        defaultDirType = "homedir";
        defaultDirPref = homedir;
    }

    SetNvData("defaultdir", defaultDirPref);
    SetNvData("defaultdirtype", defaultDirType);
    SetNvData("defaultdirdomain", defaultDirDomain);
}

function handleHtmlEdit(e) {
    var formData = this.getData();
    document.getElementById("actionform_charset").value = formData.charset;
    document.getElementById("actionform_baseurl").value = formData.url[0];
    document.getElementById("actionform_basedir").value = formData.basedir[0];
    editFile(2, cwd + "/" + formData.file);
    this.hide();
    return false;
}


function handleRename(e) {
    TEXT_FIELD_FOCUS = 0;
    var target = this.getData().newname;
    if (typeof window.force_select != "undefined") {
        var selectedFiles = [window.force_select];
        window.force_select = undefined;
    } else {
        var selectedFiles = filesDataTable.getSelectedTrEls();
    }
    var fileList = [getFilePathFromRow(selectedFiles[0])];
    var destList = [target];
    scheduleFileOp("rename", fileList, destList, selectedFiles[0], 1);
    this.hide();
    return false;
}

function handleChmod(e) {
    var newperms = "0" + this.getData().u + this.getData().g + this.getData().w;
    var destList = [];
    var selectedFiles = filesDataTable.getSelectedTrEls();
    var fileList = selectedFiles.map(getFilePathFromRow);
    scheduleFileOp("chmod", fileList, destList, newperms, 1, selectedFiles);
    this.hide();
    return false;
}


function handleExtract(e) {
    var target = this.getData().extractfilepath;

    var selectedFiles = filesDataTable.getSelectedTrEls();
    var filepath = getFilePathFromRow(selectedFiles[0]);
    show_loading("Extracting Archive", "Archive: " + homeicon + filepath.html_encode() + "<br />Extraction Location: " + homeicon + target.html_encode());
    var fileList = [filepath];
    var destList = [target];
    scheduleFileOp("extract", fileList, destList);
    this.hide();
    return false;

}

function handleCompress(e) {
    var target = this.getData().compressfilepath;
    var compresstype = this.getData().compresstype || "zip";

    show_loading("Creating Archive", "Archive Location: " + homeicon + target.html_encode());
    var destList = [target];
    var fileList = filesDataTable.getSelectedTrEls().map(getFilePathFromRow);
    scheduleFileOp("compress", fileList, destList, compresstype);
    this.hide();
    return false;

}

function handleCopy(e) {
    var target = this.getData().copyfilepath;

    var destList = [target];
    var fileList = filesDataTable.getSelectedTrEls().map(getFilePathFromRow);

    scheduleFileOp("copy", fileList, destList);
    this.hide();
    return false;

}

// this object holds attributes for modal panels
var panels = {

    // new file panel
    newfile: {
        onload: function() {
            document.getElementById("new-file-name").value = "";
        },
        panel: null,
        targetfilepath: "new-file-path",
        submit: create_new_file,
        buttons: [{
            text: "Create New File",
            isDefault: true
        }, {
            text: "Cancel"
        }]
    },

    // new folder panel
    newfolder: {
        panel: null,
        onload: function() {
            document.getElementById("new-folder-name").value = "";
        },
        targetfilepath: "new-folder-path",
        submit: create_new_dir,
        buttons: [{
            text: "Create New Folder",
            isDefault: true
        }, {
            text: "Cancel"
        }]
    },

    // trash file panel
    "trash": {
        panel: null,
        filelist: "trash-filelist",
        submit: handleDelete,
        buttons: [{
            text: "Confirm",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {},
        onload: function() {
            document.getElementById("deleteme").checked = false;
        }
    },

    // emptytrash file panel
    "emptytrash": {
        panel: null,
        submit: handleEmptyTrash,
        buttons: [{
            text: "Empty Trash",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // delete file panel
    "delete": {
        panel: null,
        filelist: "delete-filelist",
        submit: handleDelete,
        buttons: [{
            text: "Delete File(s)",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // restore file panel
    "restore": {
        panel: null,
        filelist: "restore-filelist",
        submit: handleRestore,
        buttons: [{
            text: "Restore File(s)",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // extract panel
    extract: {
        panel: null,
        filelist: "extract-filelist",
        targetfilepath: "extractfilepath",
        submit: handleExtract,
        buttons: [{
            text: "Extract File(s)",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // compress panel
    compress: {
        panel: null,
        filelist: "compress-filelist",
        displaylist: {
            multiple: "compress-multifile",
            single: "compress-singlefile"
        },
        onload: function(selectedFiles) {
            setCompressFileName(selectedFiles);
        },
        submit: handleCompress,
        buttons: [{
            text: "Compress File(s)",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // copy panel
    copy: {
        panel: null,
        filelist: "copy-filelist",
        hasfilelist: "copy-hasfilelist",
        targetfilepath: "copy-file-path",
        submit: handleCopy,
        buttons: [{
            text: "Copy File(s)",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // search results panel
    "search-results": {
        panel: null,
        init: function() {
            var searchColumnHeaders = [{
                key: "mimeinfo",
                label: "&nbsp;",
                type: "string",
                width: 32,
                sortable: false,
                formatter: formatImageCellNoCheck
            }, {
                key: "file",
                label: "Name",
                sortable: true,
                formatter: formatSearchFile
            }];
            var blankdata = [{
                mimeinfo: "",
                file: ""
            }];
            var searchDataSource = new YAHOO.util.DataSource(blankdata);
            var searchColumnSet = new YAHOO.widget.ColumnSet(searchColumnHeaders);
            var markup = YAHOO.util.Dom.get("search-results-div");

            searchDataTable = new YAHOO.widget.DataTable(markup, searchColumnSet, searchDataSource, {
                scrollable: true,
                height: "280px",
                width: "460px"
            });

            searchDataTable.subscribe("rowDblclickEvent", handleSearchDblClick);
        },
        buttons: [{
            text: "Close",
            handler: handleCancel,
            isDefault: true
        }],
        successFunc: function(o) {},
        failFunc: function(o) {},
        onunload: function() {
            document.getElementById("search-results-div").style.display = "none";
            nukeSearchResults();
        }
    },

    // move panel
    move: {
        panel: null,
        filelist: "move-filelist",
        hasfilelist: "move-hasfilelist",
        targetfilepath: "move-file-path",
        submit: handleMove,
        buttons: [{
            text: "Move File(s)",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // rename panel
    rename: {
        panel: null,
        file: "rename-file",
        newfile: "rename-newfile",
        hasfile: "rename-hasfile",
        singlefilelist: "rename-filelist",
        targetfilepath: "rename-dir",
        submit: handleRename,
        buttons: [{
            text: "Rename File",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {},
        onload: function() {
            TEXT_FIELD_FOCUS = 1;
        }
    },

    edit: {
        panel: null,
        file: "edit-file",
        hasfile: "edit-hasfile",
        singlefilelist: "edit-filelist",
        targetfilepath: "edit-dir",
        submit: handleEdit,
        buttons: [{
            text: "Edit",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    encodingsdisabled: {
        panel: null,
        submit: function() {
            this.cancel();
        },
        buttons: [{
            text: "Ok",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // preferences panel
    prefs: {
        panel: null,
        submit: handleSavePrefs,
        buttons: [{
            text: "Save",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {},
        onload: function() {
            if (self["NVData"]) {
                document.getElementById("prefs-ignorecharencoding").checked = (NVData["ignorecharencoding"] ? true : false);
                document.getElementById("optionselect_showhidden").checked = (NVData["showhiddenfiles"] ? true : false);

                // select Default directory
                if (NVData["defaultdir"] != null) {

                    if ( NVData["defaultdirtype"] !== null) {
                        var defaultDirType = NVData["defaultdirtype"];
                        if (defaultDirType === "homedir") {
                            document.getElementById("dirselect_homedir").checked = true;
                        } else if (defaultDirType === "webroot") {
                            document.getElementById("dirselect_webroot").checked = true;
                        } else if (defaultDirType === "ftproot") {
                            document.getElementById("dirselect_ftproot").checked = true;
                        } else if (defaultDirType === "domainrootselect") {
                            document.getElementById("rbtnDomainRoot").checked = true;

                            if (NVData["defaultdirdomain"] !== null) {
                                var domainSelect = document.getElementById("ddlDomainSelect");
                                domainSelect.value = NVData["defaultdirdomain"];
                            }
                        }
                    } else {
                        document.getElementById("dirselect_homedir").checked = true;
                    }

                } else {
                    document.getElementById("dirselect_homedir").checked = true;
                }

            }
        }
    },

    // HTML editor panel
    htmledit: {
        panel: null,
        file: "htmledit-file",
        hasfile: "htmledit-hasfile",
        singlefilelist: "htmledit-filelist",
        targetfilepath: "htmledit-dir",
        submit: handleHtmlEdit,
        buttons: [{
            text: "Edit",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        successFunc: function(o) {},
        failFunc: function(o) {}
    },

    // change permissions panel
    chmod: {
        file: "chmod-file",
        targetfilepath: "chmod-dir",
        filelist: "chmod-filelist",
        panel: null,
        submit: handleChmod,
        buttons: [{
            text: "Change Permissions",
            isDefault: true
        }, {
            text: "Cancel"
        }],
        onload: function(selectedFiles) {
            if (!selectedFiles[0]) {
                return;
            }

            /* http://www.quirksmode.org/blog/archives/2006/04/ie_7_and_javasc.html
        - substr(x) where x is a negative value is still broken; I just can't believe they have not found and/or bothered to fix this since it is present as of IE4 afaik */
            var fperms = "x" + filesDataTable.getRecord(selectedFiles[0]).getData("nicemode");
            var u = fperms.substr(2, 1);
            var g = fperms.substr(3, 1);
            var w = fperms.substr(4, 1);

            var ur = (u == 4 || u == 5 || u == 6 || u == 7) ? 1 : 0;
            var uw = (u == 2 || u == 3 || u == 6 || u == 7) ? 1 : 0;
            var ux = (u == 1 || u == 3 || u == 5 || u == 7) ? 1 : 0;
            var gr = (g == 4 || g == 5 || g == 6 || g == 7) ? 1 : 0;
            var gw = (g == 2 || g == 3 || g == 6 || g == 7) ? 1 : 0;
            var gx = (g == 1 || g == 3 || g == 5 || g == 7) ? 1 : 0;
            var wr = (w == 4 || w == 5 || w == 6 || w == 7) ? 1 : 0;
            var ww = (w == 2 || w == 3 || w == 6 || w == 7) ? 1 : 0;
            var wx = (w == 1 || w == 3 || w == 5 || w == 7) ? 1 : 0;
            document.fmode.ur.checked = ur;
            document.fmode.uw.checked = uw;
            document.fmode.ux.checked = ux;
            document.fmode.gr.checked = gr;
            document.fmode.gw.checked = gw;
            document.fmode.gx.checked = gx;
            document.fmode.wr.checked = wr;
            document.fmode.ww.checked = ww;
            document.fmode.wx.checked = wx;
            calcperm();
        },
        successFunc: function(o) {
            refreshFiles();
        },
        failFunc: function(o) {}
    }

}; // end panel object

var Shown_Panel;

// initialize a Yahoo Panel

function init_panels(initpanel) {

    // if the panel is already initialized, exit the function
    if (inited_panels[initpanel]) {
        return;
    }

    // mark the panel as being initialized
    inited_panels[initpanel] = 1;

    // loop through the panels array to find the one we want to initialize
    for (var i in panels) {

        // if this isn't the panel we want go to the next one
        if (i != initpanel) {
            continue;
        }

        // if the panel already exists go to the next one
        // C. Oakman: in practice this should never happen?
        var panelEl = document.getElementById(i);
        if (!panelEl) {
            continue;
        }

        // initialize the panel
        panelEl.style.display = "";
        var panel_attributes = {
            width: "500px",
            fixedcenter: true,
            modal: true,
            visible: false,
            draggable: true,
            close: true,
            constraintoviewport: true,
            postmethod: "manual",
            effect: {
                effect: CPANEL.animate.ContainerEffect.FADE_MODAL,
                duration: 0.25
            },
            buttons: panels[i].buttons
        };
        for (var b = 0, cur_b; cur_b = panel_attributes.buttons[b]; b++) {
            if (!("handler" in cur_b)) {
                cur_b.handler = cur_b.isDefault ? handleSubmit : handleCancel;
            }
        }

        panels[i].panel = new YAHOO.widget.Dialog(i, panel_attributes);
        panels[i].panel.callback = {
            success: panels[i].successFunc,
            failure: panels[i].failFunc
        };

        if ("submit" in panels[i]) {
            panels[i].panel.manualSubmitEvent.subscribe(panels[i].submit);
        }

        // case 38651: clicking the X on the Code Editor shows a loading panel that does not go away
        if (i == "edit") {
            panels[i].panel.hideEvent.subscribe(function() {
                waitpanel.hide();
            });
        }

        if (panels[i].onunload) {
            panels[i].panel.beforeHideEvent.subscribe(panels[i].onunload, panels[i].panel, true);
        }
        panels[i].panel.beforeHideEvent.subscribe(panel_cleanup, panels[i], true);

        if (panels[i].init) {
            panels[i].init();
        }

        panels[i].panel.showEvent.subscribe(function() {
            Shown_Panel = this;
        });
        panels[i].panel.hideEvent.subscribe(function() {
            if (Shown_Panel === this) {
                Shown_Panel = undefined;
            }
        });
    }
}


function panel_cleanup(ct) {
    if (this.filelist) {
        document.getElementById(this.filelist).innerHTML = "";
    }
}

function getRelPath(path, nodecode, adder) {
    if (!adder) {
        adder = 0;
    }
    return path.substring(homedir.length + adder);
}

function init_simple_panels() {
    resultspanel = new YAHOO.widget.Dialog("resultspanel", {
        width: "700px",
        fixedcenter: true,
        close: true,
        draggable: true,
        modal: true,
        buttons: closeButtons,
        visible: false
    });
    resultspanel.beforeHideEvent.subscribe(function() {
        this.setBody("");
    }, resultspanel, true);

    waitpanel = new YAHOO.widget.Panel("waitpanel", {
        fixedcenter: true,
        close: false,
        draggable: false,
        modal: true,
        visible: false
    });
}

function show_results(action, body) {
    resultspanel.setHeader("<div class=\"lt\"></div><span>" + action + "</span><div class=\"rt\"></div>");
    resultspanel.setBody("<div style=\"height: 350px; overflow:auto;\"><pre>" + body.html_encode() + "</pre></div>");
    resultspanel.render(document.body);
    resultspanel.show();
}

function show_loading(action, body) {
    waitpanel.setHeader("<div class=\"lt\"></div><span>" + action + "</span><div class=\"rt\"></div>");
    var loadingimg = "<img src=\"img/yui/rel_interstitial_loading.gif\" />";
    if (body) {
        waitpanel.setBody(body + "<br />" + loadingimg);
    } else {
        waitpanel.setBody(loadingimg);
    }
    waitpanel.render(document.body);
    waitpanel.show();
}

function showPrefs() {
    show_panel("prefs");
}

// shows modal panel with attributes taken from the panels object

function show_panel(panelid, nomodal, force_select) {

    // create the YUI panel if it does not already exist
    init_panels(panelid);

    safecwd = cwd.substring(homedir.length);
    if (force_select !== undefined) {
        var selectedFiles = [force_select];
        window.force_select = force_select;
    } else {
        var selectedFiles = filesDataTable.getSelectedTrEls();
        if (typeof window.force_select !== undefined) {
            window.force_select = undefined;
        }
    }
    if (panels[panelid].file && selectedFiles[0]) {

        // get the full filename
        var decoded_file = getFilePathFromRow(selectedFiles[0]);

        // cut off the directory path; we only want the filename
        decoded_file = decoded_file.split("/").pop();
        document.getElementById(panels[panelid].file).value = decoded_file;

        if (panels[panelid].newfile) {
            document.getElementById(panels[panelid].newfile).value = decoded_file;
        }
    }

    if (panels[panelid].targetfilepath) {
        document.getElementById(panels[panelid].targetfilepath).value = safecwd;
    }

    if (panels[panelid].singlefilelist && selectedFiles[0]) {

        document.getElementById(panels[panelid].singlefilelist).innerHTML = getRelPath(getFilePathFromRow(selectedFiles[0])).html_encode();
        document.getElementById(panels[panelid].singlefilelist).className = "dispfile dispfileContainer";
        var hasfileblk = document.getElementById(panels[panelid].hasfile);
        if (hasfileblk) {
            hasfileblk.style.display = "block";
        }
        panels[panelid].panel.cfg.queueProperty("buttons", panels[panelid].buttons);
    } else {
        if (panels[panelid].singlefilelist) {
            panels[panelid].panel.cfg.queueProperty("buttons", closeButtons);
        }
    }

    if (panels[panelid].filelist && selectedFiles[0]) {
        var fileList = [];
        var iHTML;
        var fileListContainerEl = document.getElementById(panels[panelid].filelist);
        fileListContainerEl.className = "dispfileContainer";
        fileListContainerEl.innerHTML = "";
        var fnHeight;
        var fileCount = 0;
        var selected_files_count = selectedFiles.length;
        for (var f = 0; f < selected_files_count; f++) {
            var file = selectedFiles[f];
            var thisFile = getRelPath(getFilePathFromRow(file)).html_encode();
            var newDiv = document.createElement("div");
            newDiv.innerHTML = thisFile;
            newDiv.className = "dispfile";
            fileListContainerEl.appendChild(newDiv);
            fileCount++;
            if (!fnHeight) {
                fnHeight = newDiv.offsetHeight;
            }
        }
        if (!fnHeight) {
            fnHeight = 14;
        }
        var filesHeight = ((fnHeight * fileCount) + 2);
        if (filesHeight < 200) {
            fileListContainerEl.style.height = filesHeight + "px";
            fileListContainerEl.style.overflow = "hidden";
        } else {
            fileListContainerEl.style.height = 200 + "px";
            fileListContainerEl.style.overflow = "auto";
        }
        var hasfilelist = document.getElementById(panels[panelid].hasfilelist);
        if (hasfilelist) {
            hasfilelist.style.display = "block";
        }
        panels[panelid].panel.cfg.queueProperty("buttons", panels[panelid].buttons);
    } else {
        if (panels[panelid].filelist) {
            panels[panelid].panel.cfg.queueProperty("buttons", closeButtons);
        }
    }

    if (panels[panelid].displaylist) {
        var type = filesDataTable.getRecord(selectedFiles[0]).getData("mimetype");
        if ((type.match("-directory") || type == "mail" || type == "publichtml" || type == "publicftp") || selectedFiles[1]) {
            document.getElementById(panels[panelid].displaylist.multiple).style.display = "block";
            document.getElementById(panels[panelid].displaylist.single).style.display = "none";
        } else {
            document.getElementById(panels[panelid].displaylist.multiple).style.display = "none";
            document.getElementById(panels[panelid].displaylist.single).style.display = "block";
        }
    }

    if (panels[panelid].onload) {
        panels[panelid].onload(selectedFiles);
    }

    if (nomodal) {
        panels[panelid].panel.cfg.queueProperty("modal", false);
    }

    panels[panelid].panel.render();
    panels[panelid].panel.show();
}

function getfilesAreaScrollableEl() {
    var thisEl = filesDataTable.getBdContainerEl();
    if (!thisEl.id) {
        thisEl.id = "filesarea_scrollable";
    }
    return thisEl;
}

function handleSelectBoxMouseDown(e) {
    var thisX = YAHOO.util.Event.getPageX(e);
    var thisY = YAHOO.util.Event.getPageY(e);
    var filewin = getfilesAreaScrollableEl();

    if (quirksmode == "MSIE") {
        document.onselectstart = new Function("return false;");
    }
    var indexEl = document.getElementById("index");
    if (quirksmode == "Safari" || quirksmode == "Safari5") {
        indexEl.style.KhtmlUserSelect = "none";
    }
    if (quirksmode == "Mozilla") {
        indexEl.style.MozUserSelect = "none";
        filewin.style.MozUserSelect = "none";
    }

    selectWindowRegion = YAHOO.util.Region.getRegion(filewin);

    selectMode = 1;

    selectEl = document.getElementById("select");
    selectorEl = filewin;
    selector = filewin.id;
    selectStartScrollLeft = filewin.scrollLeft;
    selectStartScrollTop = filewin.scrollTop;
    selectStartX = thisX;
    selectStartY = thisY;
    EVENT.addListener(document, "mousemove", handleSelectBoxMove, this, true);
    EVENT.addListener(document, "mouseup", handleSelectBoxUp, this, true);
    EVENT.addListener(filewin, "scroll", handleSelectBoxMove, this, true);

    return false;
}

function rebuildLocCache() {
    locCache = {};
    var Files = filesDataTable.getRows();
    for (var i = 0; i < Files.length; i++) {
        locCache[Files[i].id] = YAHOO.util.Region.getRegion(Files[i]);
    }
}

function handleSelectBoxUp(e) {
    if (!selectMode) {
        return;
    }

    if (selectMode == 2) {
        handleSelections();
    }
    selectMode = 0;

    var sWindow = selectorEl;
    var filewin = getfilesAreaScrollableEl();
    EVENT.removeListener(document, "mouseup", handleSelectBoxUp);
    EVENT.removeListener(document, "mousemove", handleSelectBoxMove);
    EVENT.removeListener(filewin, "scroll", handleSelectBoxMove);

    // msie = filewin.unselectable = false;
    var indexEl = document.getElementById("index");
    var filewin = getfilesAreaScrollableEl();
    if (quirksmode == "MSIE") {
        document.onselectstart = new Function("return true;");
    }
    if (quirksmode == "Safari" || quirksmode == "Safari5") {
        indexEl.style.KhtmlUserSelect = "";
    }
    if (quirksmode == "Mozilla") {
        indexEl.style.MozUserSelect = "";
        filewin.style.MozUserSelect = "";
    }

    // console.profileEnd();

    var selectEl = document.getElementById("select");
    selectEl.style.display = "none";
    selectEl = null;
}


function handleSelectBoxMove(e) {
    if (!selectMode) {
        return false;
    }
    if (!selectEl) {
        return;
    }

    var thisX = YAHOO.util.Event.getPageX(e);
    var thisY = YAHOO.util.Event.getPageY(e);

    if (selectMode == 1 && (Math.abs(thisY - selectStartY) > 2 || Math.abs(thisX - selectStartX) > 2)) {
        selectMode = 2;

        // console.profile("box");
        selectEl.style.left = thisX + "px";
        selectEl.style.top = thisY + "px";
        selectEl.style.width = 0 + "px";
        selectEl.style.height = 0 + "px";
        selectEl.style.display = "block";

        myContextMenu.hide();

        if (!AltKeyPressed) {
            unselectAllFiles();
        }
        rebuildLocCache();
        viewportHeight = YAHOO.util.Dom.getViewportHeight();
        for (var i in selectOvers) {
            delete selectOvers[i];
        }

    }

    if (selectMode != 2) {
        return;
    }

    YAHOO.util.Event.preventDefault(e);

    if (thisX == 0) {
        thisX = lastX;
    } else {
        lastX = thisX;
    }
    if (thisY == 0) {
        thisY = lastY;
    } else {
        lastY = thisY;
    }

    var sWindow = selectorEl;

    var ScrolledX = (sWindow.scrollLeft - selectStartScrollLeft); // X scrolled relative to the selectStartX
    var ScrolledY = (sWindow.scrollTop - selectStartScrollTop); // Y scrolled relative to the selectStartY
    var windowLeft = selectWindowRegion.left;
    var windowTop = selectWindowRegion.top;
    var windowRight = selectWindowRegion.right;
    var windowBottom = selectWindowRegion.bottom;
    var windowWidth = (windowRight - windowLeft);
    var windowHeight = (windowBottom - windowTop);


    /*
  We need to make two boxes
  The one the actual user sees, and the one that will be used to compare for
  file locations to see which files to select.  It is tricky because the window scrolls
  while this happens.  Also if the window is scrolled at all then all of our file locations are wrong
  and that has to be compensated for.
*/
    var FileBoxT, FileBoxB, FileBoxL, FileBoxR;

    /* The First Box is the FileBox
   It starts from where the mouse was first clicked, to where the mouse is now


  Its possible for the window to scroll while we are selecting, we want to increase the top of the
  to where it really started.  If we scrolled 400px, then all of our matches will be
  another 400px off.  But the trick is we want to include everything between where the mouse started +  the
  scroll amount.

  So if we scrolled 400px, we only need to increase the Top of the box.
*/

    if (thisY + ScrolledY > selectStartY) {

        /* scrolling down*/
        FileBoxT = selectStartY - ScrolledY;
        FileBoxB = thisY;
    } else {

        /* scrolling up*/
        FileBoxT = thisY;
        FileBoxB = selectStartY - ScrolledY;
    }
    if (thisX + ScrolledX > selectStartX) {

        /* scrolling right*/
        FileBoxL = selectStartX - ScrolledX;
        FileBoxR = thisX;
    } else {

        /* scrolling left*/
        FileBoxL = thisX;
        FileBoxR = selectStartX - ScrolledX;
    }

    /*
    Now it looks like what the user sees.
*/

    var SB = FileBoxB;
    var ST = FileBoxT;
    var SL = FileBoxL;
    var SR = FileBoxR;

    if (SB > windowBottom) {
        SB = windowBottom + 2;
        selectEl.style.borderBottom = "";
    } else {
        selectEl.style.borderBottom = "solid 2px #33c";
    }
    if (ST < windowTop) {
        ST = windowTop - 2;
        selectEl.style.borderTop = "";
    } else {
        selectEl.style.borderTop = "solid 2px #33c";
    }
    if (SL < windowLeft) {
        SL = windowLeft - 2;
        selectEl.style.borderLeft = "";
    } else {
        selectEl.style.borderLeft = "solid 2px #33c";
    }
    if (SR > windowRight) {
        SR = windowRight + 2;
        selectEl.style.borderRight = "";
    } else {
        selectEl.style.borderRight = "solid 2px #33c";
    }
    if (SB < ST) {
        SB = ST + 2;
    }
    if (SR < SL) {
        SR = SL + 2;
    }

    selectEl.style.left = SL + "px";
    selectEl.style.top = ST + "px";
    selectEl.style.width = (SR - SL) + "px";
    selectEl.style.height = (SB - ST) + "px";

    /*
  However we want to compensate for how much the window is currently scrolled.
  For example if the window has scrolled 300px, then all of our matching will
  be 300px off.   We would like to subtract the window scroll from each item, but we must instead
  at it to the file box.
*/
    FileBoxT += ScrolledY;
    FileBoxB += ScrolledY;
    FileBoxL += ScrolledX;
    FileBoxR += ScrolledX;

    /* Last we have to account for if the box is moved.  These a constant values supplied from the functions
  that track the window movement */

    //  FileBoxR += selectStartScrollLeft;
    //  FileBoxL += selectStartScrollLeft;
    //  FileBoxT += selectStartScrollTop;
    //  FileBoxB += selectStartScrollTop;


    var curRegion = new YAHOO.util.Region(FileBoxT, FileBoxR, FileBoxB, FileBoxL);

    /*
document.getElementById("showme").style.left=FileBoxL+"px";
document.getElementById("showme").style.top=FileBoxT+"px";
document.getElementById("showme").style.width=(FileBoxR-FileBoxL)+"px";
document.getElementById("showme").style.height=(FileBoxB-FileBoxT)+"px";
  */
    var oldOvers = {};
    var outEvts = [];
    var enterEvts = [];
    var i;
    var len;

    // Check to see if the object we were selecting is no longer selected
    for (var i in selectOvers) {
        var loc = selectOvers[i];
        if (!loc) {
            continue;
        }

        if (!curRegion.intersect(loc)) {
            outEvts.push(i);
        }
        oldOvers[i] = true;
        delete selectOvers[i];
    }
    for (i in locCache) {
        var loc = locCache[i];
        if (!loc) {
            continue;
        }
        if (curRegion.intersect(loc)) {
            if (!oldOvers[i]) {
                enterEvts.push(i);
            }
            selectOvers[i] = loc;
        }
    }

    len = outEvts.length;
    for (i = 0; i < len; i++) {
        unselectFile(outEvts[i]);
        handleRowUnSelect({
            target: outEvts[i]
        });
    }

    len = enterEvts.length;
    for (i = 0; i < len; i++) {
        selectFile(enterEvts[i], 1);
        handleRowSelect();
    }

    var scrollAmt = 10;

    if (quirksmode == "Safari" || quirksmode == "Safari5") {
        scrollAmt = 38;
        var thisDate = new Date();
        var thisTime = thisDate.getTime();
        if ((lastSelectTime + 100) < thisTime) {
            lastSelectTime = thisTime;
        } else {
            thisDate = null;
            thisTime = null;
            return false;
        }
        thisDate = null;
    }


    setmoveEvent();

    if (windowTop > thisY) {
        scrollDiv(sWindow, 1, scrollAmt);
    } else if (viewportHeight - 10 < thisY) {
        scrollDiv(sWindow, 0, scrollAmt);
    }

    //  if (windowLeft > thisX) { sWindow.scrollLeft > 10 ? sWindow.scrollLeft-=10 : sWindow.scrollLeft = 0; }
    //  if (windowRight < thisX) { (sWindow.scrollLeft < (sWindow.scrollWidth - 10)) ? sWindow.scrollLeft +=10 : sWindow.scrollLeft = sWindow.offsetWidth;  }

    return false;
}


function setmoveEvent(done) {
    done == 2 ? moveEvent = 0 : moveEvent = 1;
}


function scrollDiv(divEl, direction, amt) {

    // 0 = up, 1 = down
    if (amt == null) {
        amt = 12;
    }
    var didScroll = 0;
    var scrollAble = (divEl.scrollHeight - divEl.offsetHeight);
    if (quirksmode == "MSIE") {
        scrollAble = divEl.scrollHeight;
    }
    if (direction == 1) {
        if (divEl.scrollTop > amt) {
            divEl.scrollTop -= amt;
            didScroll = 1;
        } else if (divEl.scrollTop == 0) {
            didScroll = 0;
        } else {
            divEl.scrollTop = 0;
        }
    } else if (direction == 0) {
        if (divEl.scrollTop < (scrollAble - amt)) {
            divEl.scrollTop += amt;
            didScroll = 1;
        } else if (scrollAble == divEl.scrollTop) {
            didScroll = 0;
        } else {
            divEl.scrollTop = scrollAble;
            didScroll = 1;
        }
    }

    return didScroll;
}


function setupKeyL() {
    var UpHandler = function(e) {
        var keyPressed = e.charCode || e.keyCode;
        if (e.metaKey || e.AltKey || keyPressed == 224 || keyPressed == 18) {
            AltKeyPressed = 0;
        }
        if (e.ctrlKey || e.shiftKey || keyPressed == 17 || keyPressed == 16) {
            SVis = 0;
            CtrlKeyPressed = 0;
            document.getElementById("copyi").style.display = "none";
        }
    };
    var DownHandler = function(e) {
        var keyPressed = e.charCode || e.keyCode;
        if (e.metaKey || e.AltKey || keyPressed == 224 || keyPressed == 18) {
            AltKeyPressed = 1;
        }
        if (e.ctrlKey || e.shiftKey || keyPressed == 17 || keyPressed == 16) {
            CtrlKeyPressed = 1;
        }
    };

    EVENT.on(window, "keyup", UpHandler);
    EVENT.on(window, "keydown", DownHandler);
}


function getRegion(el) {
    if ((quirksmode == "Safari" || quirksmode == "Safari5") && el.cells && el.cells[0]) {
        var p = YAHOO.util.Dom.getXY(el.cells[0]);
        var t = p[1];
        var r = p[0];
        for (var i = 0; i < el.cells.length; i++) {
            r += el.cells[i].offsetWidth;
        }
        var b = p[1] + el.cells[0].offsetHeight;
        var l = p[0];

        return new YAHOO.util.Region(t, r, b, l);
    }
    return YAHOO.util.Region.getRegion(el);
}

function dosearch(pathselect, searchinput) {
    init_panels("search-results");
    var pathselectEl = document.getElementById(pathselect);
    var searchinputEl = document.getElementById(searchinput);
    var regex = searchinputEl.value;
    var path = pathselectEl.options[pathselectEl.selectedIndex].value;

    if (path == "$cwd") {
        path = cwd;
    } else {
        path = homedir + "/" + path;
    }

    path = getRelPath(path);
    show_loading("Searching files", "Location: " + homeicon + path.html_encode() + "<br />Search Regex: " + regex.html_encode());

    if (!searchDataSource) {
        searchDataSource = new YAHOO.util.DataSource(CPANEL.security_token + "/json-api/cpanel?cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=search&cpanel_jsonapi_apiversion=2&");
    }
    searchDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
    searchDataSource.responseSchema = {
        resultsList: "cpanelresult.data",
        fields: ["mimeinfo", "file"]
    };
    searchDataTable.dataSource = searchDataSource;

    searchDataTable.clearRows();
    searchDataTable.showTableMessage(YAHOO.widget.DataTable.MSG_LOADING, YAHOO.widget.DataTable.CLASS_LOADING);

    CPANEL.util.set_text_content("search-for", regex);
    searchDataSource.sendRequest("regex=" + safeencode(regex) + "&dir=" + safeencode(path), searchDataTable.onDataReturnSearch, searchDataTable);
}


function nukeSearchResults() {
    if (searchDataTable) {
        searchDataTable.getRecordSet().reset();
        searchDataTable.clearRows();
    }
}

function getMimeTypeFromImage(imgsrc) {
    var iuri = imgsrc.split("/");
    var image = iuri.pop();
    return image.replace(/\.png$/, "");

}

function handleSearchDblClick(e) {
    var row = EVENT.getTarget(e);
    var record = searchDataTable.getRecord(row).getData();
    var path = record.file;

    var type = record.mimeinfo;

    var windowSwitch = function() {
        if (type.match("-directory") || type == "mail" || type == "publichtml" || type == "publicftp") {
            updateFileList(path);
        } else {
            var targetDir = path.split("/").slice(0, -1).join("/") || "/";
            updateFileList(targetDir);
        }
        panels["search-results"].panel.hide();
    };
    window.setTimeout(windowSwitch, 100);
}

function searchFailed(o) {
    waitpanel.hide();
    alert("There was an unknown problem during the search.");
}

function dir_uri_action(uri) {
    var selectedFiles = filesDataTable.getSelectedTrEls();
    document.getElementById("actionform").action = uri;
    document.getElementById("actionform_file").value = "";
    document.getElementById("actionform_dir").value = getFilePathFromRow(selectedFiles[0]);
    document.getElementById("actionform").submit();
}

/**
 * Determines if the parameter passed in is like an array. This
 * function was renamed from isArray so that it will not be confused
 * with the Array.isArray function.
 *
 * @param  {unknown}  tobj - figure out if this is like an array
 * @return {Boolean}      true if the parameter is like an array
 */
function isLikeAnArray(tobj) {
    if (tobj.length > 0) {
        if (!tobj[0] || (tobj[0] && tobj[0].length == 1)) {
            return false;
        }
        return true;
    }
    return false;
}

function load_docroots() {
    if (loaded_docroots) {
        return;
    }
    var mycallback = function(docroots) {
        for (var i = 0; i < docroots.length; i++) {
            var docroot = docroots[i].docroot;
            var domain = docroots[i].domain;
            web_docroots[domain] = docroot;
        }
        loaded_docroots = 1;
    };
    cpanel_jsonapi2(mycallback, "DomainLookup", "getdocroots");
}

function populate_charset(charEl) {
    charEl.options.length = 0;

    // DOM spec says "null", but IE needs "undefined"
    charEl.add(new Option(LANG.auto_detect, "_DETECT_"), undefined);
    for (var i = 0; i < charmaps.length; i++) {
        charEl.add(new Option(charmaps[i]), undefined);
    }
}

function select_charset(charEl, charset) {
    var lccharset = charset.toLowerCase();

    // UTF-8 is a superset of US-ASCII.
    if (/^us-?ascii$/i.test(lccharset)) {
        lccharset = "utf-8";
    } else if (/^(?:latin|iso-?8859)-?1$/i.test(lccharset)) { // windows-1252 is a superset of ISO-8859-1/Latin-1.
        lccharset = "windows-1252";
    }

    for (var i = 0; i < charEl.options.length; i++) {
        if (charEl.options[i].value == lccharset) {
            charEl.selectedIndex = i;
            break;
        }
    }
}

// toggle TEXT_FIELD_FOCUS

function toggleTextFieldFocus(e, state) {
    if (state == 0) {
        TEXT_FIELD_FOCUS = 0;
    }
    if (state == 1) {
        TEXT_FIELD_FOCUS = 1;
    }
}

// function to initialize upon DOM ready

function initialize() {

    upgradeFm();
    setupKeyL();
    init_simple_panels();

    // event handler for "delete" key
    EVENT.on(document, "keyup", checkKeys);

    // event handlers to determine the state of TEXT_FIELD_FOCUS
    EVENT.addFocusListener(["location", "searchbox"], toggleTextFieldFocus, 1);
    EVENT.addBlurListener(["location", "searchbox"], toggleTextFieldFocus, 0);
}
EVENT.onDOMReady(initialize);
