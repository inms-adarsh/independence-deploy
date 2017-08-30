(function ()
{
    'use strict';

    angular
        .module('app.auth.forgot-password')
        .controller('ForgotPasswordController', ForgotPasswordController);

    /** @ngInject */
    function ForgotPasswordController(authService)
    {
        // Data
        var vm = this;
        // Methods
        vm.forgotPassword = forgotPassword;
        //////////
        
        /**
         * Forgot Password Email
         */
        function forgotPassword(form) {
            authService.forgotPassword(form.email);
        }
    }
})();