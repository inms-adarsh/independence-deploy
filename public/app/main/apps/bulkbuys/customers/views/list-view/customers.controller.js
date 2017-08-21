(function () {
    'use strict';

    angular
        .module('app.bulkbuys.customers')
        .controller('BulkbuyCustomersController', CustomersController);

    /** @ngInject */
    function CustomersController($state, $scope, msUtils, $mdDialog, $document, $q, $compile, BulkbuyCustomerService, dxUtils, authService, firebaseUtils) {
        var vm = this,
            tenantId = authService.getCurrentTenant();;
        
        // Methods
        vm.addDialog = addDialog;
        vm.editDialog = editDialog;
        init();
        //////////

        vm.deleteRow = function deleteRow(key) {
            var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(key).child('records').orderByChild(key).equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                if (data.length > 0) {
                    DevExpress.ui.notify("Can not delete the record");
                }
            })
        };

        vm.customerDataSource = new DevExpress.data.CustomStore();

        function init() {
            var gridOptions = dxUtils.createGrid(),
                customerGridOptions = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            BulkbuyCustomerService.fetchCustomerList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (customerObj) {
                            BulkbuyCustomerService.saveCustomer(customerObj);
                        },
                        update: function (key, customerObj) {
                            BulkbuyCustomerService.updateCustomer(key, customerObj);
                        },
                        remove: function (key) {
                            BulkbuyCustomerService.deleteCustomer(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    },
                    columns: [{
                        dataField: 'name',
                        caption: 'Name',
                        validationRules: [{
                            type: 'required',
                            message: 'Name is required'
                        }],
                    }, {
                        dataField: 'phone',
                        caption: 'Phone',
                        dataType: 'number',
                        validationRules: [{
                            type: 'required',
                            message: 'Phone number is required'
                        }],
                        editorType: 'dxNumberBox'
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
                        dataType: 'date',
                        validationRules: [{
                            type: 'required',
                            message: 'Field is required'
                        }]

                    }],
                    export: {
                        enabled: true,
                        fileName: 'Bulkbuy Customers',
                        allowExportSelectedData: true
                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: true,
                        allowDeleting: true,
                        mode: 'row'
                    },
                    onRowRemoving: function(e) {
                        var d = $.Deferred();
                        var ref = rootRef.child('tenant-customer-bulkbuy-records').child(tenantId).child(e.data.$id).child('records').orderByChild('deactivated').equalTo(null);
                        firebaseUtils.fetchList(ref).then(function (data) {
                            if (data.length > 0) {
                                d.reject("Can not delete the record");
                            } else {
                                d.resolve();
                            }
                        });
                        e.cancel = d.promise();
                    }, 
                    onRowValidating: function(e) {
                        var d = $.Deferred(),
                            ref = rootRef.child('tenant-bulkbuy-customers').child(tenantId).orderByChild('deactivated').equalTo(null);

                        firebaseUtils.fetchList(ref).then(function(data) {
                            var phoneIndex = msUtils.getIndexByArray(data, 'phone', e.newData.phone),
                                emailIndex = msUtils.getIndexByArray(data, 'email', e.newData.email);
                            
                            if(phoneIndex > -1) {
                                e.isValid = false;
                                e.errorText = "Phone number already registered!"
                            } else if(e.newData.email && emailIndex > -1) {
                                e.isValid = false;
                                e.errorText = "Email address already registered!"
                            }
                        });
                    }
                };

            vm.customerGridOptions = angular.extend(gridOptions, customerGridOptions);
        }

        /**
        * Add New Row
        */
        function addDialog(ev) {
            $mdDialog.show({
                controller: 'CustomerDialogController',
                controllerAs: 'vm',
                templateUrl: 'app/main/admin/customers/views/dialogs/customer-dialog.html',
                parent: angular.element($document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                locals: {
                    dialogData: {
                        dialogType: 'add'
                    }
                }
            });
        }

        /**
         * Edit Dialog
         */
        function editDialog(ev, formView, formData) {
            $mdDialog.show({
                controller: 'CustomerDialogController',
                controllerAs: 'vm',
                templateUrl: 'app/main/apps/customers/views/dialogs/add-edit/edit-dialog.html',
                parent: angular.element($document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                locals: {
                    dialogData: {
                        chartData: vm.data,
                        dialogType: 'edit',
                        formView: formView,
                        formData: formData
                    }
                }
            });
        }

    }
})();