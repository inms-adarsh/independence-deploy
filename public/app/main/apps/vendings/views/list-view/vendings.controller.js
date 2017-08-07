(function () {
    'use strict';

    angular
        .module('app.vendings')
        .controller('VendingsController', VendingsController);

    /** @ngInject */
    function VendingsController($state, $scope, $q, $mdDialog, $document, firebaseUtils, authService, vendingService, config, customers, beers, dxUtils) {
        var vm = this,
            brewGridInstance,
            vendorGridInstance,
            tenantId = authService.getCurrentTenant();

        // Data

        // Methods
        init();
        //////////

        function init() {
            //vm.vendingGridOptions = vendingService.gridOptions('vm.vendings', customers, beers);
            //vm.brewDataGridOptions = vendingService.brewGrid(beers);
            vm.brewDataSource = [];
        }

        $scope.$on('VendorFormInitialized', function (event, data) {
        });

        /**
         * Sub Grid
         */
        vm.brewDataGridOptions = dxUtils.createGrid();
        var otherConfig = {
            dataSource: {
                load: function (options) {
                    var defer = $q.defer();
                    vendingService.fetchInvoiceVendingList(vm.currentRowKey).then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                insert: function (vendingObj) {
                    vendingObj.invoice = vm.currentRowKey;
                    vendingService.saveInvoiceVending(vendingObj);
                },
                update: function (key, vendingObj) {
                    vendingObj.invoice = vm.currentRowKey;
                    vendingService.updateInvoiceVending(key, vendingObj);
                },
                remove: function (key) {
                    vendingService.deleteInvoiceVending(key, vm.currentRowKey);
                }
            },
            columns: [{
                dataField: 'beerSelected',
                label: {
                    text: 'Brew'
                },
                lookup: {
                    dataSource: beers,
                    displayExpr: "name",
                    valueExpr: "$id"
                },
                validationRules: [{
                    type: 'required',
                    message: 'Please select a brew'
                }]
            }, {
                dataField: 'quantity',
                caption: 'Units (Per unit 0.5 Ltr)',
                dataType: 'number',
                validationRules: [{
                    type: 'required',
                    message: 'Please select a quantity'
                }]
            }],
            searchPanel: {
                visible: false
            },
            columnChooser: {
                enabled: false
            },
            editing: {
                allowAdding: true,
                allowUpdating: true,
                allowDeleting: true,
                mode: 'batch'
            },
            onContentReady: function (e) {
                brewGridInstance = e.component;
            },
            showBorders: true
        };
        angular.extend(vm.brewDataGridOptions, otherConfig);


        /**
         * Main Grid
         */
        vm.vendingGridOptions = {
            dataSource: {
                load: function (options) {
                    var defer = $q.defer();
                    vendingService.fetchVendingList().then(function (data) {
                        defer.resolve(data);
                    });
                    return defer.promise;
                },
                insert: function (vendingObj) {
                    vendingService.saveVending(vendingObj);
                },
                update: function (key, vendingObj) {
                    vendingService.updateVending(key, vendingObj);
                },
                remove: function (key) {
                    vendingService.deleteVending(key);
                }
            },
            summary: {
                totalItems: [{
                    column: 'name',
                    summaryType: 'count'
                }]
            },
            editing: {
                allowAdding: true,
                allowUpdating: true,
                allowDeleting: true,
                mode: 'form',
                form: vendingService.vendingForm(customers, beers)
            },
            columns: config.vendingGridCols(tenantId, customers, beers),
            export: {
                enabled: true,
                fileName: 'Vendings',
                allowExportSelectedData: true
            },
            onEditorPrepared: function (e) {
                if (e.row && e.row.data && e.row.data.$id) {
                    vm.brewDataSource = e.row.data.brews;
                    vm.editMode = true;
                } else {
                    vm.brewDataSource = [];
                    vm.editMode = false;
                }
            }, loadPanel: {
                enabled: true
            },
            onRowExpanded: function(e) {
                if(e.key) {
                    vm.currentRowKey = e.key.$id;
                }
            },
            scrolling: {
                mode: 'virtual'
            },
            headerFilter: {
                visible: false
            },
            searchPanel: {
                visible: true,
                width: 240,
                placeholder: 'Search...'
            },
            columnChooser: {
                enabled: true
            },
            onContentReady: function (e) {
                vendorGridInstance = e.component;
                e.component.option('loadPanel.enabled', false);
            },
            showColumnLines: false,
            showRowLines: true,
            showBorders: false,
            rowAlternationEnabled: true,
            columnAutoWidth: true,
            sorting: {
                mode: 'none'
            },
            masterDetail: {
                enabled: true,
                template: "brewTemplate"
            }
        };

        vm.brewDataSource = new DevExpress.data.CustomStore();
    }
})();