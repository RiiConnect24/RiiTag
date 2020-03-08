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

var sel = document.getElementById('background');
sel.onchange = function () {
    document.getElementById("background-img").src = "/" + this.value;
}

var sel2 = document.getElementById('flag');
sel2.onchange = function () {
    document.getElementById("flag-img").src = "/img/flags/" + this.value + ".png";
}

var sel3 = document.getElementById('overlay');
sel3.onchange = function () {
    document.getElementById("overlay-img").src = "/img/overlays/" + this.value.replace(".json", "") + ".png";
}
