api.controller = function (
  $rootScope,
  $scope,
  $location,
  $uibModal,
  i18n,
  spUtil
) {
  var c = this
  $scope.showFilters = false
  $scope.selectedFloorIndex = 0

  $scope.toggleFilter = function () {
    $scope.showFilters = !$scope.showFilters
  }

  // Initialize filter variables
  $scope.defaultFilters = {
    date: new Date(),
    floor: null,
    capacity: null,
    name: null,
    unavailable: null,
    type: 'all'
  }

  $scope.formatDate = function (date) {
    var options = { month: 'long', day: 'numeric' }
    return new Date(date).toLocaleDateString('en-US', options)
  }

  $scope.formatServerDate = function (date) {
    var d = new Date(date)
    var year = d.getFullYear()
    var month = ('0' + (d.getMonth() + 1)).slice(-2) // Months are 0-based
    var day = ('0' + d.getDate()).slice(-2)
    return year + '-' + month + '-' + day
  }

  // Function to filter rooms
  $scope.filterRooms = function () {
    $scope.data.action = 'getLocationRooms'
    $scope.data.date = $scope.formatServerDate($scope.filters.date)
    $scope.data.floor = $scope.filters.floor
    $scope.data.capacity = $scope.filters.capacity
    $scope.data.name = $scope.filters.name
    $scope.data.type = $scope.filters.type
    $scope.data.unavailable = $scope.filters.unavailable

    if ($scope.showFilters) {
      $scope.toggleFilter()
    }

    $scope.server.update()
  }

  // Function to clear filters
  $scope.clearFilters = function () {
    $scope.filters = angular.copy($scope.defaultFilters)

    if ($scope.showFilters) {
      $scope.toggleFilter()
    }

    $scope.filterRooms() // Update room list after clearing filters
  }

  $rootScope.$on('wm_header_location_change', function (_evt, location_id) {
    $scope.data.location_id = location_id

    if ($scope.data.location_id) {
      $scope.data.action = 'getLocationRooms'
      $scope.server.update().then(function (res) {})
    } else {
      $scope.data.rooms = []
    }
  })

  // Function to open a modal for creating a new reservation
  $scope.openNewReservationModal = function (room, times) {
    $scope.cancelSee()
    $scope.newReservation.room = room.sys_id
    $scope.newReservation.room_label = room.name
    $scope.newReservation.location_label = room.location
    if (times) {
      var date = $scope.filters.date.toISOString().split('T')[0]
      var start = date + ' ' + times.start
      var end = date + ' ' + times.end
      $scope.newReservation.reservation_start = new Date(start)
      $scope.newReservation.reservation_end = new Date(end)
    }

    $scope.modalInstance = $uibModal.open({
      templateUrl: 'wm_create_room_reservation.html',
      scope: $scope
    })

    $scope.modalInstance.result.then(function (newReservation) {
      // Call server to create new reservation
      $scope.data.action = 'createNewReservation'

      if (newReservation.all_day) {
        // Format the all_day reservation start and end times
        var date = new Date(newReservation.reservation_start)
          .toISOString()
          .split('T')[0]
        newReservation.reservation_start = date + ' 00:00:00'
        newReservation.reservation_end = date + ' 23:59:59'
      }

      $scope.data.record = newReservation
      $scope.server.update().then(function (res) {
        $scope.filterRooms() // Refresh room list after creating new reservation
      })
    })
  }

  $scope.newReservation = {
    room_label: null,
    location_label: null,
    room: null,
    reservation_start: null,
    reservation_end: null,
    all_day: null
  }

  $scope.createReservation = function () {
    $scope.modalInstance.close($scope.newReservation)
    $scope.modalInstance = ''
  }

  $scope.checkModalDisabled = function () {
    return (
      !$scope.newReservation.room ||
      !$scope.newReservation.reservation_start ||
      !$scope.newReservation.reservation_end
    )
  }

  $scope.cancel = function () {
    $scope.newReservation = {
      room_label: null,
      location_label: null,
      room: null,
      reservation_start: null,
      reservation_end: null,
      all_day: null
    }

    $scope.modalInstance.dismiss('cancel')
    $scope.modalInstance = ''
  }

  //Reservations modal

  $scope.roomReservations = {
    room_name: '',
    date: '',
    available: false,
    reservations: []
  }

  // Function to open a modal for creating a new reservation
  $scope.openSeeReservationModal = function (room) {
    $scope.room = room
    $scope.roomReservations.room_name = room.name
    $scope.roomReservations.date = $scope.formatDate($scope.filters.date)
    $scope.roomReservations.available = room.location
    $scope.roomReservations.reservations = room.reservations
    $scope.roomReservations.allowedTimes = room.allowedTimes

    $scope.seeModalInstance = $uibModal.open({
      templateUrl: 'wm_see_room_reservations.html',
      scope: $scope
    })
  }

  $scope.cancelSee = function () {
    if ($scope.seeModalInstance) {
      $scope.seeModalInstance.dismiss('cancel')
      $scope.seeModalInstance = ''
    }
  }

  $scope.showBooked = function (room) {
    if ($scope.filters.unavailable) {
      return true
    } else {
      if (room.allowedTimes && room.allowedTimes.length) {
        return true
      }
    }

    return false
  }

  $scope.changeView = function (view) {
    $scope.data.action = 'changeView'
    $scope.data.view = view
    $scope.server.update()
  }

  $scope.compareFilters = function () {
    return (
      JSON.stringify($scope.filters) === JSON.stringify($scope.defaultFilters)
    )
  }

  $scope.getFiltersFromUrl = function () {
    $scope.filters = angular.copy($scope.defaultFilters)
    var loc = $location.search()

    if (loc.date) {
      $scope.filters.date = new Date(loc.date)
    }
    if (loc.floor) {
      $scope.filters.floor = loc.floor
    }
    if (loc.capacity) {
      $scope.filters.capacity = parseInt(loc.capacity)
    }
    if (loc.name) {
      $scope.filters.name = loc.name
    }
    if (loc.unavailable) {
      $scope.filters.unavailable = loc.unavailable
    }
    if (loc.type) {
      $scope.filters.type = loc.type
    }
    if (loc.sys_id) {
      $scope.filters.sys_id = loc.sys_id

      if ($scope.data.rooms && $scope.data.rooms.length === 1) {
        $scope.openNewReservationModal($scope.data.rooms[0])
      } else {
        spUtil.addInfoMessage(
          i18n.getMessage(
            'The room you want to schedule has no available times today, please select another date'
          )
        )
      }
    }
  }

  $scope.getFiltersFromUrl()

  // Floor modal
  $scope.selectFloor = function (index) {
    $scope.selectedFloorIndex = index
  }

  // Function to open a modal for creating a new reservation
  $scope.openFloorModal = function () {
    $scope.floorModalInstance = $uibModal.open({
      templateUrl: 'wm_floor_modal.html',
      scope: $scope,
      size: 'lg'
    })
  }

  $scope.closeFloorModal = function () {
    if ($scope.floorModalInstance) {
      $scope.floorModalInstance.dismiss('cancel')
      $scope.floorModalInstance = ''
    }
  }
}
