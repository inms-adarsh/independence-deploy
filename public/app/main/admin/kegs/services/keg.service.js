(function () {
    'use strict';

    angular
        .module('app.admin.kegs')
        .factory('kegService', kegService);

    /** @ngInject */
    function kegService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            formInstance;
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveKeg: saveKeg,
            updateKeg: updateKeg,
            fetchKegList: fetchKegList
        };

        return service;

        //////////

        /**
         * Grid Options for keg list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchKegList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (kegObj) {
                            saveKeg(kegObj);
                        },
                        update: function (key, kegObj) {
                            updateKeg(key, kegObj);
                        },
                        remove: function (key) {
                            deleteKeg(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    },
                    columns: config.kegGridCols(tenantId),
                    export: {
                        enabled: true,
                        fileName: 'Kegs',
                        allowExportSelectedData: true
                    },
                    editing: {
                        mode: 'row',
                        allowAdding: true,
                        allowUpdating: false,
                        allowDeleting: true
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * 
         */
        function keyMasterForm() {
            var beerListSource = new DevExpress.data.DataSource({
                load: function(loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-beers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function(key) {
                    var defer = $q.defer(),
                    ref = rootRef.child('tenant-beers').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });

            var keyDataSource = new DevExpress.data.DataSource({
                load: function(loadOptions) {
                    var defer = $q.defer(),
                        ref = rootRef.child('tenant-kegs').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                byKey: function(key) {
                    var defer = $q.defer(),
                    ref = rootRef.child('tenant-kegs').child(tenantId).child(key);
                    firebaseUtils.getItemByRef(ref).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                }
            });

            var keyGenForm = {
                colCount: 2,
                onInitialized: function (e) {
                    formInstance = e.component;
                },
                items: [{
                    dataField: 'batchDate',
                    label: {
                        text: 'Batch Date'
                    },
                    dataType: "date",
                    validationRules: [{
                        type: 'required',
                        message: 'Date is required'
                    }]
                }, {
                    dataField: 'beer',
                    label: {
                        text: 'Select Brew'
                    },
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: beerListSource,
                        displayExpr: "name",
                        valueExpr: "$id",
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Field is required'
                    }]
                }, {
                    dataField: 'isBSelected',
                    label: {
                        text: 'Is Brew Selected'
                    },
                    editorType: 'dxCheckBox',
                    editorOptions: {
                        value: false
                    }
                }, {
                    dataField: 'LtrsProduced',
                    label: {
                        text: 'Produced (Ltrs.)'
                    },
                    editorType: 'dxNumberBox',
                    validationRules: [{
                        type: 'required',
                        message: 'Field is required'
                    }]
                }]
            };
            return keyGenForm;
        }
        /**
         * Save form data
         * @returns {Object} Keg Form data
         */
        function saveKeg(kegObj) {
            var ref = rootRef.child('tenant-kegs').child(tenantId);
            kegObj.user = auth.$getAuth().uid;
            kegObj.LtrsBalanced = kegObj.ProducedLtrs;
            return firebaseUtils.addData(ref, kegObj);
        }

        /**
         * Fetch keg list
         * @returns {Object} Keg data
         */
        function fetchKegList() {
            var ref = rootRef.child('tenant-kegs').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch keg list
         * @returns {Object} Keg data
         */
        function updateKeg(key, kegData) {
            var ref = rootRef.child('tenant-kegs').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, kegData);
        }

        /**
         * Delete Keg
         * @returns {Object} keg data
         */
        function deleteKeg(key) {
            var ref = rootRef.child('tenant-kegs').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());