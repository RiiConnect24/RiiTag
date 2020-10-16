function showPassword(inputBoxID, inputButtonID) {
    var x = document.getElementById(inputBoxID);
    var y = document.getElementById(inputButtonID);
    if (x.type == "password") {
        x.type = "text";
        y.value = "Hide Key";
    } else {
        x.type = "password";
        y.value = "Show Key";
    }
}

function getOverlay(overlayFile) {
    var res = null;
    var x = new XMLHttpRequest();
    x.open("GET", overlayFile, false);
    x.send();
    if (x.status == 200) {
        res = x.responseText;
    }
    return res;
}

var sel = document.getElementById('background');
var sel2 = document.getElementById('flag');
var sel3 = document.getElementById('overlay');
var sel4 = document.getElementById('coin');
var sel5 = document.getElementById('miiselection');
var sel6 = document.getElementById('font');

sel.onchange = function () {
    document.getElementById("background-img").src = "/" + this.value;
}

sel2.onchange = function () {
    document.getElementById("flag-img").src = "/flags/" + this.value + ".png";
}

sel3.onchange = function () {
    var cimg;
    document.getElementById("overlay-img").src = "/img/overlays/" + this.value.replace(".json", "") + ".png";
    var overlay = JSON.parse(getOverlay(`/overlays/${this.value}`));
    if (sel4.value == "default") {
        cimg = overlay.coin_icon.img + ".png";
        document.getElementById("coin-img").src = "/img/coin/" + cimg;
    }
}

sel4.onchange = function () {
    var cimg;
    var overlay = JSON.parse(getOverlay(`/overlays/${sel3.value}`));
    if (this.value == "default") {
        cimg = overlay.coin_icon.img + ".png";
    } else {
        cimg = this.value + ".png";
    }
    document.getElementById("coin-img").src = "/img/coin/" + cimg;
}
sel5.onchange = function() {
    if (sel5 != "custom") {
        document.getElementById("mii-img").src = `/miis/guests/${sel5.value}.png`;
    }
}

sel6.onchange = function () {
    document.getElementById("font-img").src = "/img/font/" + this.value + ".png";
}