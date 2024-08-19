var WorkplaceManagementHelper = Class.create()
WorkplaceManagementHelper.prototype = {
  initialize: function () {},

  createWeekAvaiableTimes: function (starts_on) {
    var gdt = new GlideDateTime()
    gdt.setDisplayValue(starts_on)
  },

  getWeekReservedTimes: function (date) {
    var dayView = []
    var gd = new GlideDate()
    gd.setDisplayValue(date)

    var current_date = this._getBeginningOfWeek(gd.getDisplayValue())
    var ends_on = this._getEndOfWeek(gd.getDisplayValue())

    do {
      var reservations = []
      var grRes = new GlideRecord('x_lest_wm_reservations')
      grRes.addEncodedQuery(
        "type=reservation^reservation_start<=javascript:gs.dateGenerate('" +
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
          sys_id: grRes.getUniqueValue(),
          all_day: grRes.getValue('all_day')
        })
      }

      var allowedTimes = this.checkAllowedTimesOfDate(
        reservations,
        current_date.getDisplayValue().split(' ')[0]
      )
      var reservedTimes = this.checkReservedTimesOfDate(
        reservations,
        current_date.getDisplayValue().split(' ')[0]
      )

      dayView.push({
        date: current_date.getDisplayValue().split(' ')[0],
        allowedTimes: allowedTimes,
        reservedTimes: reservedTimes
      })

      current_date.addDaysUTC(1)
    } while (current_date <= ends_on)

    return dayView
  },

  checkReservedTimesOfDate: function (reservations, date) {
    var reservedTimes = []

    if (reservations && reservations.length) {
      reservations.forEach(function (reservation) {
        var reservationStart = new GlideDateTime(reservation.reservation_start)
        var reservationEnd = new GlideDateTime(reservation.reservation_end)

        reservedTimes.push({
          start: reservationStart.getValue().split(' ')[1],
          end: reservationEnd.getValue().split(' ')[1]
        })
      })
    }

    return reservedTimes
  },

  checkAllowedTimesOfDate: function (reservations, date) {
    var allowedTimes = []
    var dayStart = new GlideDateTime(date + ' 00:00:00')
    var dayEnd = new GlideDateTime(date + ' 23:59:59')

    if (reservations && reservations.length) {
      // Sort reservations by start time
      reservations.sort(function (a, b) {
        return (
          new GlideDateTime(a.reservation_start) -
          new GlideDateTime(b.reservation_start)
        )
      })

      // Initialize the first allowed time slot
      var startAllowed = new GlideDateTime(dayStart)

      reservations.forEach(function (reservation) {
        var reservationStart = new GlideDateTime(reservation.reservation_start)
        var reservationEnd = new GlideDateTime(reservation.reservation_end)
        reservationStart.subtract(1000)

        // If there is a gap before this reservation, add it to allowedTimes
        if (startAllowed.before(reservationStart)) {
          allowedTimes.push({
            start: startAllowed.getValue().split(' ')[1],
            end: reservationStart.getValue().split(' ')[1]
          })
        }

        // Update the start of the next allowed time slot
        startAllowed = reservationEnd
      })

      startAllowed.add(1000)

      // Add the remaining time after the last reservation
      if (startAllowed.before(dayEnd)) {
        allowedTimes.push({
          start: startAllowed.getValue().split(' ')[1],
          end: dayEnd.getValue().split(' ')[1]
        })
      }
    } else {
      allowedTimes.push({
        start: dayStart.getValue().split(' ')[1],
        end: dayEnd.getValue().split(' ')[1]
      })
    }

    return allowedTimes
  },

  _getBeginningOfWeek: function (date) {
    var gdt = new GlideDateTime(date + ' 00:00:00')

    gdt.addDaysUTC(-1 * gdt.getDayOfWeekUTC() + 1)

    return gdt
  },

  _getEndOfWeek: function (date) {
    var gdt = new GlideDateTime(date)

    gdt.addDaysUTC(7 - gdt.getDayOfWeekUTC())
    var gTime = new GlideTime()
    gTime.setValue('23:59:59')

    gdt.add(gTime)

    return gdt
  },

  type: 'WorkplaceManagementHelper'
}
