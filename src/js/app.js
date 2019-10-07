import {
  Product
} from './components/Product.js';
import {
  Cart
} from './components/Cart.js';
import {
  select,
  settings,
  classNames
} from './settings.js';

const app = {
  initPages: function () {
    const thisApp = this;

    thisApp.pages = Array.from(document.querySelector(select.containerOf.pages).children);
    thisApp.navLinks = Array.from(document.querySelectorAll(select.nav.links));
    // thisApp.activatePage(thisApp.pages[0].id); -> usuniete bo chce zeby po F5 strona zostala na tym samym URLu

    let pagesMatchingHash = [];
    // *** NIE DZIALA *** : po kliknięciu F5 strona wraca na order -> nie wiem dlaczego, nie potrafię odnalezc błedu
    if (window.location.hash.length > 2) {
      const idFromHash = window.location.hash.replace('#/', '');
      pagesMatchingHash = thisApp.pages.filter(function (page) {
        return page.id == idFromHash;
      });
      thisApp.activatePage(pagesMatchingHash.length ? pagesMatchingHash[0].id : thisApp.pages[0].id);
    }


    for (let link of thisApp.navLinks) {
      link.addEventListener('click', function (e) {
        const clickedElement = this;
        e.preventDefault();

        // get id page from href 
        const id = clickedElement.getAttribute('href').replace('#', '');
        // activate page
        thisApp.activatePage(id);
      });
    }
  },

  activatePage: function (pageId) {
    window.location.hash = '#' + pageId;
    const thisApp = this;
    for (let link of thisApp.navLinks) {
      link.classList.toggle(classNames.nav.active, link.getAttribute('href') === '#' + pageId);
    }

    for (let page of thisApp.pages) {
      page.classList.toggle(classNames.pages.active, page.id === pageId);
    }
  },

  initMenu: function () {
    const thisApp = this;
    for (let productData in thisApp.data.products) {
      new Product(thisApp.data.products[productData].id, thisApp.data.products[productData]);
    }

  },

  initData: function () {
    const thisApp = this;

    thisApp.data = {};
    const url = settings.db.url + '/' + settings.db.product;

    fetch(url)
      .then(function (rawResponse) {
        return rawResponse.json();
      })
      .then(function (parsedResponse) {

        /* save parsedResponse as thisApp.data.products */
        thisApp.data.products = parsedResponse;

        /* execute initMenu method */
        thisApp.initMenu();
      });
  },


  initCart: function () {
    const thisApp = this;

    const cartElem = document.querySelector(select.containerOf.cart);
    thisApp.cart = new Cart(cartElem);

    thisApp.productList = document.querySelector(select.containerOf.menu);

    thisApp.productList.addEventListener('add-to-cart', function (e) {
      app.cart.add(e.detail.product);
    });
  },
  init: function () {
    const thisApp = this;

    thisApp.initPages();
    thisApp.initData();
    thisApp.initCart();
  },
};

app.init();
