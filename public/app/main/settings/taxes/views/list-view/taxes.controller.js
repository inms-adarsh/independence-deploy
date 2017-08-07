(function ()
{
    'use strict';

    angular
        .module('app.settings.taxes')
        .controller('TaxesController', TaxesController);

    /** @ngInject */
    function TaxesController($state, $scope, $mdDialog, $document, taxService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.taxGridOptions = taxService.gridOptions('vm.taxes');
        }

    }
})();