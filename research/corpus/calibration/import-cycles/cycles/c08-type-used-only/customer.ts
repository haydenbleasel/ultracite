import { orderTotal } from "./order";

export interface Customer {
  discount: boolean;
}

export const quote = (customer: Customer): number => orderTotal(customer, 100);
