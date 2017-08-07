(function ()
{
    'use strict';

    angular
        .module('app.records')
        .controller('RecordsController', RecordsController);

    /** @ngInject */
    function RecordsController($state, $scope, $mdDialog, $document, recordService, customers, beers)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.recordGridOptions = recordService.gridOptions('vm.records', customers, beers);
        }

    }
})();