(function() {
    'use strict';

    angular
        .module('app.settings')
        .factory('settingsService', settingsService);

    /** @ngInject */
    function settingsService($firebaseArray, $firebaseObject, auth, $q, $timeout) {
        var currentUser;
        var service = {
            setCurrentSettings: setCurrentSettings,
            getCurrentSettings: getCurrentSettings
        };

        return service;

        //////////
        /**
         * Set Current User
         * @param {Object} User information object
         */
        function setCurrentSettings(data) {
            localStorage.setItem('userObj', JSON.stringify(data));
        }

        /**
         * Get Current Settings
         * @param {String} Current Tenant Id
         */
        function getCurrentSettings() {
            var def = $q.defer(),
                ref = rootRef.child('settings'),
                obj = $firebaseObject(ref);

            obj.$loaded().then(function(data) {
                def.resolve(data);
            }).catch(function(err) {
                def.reject(err);
            });

            return def.promise;
        }

 
    }

})();