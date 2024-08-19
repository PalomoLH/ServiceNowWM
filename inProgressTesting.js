//This file is just a test, we will transport this to Widget Server

var helper = new x_lest_wm.WorkplaceManagementHelper()

function parseAvailableTimes (jsonString) {
  return JSON.parse(jsonString || '{}')
}

function updateAvailableTimes (availableTimes, reservedTimes) {
  reservedTimes.forEach(function (reserved) {
    var available = availableTimes[reserved.date] || []

    // Filter out times that overlap with reserved times
    available = available.filter(function (timeSlot) {
      return !(timeSlot.start < reserved.end && timeSlot.end > reserved.start)
    })

    availableTimes[reserved.date] = available
  })

  return availableTimes
}

function getWeekReservedTimes (date) {
  var dayView = []
  var gd = new GlideDate()
  gd.setDisplayValue(date)

  var current_date = _getBeginningOfWeek(gd.getDisplayValue())
  var ends_on = _getEndOfWeek(gd.getDisplayValue())

  do {
    var reservations = []
    var availableTimes = {}

    var grRes = new GlideRecord('x_lest_wm_reservations')
    grRes.addEncodedQuery(
      "reservation_start<=javascript:gs.dateGenerate('" +
        current_date +
        "','23:59:59')^reservation_end>=javascript:gs.dateGenerate('" +
        current_date +
        "','00:00:00')"
    )
    grRes.query()

    while (grRes.next()) {
      reservations.push({
        reservation_start: grRes.getDisplayValue('reservation_start'),
        reservation_end: grRes.getDisplayValue('reservation_end'),
        sys_id: grRes.getUniqueValue()
      })

      // Parse available times JSON
      if (grRes.available_times) {
        availableTimes = parseAvailableTimes(grRes.getValue('available_times'))
      }
    }

    var reservedTimes = checkReservedTimesOfDate(
      reservations,
      current_date.getDisplayValue().split(' ')[0]
    )

    // Update available times based on reservations
    availableTimes = updateAvailableTimes(availableTimes, reservedTimes)

    dayView.push({
      date: current_date.getDisplayValue().split(' ')[0],
      availableTimes:
        availableTimes[current_date.getDisplayValue().split(' ')[0]] || [],
      reservedTimes: reservedTimes
    })

    current_date.addDaysUTC(1)
  } while (current_date <= ends_on)

  return dayView
}

function checkReservedTimesOfDate (reservations, date) {
  var reservedTimes = []

  reservations.forEach(function (reservation) {
    var reservationStart = new GlideDateTime(reservation.reservation_start)
    var reservationEnd = new GlideDateTime(reservation.reservation_end)

    reservedTimes.push({
      date: date,
      start: reservationStart.getValue().split(' ')[1],
      end: reservationEnd.getValue().split(' ')[1]
    })
  })

  return reservedTimes
}

function _getBeginningOfWeek (date) {
  var gdt = new GlideDateTime(date + ' 00:00:00')
  gdt.addDaysUTC(-1 * gdt.getDayOfWeekUTC() + 1)
  return gdt
}

function _getEndOfWeek (date) {
  var gdt = new GlideDateTime(date)
  gdt.addDaysUTC(7 - gdt.getDayOfWeekUTC())
  var gTime = new GlideTime()
  gTime.setValue('23:59:59')
  gdt.add(gTime)
  return gdt
}

var gdt = new GlideDate()
gdt.setDisplayValue('2024-08-14')
getWeekReservedTimes(gdt.getDisplayValue())

//The last line is always printed on our program
