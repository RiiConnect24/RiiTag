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