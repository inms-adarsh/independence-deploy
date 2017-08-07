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
            vm.bulkbuyform = formOptions();
        }

        $scope.popupOptions = {
            contentTemplate: "info",
            showTitle: true,
            width: 400,
            height: 'auto',
            title: "Add Customer",
            dragEnabled: false,
            closeOnOutsideClick: true,
            bindingOptions: {
                visible: "visiblePopup",
            },
            onHidden: function() {
                customerFormInstance.resetValues();
            }
        };

        $scope.buttonOptions = {
            text: "Save",
            type: "success",
            useSubmitBehavior: true,
            validationGroup: "customerData",
            width: '100%',
            onClick: function (e) {
                var result = e.validationGroup.validate();
                if (result.isValid == true) {
                    var formData = customerFormInstance.option('formData');
                    var ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);
                    firebaseUtils.fetchList(ref).then(function (data) {
                        var phoneIndex = msUtils.getIndexByArray(data, 'phone', formData.phone),
                            emailIndex = msUtils.getIndexByArray(data, 'email', formData.email);

                        if (phoneIndex > -1) {
                            DevExpress.ui.notify("Phone number already registered!");
                        } else if (formData.email && emailIndex > -1) {
                            DevExpress.ui.notify("Email address already registered!");
                        } else {
                            BulkbuyCustomerService.saveCustomer(formData).then(function (data) {
                                BulkbuyCustomerService.fetchCustomerList().then(function (data) {
                                    $scope.customers = data;
                                    if (formInstance) {
                                        formInstance.repaint();
                                    }
                                    $scope.visiblePopup = false;
                                });
                            });
                        }
                    });
                }
            }
        };

        /**
         * Return form Item Configuration
         * @returns {Object} Item configuration
         */
        function formOptions() {
            var formOptionsItems = {
                minColWidth: 233,
                colCount: "auto",
                labelLocation: "top",
                validationGroup: "customerData",
                onInitialized: function (e) {
                    customerFormInstance = e.component;
                },
                items: [{
                    dataField: 'name',
                    caption: 'Name',
                    validationRules: [{
                        type: 'required',
                        message: 'Name is required'
                    }],
                }, {
                    dataField: 'phone',
                    caption: 'Phone',
                    validationRules: [{
                        type: 'required',
                        message: 'Phone number is required'
                    }],
                    editorOptions: {
                        mask: '0000000000'
                    }
                }, {
                    dataField: 'email',
                    caption: 'Email',
                    validationRules: [{
                        type: 'email',
                        message: 'Please enter valid e-mail address'
                    }]
                }, {
                    dataField: 'source',
                    caption: 'Source'
                }, {
                    dataField: 'date',
                    caption: 'Date',
                    editorType: 'dxDateBox',
                    validationRules: [{
                        type: 'required',
                        message: 'Field is required'
                    }],
                    editorOptions: {
                        width: '100%',
                        onInitialized: function (e) {
                            e.component.option('value', new Date());
                        }
                    }

                }]
            };
            return formOptionsItems;
        };

        /**
         * Bulk buy form
         * @param {*} customerList 
         * @param {*} beerList 
         */
        function bulkbuyForm(customerList, beerList) {
            var bulkbuyForm = {
                colCount: 2,
                onInitialized: function (e) {
                    formInstance = e.component;
                },
                items: [{
                    dataField: 'date',
                    label: {
                        text: 'Date'
                    },
                    editorType: 'dxDateBox',
                    editorOptions: {
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
                    editorType: 'dxSelectBox',
                    editorOptions: {
                        dataSource: $scope.customers,
                        displayExpr: "name",
                        valueExpr: "$id",
                        searchExpr: ["name", "phone", "email"],
                        itemTemplate: function (itemData, itemIndex, itemElement) {
                            var rightBlock = $("<div style='display:inline-block;'>");
                            rightBlock.append("<p style='font-size:larger;'><b>" + itemData.name + "</b></p>");
                            rightBlock.append("<p>Phone: <span>" + itemData.phone + "</span></p>");
                            rightBlock.append("<p>Email ID: <span>" + itemData.email ? itemData.email : '' + "</span></p>");
                            itemElement.append(rightBlock);
                        },
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a customer'
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
                        valueExpr: "id",
                    },
                    validationRules: [{
                        type: 'required',
                        message: 'Please select a quantity'
                    }]
                }]
            };
            return bulkbuyForm;
        }
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
                        allowAdding: true,
                        allowUpdating: false,
                        allowDeleting: true,
                        mode: 'form',
                        form: bulkbuyForm()
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

                        if (quantityList[e.data.quantity].quantity > e.data.balancedQuantity) {
                            d.reject("Can not delete the record");
                        } else {
                            d.resolve();
                        }
                        e.cancel = d.promise();
                    }, 
                    onRowInserted: function(e) {
                      init();
                      dataGridInstance.repaint();
                      dataGridInstance.refresh() ; 
                    },onToolbarPreparing: function (e) {
                        var dataGrid = e.component;

                        e.toolbarOptions.items.unshift({
                            location: "before",
                            widget: "dxButton",
                            options: {
                                text: "Add New Customer",
                                type: "success",
                                onClick: function (e) {
                                    $scope.visiblePopup = true;
                                }
                            }
                        });
                    },
                    onContentReady: function (e) {
                        dataGridInstance = e.component;
                    }
                };

            angular.extend(gridOptions, otherConfig);
            return gridOptions;
        };

    }
})();