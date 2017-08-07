(function ()
{
    'use strict';

    angular
        .module('app.admin.locations')
        .controller('LocationsController', LocationsController);

    /** @ngInject */
    function LocationsController($state, $scope, $mdDialog, $document, locationService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.locationGridOptions = locationService.gridOptions('vm.locations');
        }

    }
})();