/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="../common/models.ts" />
/// <amd-dependency path="ui.bootstrap"/>

import angular = require("angular");
import Models = require("../common/models");
import io = require("socket.io-client");
import moment = require("moment");
import Messaging = require("../common/messaging");

module Client {
    interface MainWindowScope extends ng.IScope {
        env : string;
        connected : boolean;
        active : boolean;
        current_result : DisplayResult;
        order : Models.OrderRequestFromUI;

        submitOrder : () => void;
        changeActive : () => void;
    }

    class DisplayOrder {
        exchange : string;
        side : string;
        price : number;
        quantity : number;
        timeInForce : string;
        orderType : string;

        availableExchanges : string[];
        availableSides : string[];
        availableTifs : string[];
        availableOrderTypes : string[];

        private static getNames<T>(enumObject : T) {
            var names : string[] = [];
            for (var mem in enumObject) {
                if (!enumObject.hasOwnProperty(mem)) continue;
                if (parseInt(mem, 10) >= 0) {
                  names.push(enumObject[mem]);
                }
            }
            return names;
        }

        constructor() {
            this.availableExchanges = DisplayOrder.getNames(Models.Exchange);
            this.availableSides = DisplayOrder.getNames(Models.Side);
            this.availableTifs = DisplayOrder.getNames(Models.TimeInForce);
            this.availableOrderTypes = DisplayOrder.getNames(Models.OrderType);
        }
    }

    class DisplayResult {
        bidAction : string;
        askAction : string;

        bixPx : number;
        bidSz : number;
        askPx : number;
        askSz : number;

        fairValue : number;

        update = (msg : Models.TradingDecision) => {
            this.bidAction = Models.QuoteAction[msg.bidAction];
            this.askAction = Models.QuoteAction[msg.askAction];
            this.bixPx = msg.bidQuote.price;
            this.askPx = msg.askQuote.price;
            this.bidSz = msg.bidQuote.size;
            this.askSz = msg.askQuote.size;
            this.fairValue = msg.fairValue.price;
        }
    }

    var uiCtrl = ($scope : MainWindowScope, $timeout : ng.ITimeoutService, $log : ng.ILogService, socket : SocketIOClient.Socket) => {
        $scope.connected = false;
        $scope.active = false;
        $scope.current_result = new DisplayResult();

        var refresh_timer = () => {
            $timeout(refresh_timer, 250);
        };
        $timeout(refresh_timer, 250);

        socket.on("hello", (env) => {
            $scope.env = env;
            $scope.connected = true;
            $log.info("connected");
        });

        socket.on("disconnect", () => {
            $scope.connected = false;
            $log.warn("disconnected");
        });

        socket.on('active-changed', b =>
            $scope.active = b );

        socket.on(Messaging.Topics.NewTradingDecision, (d : Models.TradingDecision) =>
            $scope.current_result.update(d));

        $scope.order = new DisplayOrder();
        $scope.submitOrder = () => {
            var o = $scope.order;
            socket.emit("submit-order",
                new Models.OrderRequestFromUI(o.exchange, o.side, o.price, o.quantity, o.timeInForce, o.orderType));
        };

        $scope.changeActive = () => {
            socket.emit("active-change-request", !$scope.active);
        };

        $log.info("started client");
    };

    var mypopover = ($compile : ng.ICompileService, $templateCache : ng.ITemplateCacheService) => {
        var getTemplate = (contentType, template_url) => {
            var template = '';
            switch (contentType) {
                case 'user':
                    template = $templateCache.get(template_url);
                    break;
            }
            return template;
        };
        return {
            restrict: "A",
            link: (scope, element, attrs) => {
                var popOverContent = $compile("<div>" + getTemplate("user", attrs.popoverTemplate) + "</div>")(scope);
                var options = {
                    content: popOverContent,
                    placement: attrs.dataPlacement,
                    html: true,
                    date: scope.date
                };
                $(element).popover(options).click((e) => {
                    e.preventDefault();
                });
            }
        };
    };

    angular.module('projectApp', ['ui.bootstrap', 'orderListDirective', 'exchangesDirective'])
           .factory("socket", () => io())
           .controller('uiCtrl', uiCtrl)
           .directive('mypopover', mypopover)
}