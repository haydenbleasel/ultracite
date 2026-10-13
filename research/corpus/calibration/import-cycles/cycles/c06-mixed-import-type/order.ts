import type { Customer } from "./customer";

export const orderTotal = (customer: Customer, amount: number): number =>
  customer.discount ? amount * 0.9 : amount;
