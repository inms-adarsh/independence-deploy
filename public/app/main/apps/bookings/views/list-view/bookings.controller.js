(function ()
{
    'use strict';

    angular
        .module('app.bookings')
        .controller('BookingsController', BookingsController);

    /** @ngInject */
    function BookingsController($state, $scope, $mdDialog, $document, bookingService, customers, beers)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.bookingGridOptions = bookingService.gridOptions('vm.bookings', customers, beers);
        }

    }
})();