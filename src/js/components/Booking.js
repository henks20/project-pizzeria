import { templates, select, settings, classNames } from '../settings.js';
import { utils } from '../utils.js';
import { AmountWidget } from './AmountWidget.js';
import { DatePicker } from './DatePicker.js';
import { HourPicker } from './HourPicker.js';


export class Booking {
  constructor(bookingContainer) {
    const thisBooking = this;

    thisBooking.render(bookingContainer);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.prepareReservation();
    thisBooking.submitForm();
  }

  render(bookingContainer) {
    const thisBooking = this;
    const generatedHTML = templates.bookingWidget();
    thisBooking.dom = {};
    thisBooking.dom.wrapper = bookingContainer;
    bookingContainer.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(select.booking.form);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(select.booking.starters);

  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });
  }

  getData() {
    const thisBooking = this;

    const startEndDates = {};
    startEndDates[settings.db.dateStartParamKey] = utils.dateToStr(thisBooking.datePicker.minDate);
    startEndDates[settings.db.dateEndParamKey] = utils.dateToStr(thisBooking.datePicker.maxDate);

    const endDate = {};
    endDate[settings.db.dateEndParamKey] = startEndDates[settings.db.dateEndParamKey];

    const params = {
      booking: utils.queryParams(startEndDates),
      eventsCurrent: settings.db.notRepeatParam + '&' + utils.queryParams(startEndDates),
      eventsRepeat: settings.db.repeatParam + '&' + utils.queryParams(endDate),
    };

    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking,
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent,
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat,
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function ([bookingsResponse, eventsCurrentResponse, eventsRepeatResponse]) {
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;
    thisBooking.booked = {};

    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat === 'daily') {
        for (let i = minDate; i <= maxDate; i = utils.addDays(i, 1)) {
          thisBooking.makeBooked(utils.dateToStr(i), item.hour, item.duration, item.table);
        }
      }
    }
    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {
      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }
      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;
    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);
    let isAllTablesAvailable = false;

    if (typeof thisBooking.booked[thisBooking.date] == 'undefined' || typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined') {
      isAllTablesAvailable = true;
      for (let table of thisBooking.dom.tables) {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (!isAllTablesAvailable
        && thisBooking.booked[thisBooking.date]
        && thisBooking.booked[thisBooking.date][thisBooking.hour]
        && thisBooking.booked[thisBooking.date][thisBooking.hour].includes(table) > -1) {
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  prepareReservation() {
    const thisBooking = this;
    const allTables = thisBooking.dom.tables;

    for (let table of allTables) {
      table.addEventListener('click', function (e) {
        e.preventDefault();

        if (!table.classList.contains(classNames.booking.tableBooked)) {
          table.classList.toggle(classNames.booking.tableBooked);
          thisBooking.reservedTables = parseInt(table.getAttribute(settings.booking.tableIdAttribute));
        }

        const allReservedTables = document.querySelectorAll(select.booking.tablesReserved);

        for (let reservedTable of allReservedTables) {
          if (reservedTable !== table) {
            reservedTable.classList.remove(classNames.booking.tableReservation);
          }
        }
      });


      thisBooking.dom.hourPicker.addEventListener('updated', function () {
        table.classList.remove(classNames.booking.tableReservation);
      });

      thisBooking.dom.datePicker.addEventListener('change', function () {
        table.classList.remove(classNames.booking.tableReservation);
      });

      thisBooking.starters = [];

      for (let starter of thisBooking.dom.starters) {
        starter.addEventListener('change', function () {
          if (this.checked) {
            thisBooking.starters.push(starter.value);
          } else {
            thisBooking.starters.splice(thisBooking.starters.indexOf(starter.value, 1));
          }
        });
      }
    }
  }

  sendData() {
    const thisBooking = this;
    // EROR failed to construct url 
    // const createURL = new URL(settings.db.url, "/", settings.db.booking);
    const createURL = settings.db.url + '/' + settings.db.booking;

    const payload = {
      date: thisBooking.datePicker.dom.input.value,
      hour: thisBooking.hourPicker.value,
      table: thisBooking.reservedTable,
      ppl: thisBooking.peopleAmount.value,
      duration: thisBooking.dom.hoursAmount.value,
      phone: thisBooking.dom.phone.value,
      adress: thisBooking.dom.address.value,
      starters: thisBooking.starters
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(createURL, options)
      .then(function (res) {
        return res.json();
      })
      .then(function (parsedResponse) {
        console.log('parsedResponse', parsedResponse);
        thisBooking.getData();
      });
  }

  clearTables() {
    const thisBooking = this;
    const allTables = thisBooking.dom.tables;

    for (let table of allTables) {
      table.classList.remove(classNames.booking.tableReservation);
    }
  }

  submitForm() {
    const thisBooking = this;

    thisBooking.dom.form.addEventListener('submit', function (e) {
      e.preventDefault();
      console.log(thisBooking);
      if (thisBooking.reservedTable == ''
        || thisBooking.dom.phone.value == ''
        || thisBooking.dom.address.value == '') {
        return alert('Correct the form!')
      }

      thisBooking.sendData();
      thisBooking.clearTables();
    })
  }
}