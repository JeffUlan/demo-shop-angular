import { Injectable, EventEmitter } from '@angular/core';
import { Order } from './model/order.model';
import { Customer } from './model/customer.model';
import { CartItem } from './cart/shared/cart-item.model';

@Injectable()
export class CheckoutService {
  private orderInProgress: Order;
  orderInProgressChanged: EventEmitter<Order> = new EventEmitter<Order>();
  stepChanged: EventEmitter<number> = new EventEmitter<number>();
  activeStep: number;

  constructor() {
    this.orderInProgress = new Order();
    this.orderInProgress.customer = new Customer();
    this.activeStep = 0;
  }

  gotoStep(number) {
    this.activeStep = number;
    this.stepChanged.emit(this.activeStep);

    console.log(this.orderInProgress);
  }

  nextStep() {
    this.activeStep++;
    this.stepChanged.emit(this.activeStep);

    console.log(this.orderInProgress);
  }

  previousStep() {
    this.activeStep--;
    this.stepChanged.emit(this.activeStep);

    console.log(this.orderInProgress);
  }

  setCustomer(customer: Customer) {
    this.orderInProgress.customer = customer;
    this.orderInProgressChanged.emit(this.orderInProgress);
  }

  setOrderItems(items: CartItem[]) {
    this.orderInProgress.items = items;
    this.orderInProgressChanged.emit(this.orderInProgress);
  }

  getOrderInProgress() {
    return this.orderInProgress;
  }
}
