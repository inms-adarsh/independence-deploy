(function () {
    'use strict';

    angular
        .module('app.auth')
        .factory('authService', authService);

    /** @ngInject */
    function authService($firebaseArray, $firebaseObject, auth, $q, $timeout, $state, firebaseUtils) {
        var service = {
            setCurrentTenant: setCurrentTenant,
            getCurrentTenant: getCurrentTenant,
            updateUserInfo: updateUserInfo,
            getCurrentUser: getCurrentUser,
            removeCurrentUser: removeCurrentUser,
            registerUser: registerUser,
            createProfile: createProfile,
            addTenant: addTenant,
            updateUserTenantId: updateUserTenantId,
            retrieveTenant: retrieveTenant,
            updateTenantInfo: updateTenantInfo,
            addUserToTenant: addUserToTenant,
            updatePassword: updatePassword,
            forgotPassword: forgotPassword,
            redirect: redirect
        };

        return service;

        //////////
        /**
         * Set Current Tenant
         * @param {Object} User information object
         */
        function setCurrentTenant(data) {
            var defer = $q.defer();
            defer.resolve(localStorage.setItem('tenantId', JSON.stringify(data)));
            return defer.promise;
        }

        /**
        * get Current Tenant Id
        */
        function getCurrentTenant(data) {
            return localStorage.getItem('tenantId') ? localStorage.getItem('tenantId').replace(/["']/g, "") : null;
        }

        /**
         * update User Information
         * @param {Object} user Update User information object
         */
        function updateUserInfo(user) {
            var ref = rootRef.child('users').child(uid);
            return firebaseUtils.updateData(ref, user);
        }

        /**
         * Get Current User
         * @param {String} Current User Id
         */
        function getCurrentUser(uid) {
            var ref = rootRef.child('users').child(uid);
            return firebaseUtils.getItemByRef(ref);
        }

        /**
         * Remove Current User
         * @param data
         */
        function removeCurrentUser() {
            localStorage.removeItem('userObj')
        }

        /**
         * Register a tenant
         * @param {Object} user User information Object
         */
        function registerUser(user) {
            var def = $q.defer();

            auth.$createUserWithEmailAndPassword(user.email, user.password).then(function (data) {
                def.resolve(data);
            }).catch(function (err) {
                def.reject(err);
            });
            return def.promise;
        }

        /**
         * Create a Profile
         * @param {Object} user user information object
         * @param {Object} authData current User authentication information
         * @param {String} tenantId current Tenant Id
         */
        function createProfile(user, authData, tenantId) {
            var userObj = rootRef.child('users'),
                userData = {
                    email: user.email,
                    name: user.username,
                    role: user.role,
                    uid: authData.uid
                };

            if (getCurrentTenant()) {
                userData.tenantId = getCurrentTenant();
            }
            return firebaseUtils.addData(userObj, userData);
        }

        /**
         * Create a Tenant
         * @param {Object} tenant Tenant Information object
         */
        function addTenant(tenant) {
            var tenantObj = rootRef.child('tenants'),
                def = $q.defer();

            delete tenant.password;
            if (getCurrentTenant()) {
                def.resolve(getCurrentTenant());
                return def.promise;
            } else {
                return firebaseUtils.addData(tenantObj, tenant);
            }
        }

        /**
         * Add new tenantId
         * @param {String} tenant Id 
         */
        function updateUserTenantId(uid, tenantId, user, authData) {
            var mergeObj = {},
                userObj = {
                    name: user.username,
                    email: user.email,
                    role: user.role
                };
            mergeObj['users/' + uid + '/tenantId'] = tenantId;
            mergeObj['tenant-users/' + tenantId + '/' + uid] = userObj;
            mergeObj['users-uid/' + authData.uid + '/tenantId'] = tenantId;
            return firebaseUtils.updateData(rootRef, mergeObj);
        }
        /**
         * Retrieve a tenant
         * @param {String} tenant Id
         */
        function retrieveTenant(tenantId) {
            if (!tenantId) {
                tenantId = this.getCurrentTenant();
            }
            var ref = rootRef.child('tenants').child(tenantId);
            return firebaseUtils.getItemByRef(ref);
        }

        /**
         * Update Tenant Information
         * @param {Object} tenant Information object
         */
        function updateTenantInfo(tenant, tenantId) {
            if (!tenantId) {
                tenantId = this.getCurrentTenant();
            }
            var ref = rootRef.child('tenants').child(tenantId);
            return firebaseUtils.updateData(ref, tenant);
        }

        /**
         * Add User to a tenant
         * @param {String} tenant ID
         * @param {Object} user Information object
         */
        function addUserToTenant(tenantId, user) {
            var tenantObj = rootRef.child('tenants').child(tenantId);
            return firebaseUtils.addData(tenantObj, user);
        }

        /**
         * Update user's password
         */
        function updatePassword(passwordObj) {
            var def = $q.defer();
            auth.$updatePassword(passwordObj.password, function (response) {
                def.resolve(response);
            }, function (error) {
                def.reject(errot);
            });

            return def.promise;
        }

        /**
         * Forgot Password
         */
        function forgotPassword(email) {
            var def = $q.defer();

            auth.$sendPasswordResetEmail(email).then(function () {
                alert("Password reset email sent successfully!");
            }).catch(function (error) {
                console.error("Error: ", error);
            });
        }

        /**
         * Create tenant
         */
        function redirect(user, profile, authData) {
            addTenant(user).then(function (key) {
                updateUserTenantId(profile, key, user, authData).then(function () {
                    setCurrentTenant(key).then(function () {
                        $state.go('app.records.list');
                    });
                });
            }).catch(function (err) {

            });
        }
    }

})();