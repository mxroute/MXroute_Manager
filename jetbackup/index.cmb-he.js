/*
* base/frontend/paper_lantern/jetbackup/index.cmb-he.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

(function() {
    var newLex = {
        "Creation Date":"תאריך",
        "Actions":"פעולות",
		"No Backups Found":"לא נמצאו גיבויים",
		"Sort by [_1].":"מיין לפי [_1].",
		"Size":"גודל",
		"Location":"מיקום",
		"Generate Download":"צור הורדה",
		"Delete Download":"מחק הורדה",
		"Download":"הורד",
		"Restore":"שחזר",
		"Cancel":"ביטול",
		"Loading Backups":"טוען גיבויים",
		"Download in Progress":"הורדה בתהליך",
		"Restore in Progress":"שחזור בתהליך",
		"Are you sure you want to restore from this backup?":"האם אתה בטוח שברצונך לשחזר מגיבוי זה?",
		"Are you sure you want to delete this download?":"האם אתה בטוח שברצונך למחוק הורדה זו?",
		"Are you sure you want to download this backup?":"האם אתה בטוח שברצונך להוריד גיבוי זה?",
		"Restore account from backup “[_1]”": "שחזר חשבון מגיבוי “[_1]”",
		"Download backup “[_1]”":"הורד גיבוי “[_1]”",
		"Delete Download “[_1]”":"מחק הורדה “[_1]”",
		"Note that we are saving only the last “[_1]” downloads in our server. older downloads will be deleted. are you sure you want to download this backup?": "שים לב שהמערכת שומרת רק את “[_1]” ההורדות האחרונות בשרת. הורדות ישנות יותר ימחקו. האם הינך בטוח שברצונך להוריד גיבוי זה?",
		"Displaying [_1] to [_2] out of [_3] records":"מציג [_1] עד [_2] מתוך [_3] רשומות",
		"Type":"סוג"
    };

    if (!this.LEXICON) this.LEXICON = {};

    for(var item in newLex) {
        if(newLex.hasOwnProperty(item)) {
            var value = newLex[item];
            if (typeof(value) === "string" && value !== "") {
                this.LEXICON[item] = value;
            }
        }
    }
})();
