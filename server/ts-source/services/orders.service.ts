import * as mongoose from 'mongoose';

import { UserModel } from '../model/user.model';
import { OrderModel } from '../model/order.model';

export const findForUser = async (user) => {
  console.log(user.email);
  return OrderModel.find({'user.email': user.email}).exec();
};

export const findAll = async () => {
  return OrderModel.find({});
};

export const findOne = (id) => {};

export const save = async (order) => {
  const orderToSave = new OrderModel(order);
  return await orderToSave.save();
};

export const saveOrderOnUser = (user) => {
  return UserModel.findByIdAndUpdate(user._id, {
    orders: user.orders
  }).exec();
};

export default {
  findForUser,
  findOne,
  saveOrderOnUser,
  save
};
