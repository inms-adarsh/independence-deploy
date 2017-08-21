(function () {
    'use strict';

    angular
        .module('app.records.offers')
        .factory('OfferService', OfferService);

    /** @ngInject */
    function OfferService($firebaseArray, $firebaseObject, $q, authService, auth, msUtils, firebaseUtils, dxUtils, config) {
        var tenantId = authService.getCurrentTenant();
        // Private variables

        var service = {
            formOptions: formOptions,
            saveOffer: saveOffer,
            updateOffer: updateOffer,
            deleteOffer: deleteOffer,
            fetchOfferList: fetchOfferList
        };

        var quantityList = [{
            id: 0,
            quantity: 6
        }, {
            id: 1,
            quantity: 10
        }, {
            id: 2,
            quantity: 20
        }];

        return service;

        //////////

        /**
         * Return form Item Configuration
         * @returns {Object} Item configuration
         */
        function formOptions() {
            var formOptionsItems = {
                minColWidth: 233,
                colCount: "auto",
                labelLocation: "top",
                validationGroup: "offerData",
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
        }


        /**
         * Save form data
         * @returns {Object} Offer Form data
         */
        function saveOffer(offerObj) {
            var ref = rootRef.child('tenant-record-offers').child(tenantId);
            offerObj.user = auth.$getAuth().uid;
            if (!offerObj.date) {
                offerObj.date = new Date();
            }

            if(offerObj.expiryDate) {
                offerObj.expiryDate = offerObj.expiryDate.toString();
            }
            offerObj.date = offerObj.date.toString();
            return firebaseUtils.addData(ref, offerObj);
        }

        /**
         * Fetch offer list
         * @returns {Object} Offer data
         */
        function fetchOfferList() {
            var ref = rootRef.child('tenant-record-offers').child(tenantId).orderByChild('deactivated').equalTo(null);
            return firebaseUtils.fetchList(ref);
        }

        /**
         * Fetch offer list
         * @returns {Object} Offer data
         */
        function updateOffer(key, offerData) {
            var ref = rootRef.child('tenant-record-offers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, offerData);
        }

        /**
         * Delete Offer
         * @returns {Object} offer data
         */
        function deleteOffer(key) {
            var ref = rootRef.child('tenant-record-offers').child(tenantId).child(key['$id']);
            return firebaseUtils.updateData(ref, { deactivated: false });
        }

    }
}());