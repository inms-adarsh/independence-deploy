(function ()
{
    'use strict';

    angular
        .module('app.admin.containers')
        .controller('ContainersController', ContainersController);

    /** @ngInject */
    function ContainersController($state, $scope, $mdDialog, $document, containerService)
    {
        var vm = this;

        // Data
        
        // Methods
        init();
        //////////

        function init() {
            vm.containerGridOptions = containerService.gridOptions('vm.containers');
        }

    }
})();