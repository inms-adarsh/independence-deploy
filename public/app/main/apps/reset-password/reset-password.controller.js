(function () {
    'use strict';

    angular
        .module('app.reset-password')
        .controller('ResetPasswordController', ResetPasswordController);

    /** @ngInject */
    function ResetPasswordController(currentAuth, authService, auth, $state) {
        // Data
        var vm = this;
        // Methods
        vm.updatePassword = updatePassword;
        //////////
        /**
         * Update user's password
         */
        function updatePassword(form) {
            var user = auth.$getAuth();
            var credential =  {
                email: user.email,
                password: form.old_password
            };
            auth.$signInWithEmailAndPassword(user.email, form.old_password).then(function () {
                // User re-authenticated.

                authService.updatePassword(form).then(function (data) {
                    alert("Password changed successfully");
                    $state.go('app.records.list');
                }).catch(function () {

                });
            }).catch(function (error) {
                // An error happened.
            });
        }
    }
})();