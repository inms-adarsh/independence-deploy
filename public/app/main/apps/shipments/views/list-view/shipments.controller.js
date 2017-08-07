(function ()
{
    'use strict';

    angular
        .module('app.shipments')
        .controller('ShipmentsController', ShipmentsController);

    /** @ngInject */
    function ShipmentsController($state, $scope, $mdDialog, $document, shipmentService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.shipmentGridOptions = shipmentService.gridOptions('vm.shipments');
        }

    }
})();