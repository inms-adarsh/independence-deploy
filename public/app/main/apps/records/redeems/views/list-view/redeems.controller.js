(function ()
{
    'use strict';

    angular
        .module('app.records.redeems')
        .controller('RedeemsController', RedeemsController);

    /** @ngInject */
    function RedeemsController($state, $scope, $mdDialog, $document, redeemService, customers, beers, offers)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.redeemGridOptions = redeemService.gridOptions('vm.redeems', customers, beers, offers);
        }

    }
})();