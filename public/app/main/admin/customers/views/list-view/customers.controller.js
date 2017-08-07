(function ()
{
    'use strict';

    angular
        .module('app.admin.customers')
        .controller('CustomersController', CustomersController);

    /** @ngInject */
    function CustomersController($state, $scope, $mdDialog, $document, customerService)
    {
        var vm = this;

        // Data
        
        // Methods
        vm.addDialog = addDialog;
        vm.editDialog = editDialog;
        init();
        //////////

        function init() {
            vm.customerGridOptions = customerService.gridOptions('vm.customers');
        }

         /**
         * Add New Row
         */
        function addDialog(ev)
        {
            $mdDialog.show({
                controller         : 'CustomerDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/admin/customers/views/dialogs/customer-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true,
                locals             : {
                    dialogData: {
                        dialogType: 'add'
                    }
                }
            });
        }

        /**
         * Edit Dialog
         */
        function editDialog(ev, formView, formData)
        {
            $mdDialog.show({
                controller         : 'CustomerDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/apps/customers/views/dialogs/add-edit/edit-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true,
                locals             : {
                    dialogData: {
                        chartData : vm.data,
                        dialogType: 'edit',
                        formView  : formView,
                        formData  : formData
                    }
                }
            });
        }

    }
})();