;(function () {
  var globalHelper = new global.WMPortalGlobalHelper()

  if (input) {
    switch (input.action) {
      case 'getLocationRooms':
        data.rooms = getLocationRooms(
          input.location_id,
          input.date,
          input.floor,
          input.name,
          input.capacity,
          input.type
        )
        data.floors = getLocationFloors(input.location_id)
        break
      case 'createNewReservation':
        data.newReservation = createNewReservation(input.record)
        break
      case 'getRoomReservations':
        data.roomReservations = getRoomReservations(input.room, input.date)
        break
      case 'changeView':
        data.view = input.view
        globalHelper.saveUserPreference('wm_preferred_view', data.view)
        break
      default:
        break
    }
  } else {
    var gd = new GlideDate()
    var filters = getFiltersFromUrl()

    if (!filters.location_id) {
      filters.location_id = globalHelper.getUserPreference('wm_portal_location')
    }

    if (filters.date) {
      gd.setDisplayValue(filters.date)
    }

    data.view = globalHelper.getUserPreference('wm_preferred_view') || 'list'

    if (filters.location_id) {
      data.location_id = filters.location_id
      data.rooms = getLocationRooms(
        filters.location_id,
        gd.getDisplayValue(),
        filters.floor,
        filters.name,
        filters.capacity,
        filters.type,
        filters.sys_id
      )
      data.floors = getLocationFloors(filters.location_id)
    }
  }

  function getLocationFloors (location_id) {
    var floors = []
    var gr = new GlideRecord('fm_level')
    gr.addQuery('location', location_id)
    gr.query()

    while (gr.next()) {
      console.log({ gr: gr.getUniqueValue() })
      var attId = getFloorPlanAttachment(gr.getUniqueValue())
      if (attId) {
        console.log({ attId: attId })
        var url = '/sys_attachment.do?sys_id=' + attId + '&view=true'

        floors.push({
          name: gr.getValue('name'),
          content: url
        })
      }
    }

    return floors
  }

  function getFloorPlanAttachment (floor_id) {
    var grSys = new GlideRecord('sys_attachment')
    grSys.addEncodedQuery('table_name=fm_level^table_sys_id=' + floor_id)
    grSys.query()

    if (grSys.next()) {
      return grSys.getUniqueValue()
    }

    return ''
  }

  function getFiltersFromUrl () {
    var filters = {}

    filters.location_id = $sp.getParameter('location_id')
    filters.date = $sp.getParameter('date')
    filters.floor = $sp.getParameter('floor')
    filters.name = $sp.getParameter('name')
    filters.capacity = $sp.getParameter('capacity')
    filters.type = $sp.getParameter('type')
    filters.sys_id = $sp.getParameter('sys_id')

    return filters
  }

  function createNewReservation (record) {
    var grRes = new GlideRecord('x_lest_wm_reservations')
    grRes.initialize()
    console.log({ record: record })
    Object.keys(record).forEach(function (key) {
      if (key === 'reservation_start' || key === 'reservation_end') {
        var gdt = new GlideDateTime()
        gdt.setDisplayValue(record[key])

        grRes.setValue(key, gdt.getValue())
      } else {
        grRes.setValue(key, record[key])
      }
    })
    grRes.setValue('reserved_by', gs.getUserID())
    grRes.insert()
    return grRes.getUniqueValue()
  }

  function getLocationRooms (
    location,
    date,
    floor,
    name,
    capacity,
    type,
    sys_id
  ) {
    var rooms = []
    var query = ''

    if (sys_id) {
      query += 'sys_id=' + sys_id
    } else {
      if (location) {
        query += 'location=' + location
      }

      if (floor) {
        query += '^floorLIKE' + floor
      }
      if (capacity) {
        query += '^capacity<=' + capacity
      }
      if (name) {
        query += '^nameLIKE' + name
      }
      if (type && type !== 'all') {
        query += '^typeLIKE' + type
      }
    }

    var grRooms = new GlideRecord('x_lest_wm_rooms')
    grRooms.orderBy('name')
    grRooms.addEncodedQuery(query)
    grRooms.query()

    while (grRooms.next()) {
      var roomReservations = getRoomReservations(
        grRooms.getUniqueValue(),
        date,
        true
      )

      var allowed = checkAllowedTimesOfDate(roomReservations, date)

      rooms.push({
        name: grRooms.getValue('name'),
        floor: grRooms.getValue('floor'),
        type: grRooms.getValue('type'),
        type_display: grRooms.getDisplayValue('type'),
        location: grRooms.getDisplayValue('location'),
        capacity: grRooms.getValue('capacity'),
        sys_id: grRooms.getUniqueValue(),
        reservations: roomReservations,
        allowedTimes: allowed
      })
    }
    return rooms
  }

  function getRoomReservations (room, date, only_reservations) {
    var reservations = []

    var grRes = new GlideRecord('x_lest_wm_reservations')
    grRes.orderBy('reservation_start')
    grRes.addQuery('room', room)
    grRes.addEncodedQuery(
      'sys_updated_onONLast 3 months@javascript:gs.beginningOfLast3Months()@javascript:gs.endOfLast3Months()'
    )
    grRes.query()

    while (grRes.next()) {
      var reservationStart = new GlideDate()
      var reservationEnd = new GlideDate()
      var requestedDate = new GlideDate()
      reservationStart.setValue(
        grRes.getDisplayValue('reservation_start').split(' ')[0]
      )
      reservationEnd.setValue(
        grRes.getDisplayValue('reservation_end').split(' ')[0]
      )
      requestedDate.setValue(date)

      if (
        requestedDate.getNumericValue() >= reservationStart.getNumericValue() &&
        requestedDate.getNumericValue() <= reservationEnd.getNumericValue()
      ) {
        var reservation = {
          reservation_start: grRes.getDisplayValue('reservation_start'),
          reservation_end: grRes.getDisplayValue('reservation_end'),
          sys_id: grRes.getUniqueValue(),
          all_day: grRes.getValue('all_day')
        }

        if (!only_reservations) {
          reservation.room = {
            name: grRes.room.getValue('name'),
            floor: grRes.room.getValue('floor'),
            location: grRes.room.getDisplayValue('location'),
            capacity: grRes.room.getValue('capacity'),
            sys_id: grRes.room.getUniqueValue()
          }
        }

        reservations.push(reservation)
      }
    }
    return reservations
  }

  function checkAllowedTimesOfDate (reservations, date) {
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
  }

  console.log({ input: input, data: data })
})()
