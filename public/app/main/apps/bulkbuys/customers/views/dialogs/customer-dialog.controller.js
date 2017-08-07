(function () {
    'use strict';

    angular
        .module('app.admin.customers')
        .controller('CustomerDialogController', CustomerDialogController);

    /** @ngInject */
    function CustomerDialogController($mdDialog, dialogData, customerService) {
        var vm = this,
            dxFormInstance;

        // Data
        vm.form = {
            from: 'johndoe@creapond.com'
        };

        vm.hiddenCC = true;
        vm.hiddenBCC = true;

        vm.customers = {};

        vm.formOptions = customerService.formOptions();

        // Methods
        vm.closeDialog = closeDialog;

        //////////

        function closeDialog() {
            dxFormInstance = $('#customer-form').dxForm('instance');
            if(dxFormInstance.validate().isValid === true) {
                customerService.saveData(dxFormInstance.option('formData')).then(function(data) {
                    $mdDialog.hide();
                });
            }
            //$mdDialog.hide();
        }
    }
})();
