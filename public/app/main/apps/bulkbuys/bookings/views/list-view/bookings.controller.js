(function ()
{
    'use strict';

    angular
        .module('app.bulkbuys.bookings')
        .controller('BulkBuyBookingsController', BookingsController);

    /** @ngInject */
    function BookingsController($state, $scope, $mdDialog, $document, BulkBuysBookingService, customers, beers)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.bookingGridOptions = BulkBuysBookingService.gridOptions('vm.bookings', customers, beers);
        }

    }
})();