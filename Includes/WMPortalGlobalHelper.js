var WMPortalGlobalHelper = Class.create()
WMPortalGlobalHelper.prototype = {
  initialize: function () {},

  getUserPreference: function (preference) {
    return gs.getUser().getPreference(preference)
  },

  saveUserPreference: function (preference, value) {
    gs.getUser().setPreference(preference, value)
  },

  checkImpersonate: function () {
    return GlideImpersonate().isImpersonating()
      ? { impersonating: true, defaultUser: gs.getImpersonatingUserName() }
      : { impersonating: false, defaultUser: gs.getUserName() }
  },

  sendEvent: function (event, gr, param1, param2) {
    gs.eventQueue(event, gr, param1, param2)
  },

  createNewReservation: function (record) {
    var grRes = new GlideRecord('x_791846_levis_wm_reservations')
    grRes.initialize()
    Object.keys(record).forEach(function (key) {
      if (key === 'reservation_start' || key === 'reservation_end') {
        if (record.whole_day && key === 'reservation_start') {
          record[key] = record[key] + ' 00:00:00'
        } else if (record.whole_day && key === 'reservation_end') {
          record[key] = record[key] + ' 23:59:59'
        } else {
          grRes.setDisplayValue(key, record[key])
        }
      } else if (key !== 'whole_day') {
        grRes.setValue(key, record[key])
      }
    })
    grRes.setValue('reserved_by' + gs.getUserID())
    grRes.insert()
    return grRes.getUniqueValue()
  },

  type: 'WMPortalGlobalHelper'
}
