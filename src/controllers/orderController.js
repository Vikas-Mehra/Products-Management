const userModel = require("../models/userModel");
const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");

const {
  isValid,
  isValidRequestBody,
  isValidObjectId,
} = require("../util/validator");

//-------------------------------------------------------------------------
//              1. API - POST /users/:userId/orders
//                 (Create an order for the user.)
//-------------------------------------------------------------------------

const createOrder = async (req, res) => {
  //- Get cart details in the request body.
  try {
    console.log("Create Order");

    const userIdParams = req.params.userId.trim();

    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `userId in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    //- Get cart details in the request body
    if (!isValidRequestBody(req.body)) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }

    const { cancellable } = req.body;

    if (cancellable) {
      if (!isValid(cancellable)) {
        return res
          .status(400)
          .send({ status: false, message: "<cancellable>. can't be Empty." });
      }
      //  && -> ||  ??
      if (cancellable !== "true" && cancellable !== "false") {
        return res.status(400).send({
          status: false,
          message: "<cancellable> must be either <true> or <false>.",
        });
      }
    }

    //- Make sure the user exist.
    const findUser = await userModel.findById(userIdParams);
    if (!findUser) {
      return res.status(404).send({
        status: false,
        message: `USER with ID: <${userIdParams}> NOT Found in Database.`,
      });
    }

    // Place Order.
    findCart = await cartModel
      .findOne({ userId: userIdParams })
      .select({ updatedAt: 0, createdAt: 0, __v: 0, _id: 0 })
      .lean();
    if (!findCart) {
      return res.status(404).send({
        status: false,
        message: `CART having userId: <${userIdParams}> NOT Found in Database.`,
      });
    }
    // ERROR: IF No Products in Cart i.e. Cart Empty.
    if (findCart.items.length == 0)
      return res
        .status(400) // 404 ?????????
        .send({
          status: false,
          message: "Cart Empty: Add product(s) to Cart to create order.",
        });

    const totalQuantity = findCart.items.reduce((x, y) => {
      return (x += y.quantity);
    }, 0);

    // console.log(findCart);
    console.log("\n totalQuantity:  " + totalQuantity);

    let orderData = { ...findCart, cancellable, totalQuantity };
    // console.log(orderData);
    // return res.send({ msg: "OK" });

    //- **On success** - Return HTTP status 200. Also return the order document.
    const createOrder = await orderModel.create(orderData);

    res.status(201).send({
      status: true,
      message: "Order Created Successfully.",
      data: createOrder,
    });

    // Empty cart after creating Order.
    const emptyCart = await cartModel.findOneAndUpdate(
      { userId: userIdParams },
      { items: [], totalItems: 0, totalPrice: 0 },
      { new: true }
    );
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//              2. API - PUT /users/:userId/orders
//                  (Updates an order status.)
//-------------------------------------------------------------------------

const updateOrder = async (req, res) => {
  //- Make sure that only a cancellable order could be canceled. Else send an appropriate error message and response.
  try {
    console.log("Update Order");

    const userIdParams = req.params.userId.trim();
    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `userId in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    if (!isValidRequestBody(req.body)) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }

    //- Get order id in request body.
    const { orderId } = req.body;

    // if (cancellable) {}
    if (!isValid(orderId)) {
      return res
        .status(400)
        .send({ status: false, message: "<orderId> required." });
    }
    if (!isValidObjectId(orderId)) {
      return res.status(400).send({
        status: false,
        message: `orderId: <${orderId}> NOT a Valid Mongoose Object ID.`,
      });
    }

    //- Make sure the user exist.
    const findUser = await userModel.findById(userIdParams);
    if (!findUser) {
      return res.status(404).send({
        status: false,
        message: `USER with ID: <${userIdParams}> NOT Found in Database.`,
      });
    }

    //- Make sure the order belongs to the user.
    const findOrder = await orderModel.findOne({
      _id: orderId,
      userId: userIdParams,
    });
    if (!findOrder) {
      return res.status(404).send({
        status: false,
        message: `userId: <${userIdParams}> has not created any Order with orderId : <${orderId}> (Order Not found in Database).`,
      });
    }

    //- Make sure that only a cancellable order could be canceled. Else send an appropriate error message and response.
    if (findOrder.cancellable === "false" || findOrder.cancellable === false) {
      return res.status(400).send({
        status: false,
        message: `Can't cancel Order as <cancellable>: 'false'.`,
      });
    }
    if (findOrder.status == "cancelled") {
      return res.status(400).send({
        status: false,
        message: `Order already cancelled (as <status>: 'cancelled').`,
      });
    }

    // const updatedOrder = await orderModel.findOneAndUpdate({ _id: orderId }, { status: status }, { new: true })

    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { status: "cancelled" },
      { new: true }
    );

    //- **On success** - Return HTTP status 200. Also return the updated order document.
    return res.status(200).send({
      status: true,
      message: "Order Updated Successfully.",
      data: updatedOrder,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  updateOrder,
};
