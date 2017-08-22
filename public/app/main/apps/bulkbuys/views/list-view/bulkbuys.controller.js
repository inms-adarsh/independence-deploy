(function () {
    'use strict';

    angular
        .module('app.bulkbuys')
        .controller('BulkbuysController', BulkbuysController);

    /** @ngInject */
    function BulkbuysController($state, $scope, $mdDialog, $q, $document, authService, firebaseUtils, config, msUtils, dxUtils, bulkbuyService, customers, beers, BulkbuyCustomerService) {
        var vm = this,
            tenantId = authService.getCurrentTenant(),
            customerFormInstance,
            formInstance,
            dataGridInstance,
            quantityList = [{
                id: 0,
                quantity: 6
            }, {
                id: 1,
                quantity: 10
            }, {
                id: 2,
                quantity: 20
            }];

        // Data
        $scope.customers = customers;
        // Methods
        init();
        //////////

        function init() {
            vm.bulkbuyGridOptions = gridOptions('vm.bulkbuys', $scope.customers, beers);
        }

        $scope.popupOptions = {
            contentTemplate: "info",
            showTitle: true,
            width: '70%',
            height: 'auto',
            title: "Add Quantity",
            dragEnabled: false,
            closeOnOutsideClick: true,
            bindingOptions: {
                visible: "visiblePopup"
            },
            onHidden: function () {
                resetValues();
            }
        };

        function resetValues() {
            formInstance.resetValues();
            formInstance.getEditor('date').option('value', new Date());
            formInstance.getEditor('invoice').focus();
        }
        
        $scope.buttonOptions = {
            text: "Save and Exit",
            type: "success",
            useSubmitBehavior: true,
            validationGroup: "customerData",
            onClick: function (e) {
                submitForm(e).then(function() {
                    $scope.visiblePopup = false;   
                });
            } 
        };

        $scope.saveNewBttonOptions = {
            text: "Save and New",
            type: "info",
            useSubmitBehavior: true,
            validationGroup: "customerData",
            onClick: function (e) {
                submitForm(e);
            }
        };

        function submitForm(e) {
            var defer = $q.defer();
            var result = e.validationGroup.validate();
            if (result.isValid == true) {
                var formData = formInstance.option('formData');
                var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
                firebaseUtils.fetchList(ref).then(function (data) {
                    var phoneIndex = msUtils.getIndexByArray(data, 'phone', formData.phone),
                        emailIndex = msUtils.getIndexByArray(data, 'email', formData.email);

                    if (phoneIndex > -1 || emailIndex > -1) {
                        var bookingData = angular.copy(formData);
                        bookingData.bookingName = bookingData.customerSelected;
                        if(phoneIndex > -1) {
                            bookingData.customerSelected = data[phoneIndex].$id;
                        } else if(phoneIndex < 0 && emailIndex > -1) {
                            bookingData.customerSelected = data[emailIndex].$id;
                        }
                        bulkbuyService.saveBulkbuy(bookingData).then(function () {
                            init();
                            dataGridInstance.refresh();
                            resetValues();
                            defer.resolve();
                        });
                    } else {
                        var customerObj = {
                            name: formData.customerSelected,
                            phone: formData.phone,
                            date: formData.date
                        };

                        if (formData.email) {
                            customerObj.email = formData.email;
                        }

                        BulkbuyCustomerService.saveCustomer(customerObj).then(function (key) {
                            var bookingData = angular.copy(formData);
                            bookingData.bookingName = bookingData.customerSelected;
                            bookingData.customerSelected = key;
                            BulkbuyCustomerService.fetchCustomerList().then(function (data) {
                                $scope.customers = data;
                                if (formInstance) {
                                    formInstance.repaint();
                                }

                            });

                            bulkbuyService.saveBulkbuy(bookingData).then(function () {
                                init();
                                dataGridInstance.refresh();
                                resetValues();
                                defer.resolve();
                            });
                        });
                    }
                });
            }
            return defer.promise;
        }

        /**
         * Bulk buy form
         * @param {*} customerList 
         * @param {*} beerList 
         */
        vm.bulkgridForm = {
            colCount: 2,
            onInitialized: function (e) {
                formInstance = e.component;
            },
            validationGroup: "customerData",
            items: [{
                dataField: 'date',
                label: {
                    text: 'Date'
                },
                editorType: 'dxDateBox',
                editorOptions: {
                    width: '100%',
                    onInitialized: function (e) {
                        e.component.option('value', new Date());
                    }
                },
                validationRules: [{
                    type: 'required',
                    message: 'Date is required'
                }]
            }, {
                dataField: 'invoice',
                caption: 'Invoice',
                dataType: 'string',
                validationRules: [{
                    type: 'required',
                    message: 'Invoice number is required'
                }]
            }, {
                dataField: 'customerSelected',
                label: {
                    text: 'Customer'
                },
                name: 'customerSelected',
                editorType: 'dxAutocomplete',
                editorOptions: {
                    dataSource: $scope.customers,
                    displayExpr: "name",
                    valueExpr: "$id",
                    searchExpr: ["name"],
                    onSelectionChanged: function (data) {
                        if (data.selectedItem && data.selectedItem.$id) {
                            formInstance.getEditor('phone').option('value', data.selectedItem.phone);
                            formInstance.getEditor('email').option('value', data.selectedItem.email);
                        }
                    }
                },
                validationRules: [{
                    type: 'required',
                    message: 'Please select a customer'
                }]
            }, {
                dataField: "phone",
                label: {
                    text: "Phone"
                },
                name: 'phone',
                validationRules: [{
                    type: 'required',
                    message: 'Phone number is required!'
                }],
                editorType: 'dxNumberBox'
            }, {
                dataField: "email",
                label: {
                    text: "Email"
                },
                name: 'email',
                editorType: 'dxTextBox',
                validationRules: [{
                    type: 'email',
                    message: 'Please enter valid e-mail address'
                }]
            }, {
                dataField: "quantity",
                label: {
                    text: "Units (0.5 Ltrs per unit)"
                },
                editorType: 'dxSelectBox',
                editorOptions: {
                    dataSource: quantityList,
                    displayExpr: "quantity",
                    valueExpr: "id"
                },
                validationRules: [{
                    type: 'required',
                    message: 'Please select a quantity'
                }]
            }]
        };
        /**
         * Grid Options for bulkbuy list
         * @param {Object} dataSource 
         */
        function gridOptions(dataSource, customers, beers) {
            $scope.gridCols = config.bulkbuyGridCols(tenantId, customers, beers);
            var gridOptions = dxUtils.createGrid(),
                otherConfig = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            bulkbuyService.fetchBulkbuyList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (bulkbuyObj) {
                            //var data = formInstance.option('formData');
                            bulkbuyService.saveBulkbuy(bulkbuyObj);
                        },
                        update: function (key, bulkbuyObj) {
                            bulkbuyService.updateBulkbuy(key, bulkbuyObj);
                        },
                        remove: function (key) {
                            bulkbuyService.deleteBulkbuy(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'balancedQuantity',
                            summaryType: 'sum',
                            texts: {
                                sum: 'Total Balanced'
                            }
                        }]
                    },
                    editing: {
                        allowAdding: false,
                        allowUpdating: false,
                        allowDeleting: true,
                        mode: 'form'
                    },
                    bindingOptions: {
                        columns: 'gridCols'
                    },
                    export: {
                        enabled: true,
                        fileName: 'Bulkbuys',
                        allowExportSelectedData: true
                    },
                    onRowRemoving: function (e) {
                        var d = $.Deferred();

                        if (quantityList[e.data.quantity].quantity > e.data.balancedQuantity || new Date(e.data.expiryDate) < new Date()) {
                            d.reject("Can not delete the record");
                        } else {
                            d.resolve();
                        }
                        e.cancel = d.promise();
                    },
                    onRowInserted: function (e) {
                        init();
                        dataGridInstance.repaint();
                        dataGridInstance.refresh();
                    }, onToolbarPreparing: function (e) {
                        e.toolbarOptions.items.unshift({
                            location: "before",
                            widget: "dxButton",
                            options: {
                                text: "Add Quantity",
                                type: "success",
                                onClick: function (e) {
                                    $scope.visiblePopup = true;
                                }
                            }
                        });
                    },
                    onContentReady: function (e) {
                        dataGridInstance = e.component;
                    },
                    onRowPrepared: function (info) {
                        if (info.rowType == 'data' && new Date(info.data.expiryDate).getTime() < new Date().getTime())
                            info.rowElement.addClass("md-red-50-bg");
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

    }
})();