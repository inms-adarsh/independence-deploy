(function ()
{
    'use strict';

    angular
        .module('app.admin.drivers')
        .controller('DriversController', DriversController);

    /** @ngInject */
    function DriversController($state, $scope, $mdDialog, $document, driverService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.driverGridOptions = driverService.gridOptions('vm.drivers');
        }

    }
})();