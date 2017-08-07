(function ()
{
    'use strict';

    angular
        .module('app.admin.kegs')
        .controller('KegsController', KegsController);

    /** @ngInject */
    function KegsController($state, $scope, $mdDialog, $document, kegService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.kegGridOptions = kegService.gridOptions('vm.kegs');
        }

    }
})();