(function () {
    'use strict';

    angular
        .module('app.settings.taxgroups')
        .factory('taxgroupService', taxgroupService);

    /** @ngInject */
    function taxgroupService($firebaseArray, $firebaseObject, $q, authService, auth, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant(),
            taxGridInstance,
            dxTaxForm;
        // Private variables

        var service = {
            gridOptions: gridOptions,
            saveTaxgroup: saveTaxgroup,
            updateTaxgroup: updateTaxgroup,
            fetchTaxgroupList: fetchTaxgroupList,
            taxGrid: taxGrid
        };

        return service;

        //////////

        /**
         * Grid Options for taxgroup list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            fetchTaxgroupList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (taxObj) {
                            taxObj.selectedTaxes = taxGridInstance.getSelectedRowKeys();
                            saveTaxgroup(taxObj);
                        },
                        update: function (key, taxObj) {
                            updateTaxgroup(key, taxObj);
                        },
                        remove: function (key) {
                            deleteTaxgroup(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'description',
                            summaryType: 'count'
                        }]
                    },
                    columns: config.taxGroupGridCols(),
                    export: {
                        enabled: true,
                        fileName: 'Taxgroups',
                        allowExportSelectedData: true
                    },
                    onEditingStart: function (e) {

                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: true,
                        allowDeleting: true,
                        mode: 'form',
                        form: {
                            colCount: 2,
                            items: [{
                                dataField: 'description',
                                label: {
                                    text: 'Description',
                                    location: 'top'
                                },
                                validationRules: [{
                                    type: 'required',
                                    message: 'Description is required'
                                }]
                            },{
                                itemType: 'empty'
                            },{
                                label: {
                                    text: 'Select the Taxes that are included in this group',
                                    location: 'top'
                                },
                                template: 'taxgroupTemplate'
                            }],
                            onInitialized: function (e) {
                                dxTaxForm = e.component;
                            }
                        }
                    },
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

        /**
         * Taxes grid
         */
        function taxGrid(dataSource) {
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: dataSource,
                    columns: [{
                        dataField: 'description',
                        caption: 'Description'
                    }, {
                        dataField: 'defaultRate',
                        caption: 'Tax Rate(%)',
                        dataType: 'number'
                    }],
                    searchPanel: {
                        visible: false
                    },
                    columnChooser: {
                        enabled: false
                    },
                    editing: {
                        allowAdding: false,
                        allowUpdating: false,
                        allowDeleting: false
                    },
                    onContentReady: function (e) {
                        taxGridInstance = e.component;
                        taxGridInstance.selectRows(dxTaxForm.option('formData').selectedTaxes);
                    },
                    showBorders: true
                };
            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        }

        /**
         * Save form data
         * @returns {Object} Taxgroup Form data
         */
        function saveTaxgroup(taxObj) {
            var ref = rootRef.child('tenant-taxgroups').child(tenantId);
            taxObj.user = auth.$getAuth().uid;
            return firebaseUtils.addData(ref, taxObj);
        }

        /**
         * Fetch taxgroup list
         * @returns {Object} Taxgroup data
         */
        function fetchTaxgroupList() {
            var ref = rootRef.child('tenant-taxgroups').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch taxgroup list
         * @returns {Object} Taxgroup data
         */
        function updateTaxgroup(key, taxData) {
            var ref = rootRef.child('tenant-taxgroups').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, TaxgroupsData);
        }

        /**
         * Delete Taxgroup
         * @returns {Object} taxgroup data
         */
        function deleteTaxgroup(key) {
            var ref = rootRef.child('tenant-taxgroups').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());