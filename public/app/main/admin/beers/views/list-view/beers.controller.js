(function ()
{
    'use strict';

    angular
        .module('app.admin.beers')
        .controller('BeersController', BeersController);

    /** @ngInject */
    function BeersController($state, $scope, $mdDialog, $document, beerService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.beerGridOptions = beerService.gridOptions('vm.beers');
        }

    }
})();