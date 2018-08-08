/* globals PAGE: false, QRCode: false */
(function(window, PAGE, QRCode) {

    // elements we will use
    var qrCodeContainer = document.getElementById("qr_code_container");

    var qrCode;

    // create the QR Code
    if (qrCodeContainer && PAGE.setup_data.otpauth_str !== void 0) {
        qrCode = new QRCode(qrCodeContainer, {
            text: PAGE.setup_data.otpauth_str,
            width: 250,
            height: 250
        });
    }

})(window, PAGE, QRCode);
