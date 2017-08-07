(function ()
{
    'use strict';

    angular
        .module('app.core')
        .factory('firebaseUtils', firebaseUtils);

    /** @ngInject */
    function firebaseUtils($window, $q, $firebaseArray, $firebaseObject, auth)
    {
        // Private variables
        var mobileDetect = new MobileDetect($window.navigator.userAgent),
            browserInfo = null;

        var service = {
            fetchList: fetchList,
            updateData: updateData,
            getItemByRef: getItemByRef,
            addData     : addData,
            getListSum: getListSum
        };

        return service;

        //////////

        /**
         * Return list based on firebase ref
         *
         * @param item
         * @param list
         * @returns {boolean}
         */
        function fetchList(ref)
        {
            var defer = $q.defer(),
                list = $firebaseArray(ref);
            
            list.$loaded().then(function (data) {
                defer.resolve(data);
            }).catch(function (err) {
                defer.reject(err);
            });

            return defer.promise;
        }

        /**
         * Update firebase ref
         */
        function updateData(ref, updateData)
        {   
            var defer = $q.defer();
            //updateData.updateId = auth.$getAuth().uid;
            //updateData.updateDate = (new Date()).toString();
            ref.update(updateData, function(err) { 
                if(err) {
                    defer.reject(err);
                } else {
                    defer.resolve(updateData);
                }
            });

            return defer.promise;
        }   

        /**
         * get firebase item by id
         */
        function getItemByRef(ref)
        {   
            var defer = $q.defer(),
                obj = $firebaseObject(ref);

            obj.$loaded().then(function(data) {
                defer.resolve(data);
            }).catch(function(err) {
                defer.reject(err);
            });

            return defer.promise;
        }   

        /**
         * Add data
         *
         */
        function addData(ref, saveData)
        {
            var def = $q.defer();
            //saveData.addId = auth.$getAuth().uid;
            //saveData.addDate = (new Date()).toString();
            $firebaseArray(ref).$add(saveData).then(function(ref) {
                if (ref.key) {
                    def.resolve(ref.key);
                }
            }).catch(function(err) {
                def.reject(err);
            });

            return def.promise;
        }

        /**
         * Delete data
         */
        function deleteData(ref, key) {
            var def = $q.defer();

            var list = $firebaseArray(ref),
                item = list[key];

             list.$remove(item).then(function(ref) {
                if (ref.key) {
                    def.resolve(ref.key);
                }
            }).catch(function(err) {
                def.reject(err);
            });

            return def.promise;
        }

        /**
         * Get sum of records
         * @param {*} ref 
         * @param {*} key 
         */
        function getListSum(ref, key) {
            var defer = $q.defer();
            fetchList(ref).then(function(data) {
                var sum = 0;
                data.forEach(function(record) {
                    sum += record[key];
                });
                defer.resolve(sum);
            });
            return defer.promise;
        }
    }
}());