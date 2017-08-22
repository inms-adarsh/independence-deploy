(function () {
    'use strict';

    angular
        .module('app.records.offers')
        .controller('OffersController', OffersController);

    /** @ngInject */
    function OffersController($state, $scope, msUtils, $mdDialog, $document, $q, $compile, OfferService, dxUtils, authService, firebaseUtils) {
        var vm = this,
            tenantId = authService.getCurrentTenant();;

        // Methods
        vm.addDialog = addDialog;
        vm.editDialog = editDialog;
        init();
        //////////

        vm.deleteRow = function deleteRow(key) {
            var ref = rootRef.child('tenant-offer-record-records').child(tenantId).child(key).child('records').orderByChild(key).equalTo(null);
            firebaseUtils.fetchList(ref).then(function (data) {
                if (data.length > 0) {
                    DevExpress.ui.notify("Can not delete the record");
                }
            })
        };

        vm.offerDataSource = new DevExpress.data.CustomStore();

        function init() {
            var gridOptions = dxUtils.createGrid(),
                offerGridOptions = {
                    dataSource: {
                        load: function () {
                            var defer = $q.defer();
                            OfferService.fetchOfferList().then(function (data) {
                                defer.resolve(data);
                            });
                            return defer.promise;
                        },
                        insert: function (offerObj) {
                            OfferService.saveOffer(offerObj);
                        },
                        update: function (key, offerObj) {
                            OfferService.updateOffer(key, offerObj);
                        },
                        remove: function (key) {
                            OfferService.deleteOffer(key);
                        }
                    },
                    summary: {
                        totalItems: [{
                            column: 'name',
                            summaryType: 'count'
                        }]
                    },
                    columns: [{
                        dataField: 'date',
                        dataType: 'date',
                        caption: 'Date',
                        validationRules: [{
                            type: 'required',
                            message: 'Date is required'
                        }]
                    }, {
                        dataField: 'description',
                        caption: 'Description',
                        dataType: 'string',
                        validationRules: [{
                            type: 'required',
                            message: 'Description is required'
                        }],
                        editorType: 'dxNumberBox'
                    }, {
                        dataField: 'expiryDate',
                        caption: 'Expires on',
                        dataType: 'date'
                    }],
                    export: {
                        enabled: true,
                        fileName: 'HopHeads Offers',
                        allowExportSelectedData: true
                    },
                    editing: {
                        allowAdding: true,
                        allowUpdating: false,
                        allowDeleting: true,
                        mode: 'row'
                    },
                    onRowRemoving: function (e) {
                        var d = $.Deferred();

                        if (e.data.customers) {
                            d.reject("Can not delete the record");
                        } else {
                            d.resolve();
                        }

                        e.cancel = d.promise();
                    },
                    onRowPrepared: function (info) {
                        if (info.rowType == 'data' && new Date(info.data.expiryDate).getTime() < new Date().getTime())
                            info.rowElement.addClass("md-red-50-bg");
                    }
                };

            vm.offerGridOptions = angular.extend(gridOptions, offerGridOptions);
        }

        /**
        * Add New Row
        */
        function addDialog(ev) {
            $mdDialog.show({
                controller: 'OfferDialogController',
                controllerAs: 'vm',
                templateUrl: 'app/main/admin/offers/views/dialogs/offer-dialog.html',
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
                controller: 'OfferDialogController',
                controllerAs: 'vm',
                templateUrl: 'app/main/apps/offers/views/dialogs/add-edit/edit-dialog.html',
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