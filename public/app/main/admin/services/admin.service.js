(function() {
    'use strict';

    angular
        .module('app.admin')
        .factory('adminService', adminService);

    /** @ngInject */
    function adminService($firebaseArray, $firebaseObject, auth, $q, $timeout, authService, firebaseUtils) {
        var currentUser,
            tenantId = authService.getCurrentTenant(),
            service = {
                setCurrentSettings: setCurrentSettings,
                getCurrentSettings: getCurrentSettings,
                getCurrentCustomers: getCurrentCustomers,
                getBeers: getBeers,
                getCurrentBulkCustomers: getCurrentBulkCustomers,
                getCurrentOffers: getCurrentOffers
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

        /**
         * get Current Customers
         */
        function getCurrentCustomers() {
            var defer = $q.defer(),
                ref = rootRef.child('tenant-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                defer.resolve(data);
            });
            return defer.promise;
        }

        /**
         * Get current brews
         */
        function getBeers() {
             var defer = $q.defer(),
                ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                defer.resolve(data);
            });
            return defer.promise;
        }

        function getCurrentBulkCustomers() {
            var defer = $q.defer(),
                ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                defer.resolve(data);
            });
            return defer.promise;
        }

        function getCurrentOffers() {
            var defer = $q.defer(),
                ref = rootRef.child('tenant-record-offers').child(tenantId);
            firebaseUtils.fetchList(ref).then(function (data) {
                defer.resolve(data);
            });
            return defer.promise;
        }
    }

})();