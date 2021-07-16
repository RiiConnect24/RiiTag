class PageManager {
    constructor(defaultPage = null) {
        this.pages = [];
        this.defaultPage = defaultPage;
        this.currentPage = null;
        document.body.onload = this.showDefaultPage();
    }

    getPage(id) {
        var ret = null;
        this.pages.forEach((page) => {
            if (ret) { return; }
            if (page.id == id) {
                ret = page;
            }
        });
        return ret;
    }

    showDefaultPage() {
        if (!this.defaultPage) {
            return;
        }

        this.pages.forEach((page) => {
            page.hide();
        });

        this.defaultPage.show();
    }

    register(id) {
        var page = new Page(this, id);
        this.pages.push(page);
        return page;
    }

    registerDefault(id) {
        this.defaultPage = this.register(id);
    }
}

class Page {
    constructor(manager, id) {
        this.id = id;
        this.buttonId = id + "-btn";
        this.manager = manager;

        this.div = document.getElementById(id);
        if (this.div == null) {
            console.error(`#${this.id} is null`);
            return;
        }

        this.hide();

        this.button = document.getElementById(this.buttonId);
        if (this.button == null) {
            console.error(`#${this.id}'s button is null`);
            return;
        }

        this.button.onclick = this.onButtonClick;
    }

    show() {
        this.div.style = "";
    }

    hide() {
        this.div.style = "display: none;";
    }

    onButtonClick() {
        this.manager.currentPage.hide();
        this.manager.currentPage = this;
        this.show();
        this.button.blur();
    }
}