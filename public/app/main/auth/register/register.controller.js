(function ()
{
    'use strict';

    angular
        .module('app.auth.register')
        .controller('RegisterController', RegisterController);

    /** @ngInject */
    function RegisterController(authService, $state)
    {
        var vm = this;
        // Data

        // Methods
        vm.register = register;
        //vm.redirect = redirect;

        //////////
        function register() {
            var user = {
              username: vm.form.username,
              email: vm.form.email,
              password: vm.form.password,
              role: 'superuser'
            };
            authService.registerUser(user).then(function(authData) {
              authService.createProfile(user, authData).then(function(profile) {
                authService.redirect(user, profile, authData);
              });
            });
        }

       
    }
})();