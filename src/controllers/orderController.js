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
  try {
    const userIdParams = req.params.userId.trim();
    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `userId in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
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

    //- Get cart details in the request body
    if (!isValidRequestBody(req.body)) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }

    // <cartId> Mandatory.
    // <cancellable> default(true).
    const { cartId, cancellable } = req.body;

    // <cartId> Validations.
    if (!isValid(cartId)) {
      return res
        .status(400)
        .send({ status: false, message: "<cartId> is required." });
    }
    if (!isValidObjectId(cartId)) {
      return res.status(400).send({
        status: false,
        message: `cartId: <${cartId}> NOT a Valid Mongoose Object ID.`,
      });
    }

    //- Make sure that cart exist.
    findCart = await cartModel
      .findOne({ _id: cartId, userId: userIdParams })
      .select({ updatedAt: 0, createdAt: 0, __v: 0, _id: 0 })
      .lean();

    // If cart not found.
    if (!findCart) {
      return res.status(404).send({
        status: false,
        message: `CART with ID: <${cartId}> of USER: <${userIdParams}> NOT Found in Database.`,
      });
    }
    // Send ERROR: IF No Products in Cart i.e. Cart Empty.
    if (findCart.items.length == 0) {
      return res.status(400).send({
        status: false,
        message: "Cart Empty: Add product(s) to Cart to create order.",
      });
    }
    // Find Tota-Quantity of Items in Cart.
    const totalQuantity = findCart.items.reduce((x, y) => {
      return (x += y.quantity);
    }, 0);

    if (cancellable) {
      if (!isValid(cancellable)) {
        return res
          .status(400)
          .send({ status: false, message: "<cancellable>. can't be Empty." });
      }
      if (cancellable !== "true" && cancellable !== "false") {
        return res.status(400).send({
          status: false,
          message: "<cancellable> must be either <true> or <false>.",
        });
      }
    }

    // Initialise <orderData> with Order Details.
    let orderData = { ...findCart, cancellable, totalQuantity };
    console.log("\n orderData \n", orderData);

    // Place Order.
    //- **On success** - Return HTTP status 200. Also return the order document.
    const createOrder = await orderModel.create(orderData);

    // message: "Order Created Successfully.",
    res.status(201).send({
      status: true,
      message: "Success",
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
  try {
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
    const { orderId, status } = req.body;

    // <orderId> Validations.
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

    // <status> can only be either <cancelled> or <completed>.
    if (!isValid(status)) {
      return res
        .status(400)
        .send({ status: false, message: "<status> required." });
    }
    if (status != "cancelled" && status != "completed") {
      return res.status(400).send({
        status: false,
        message: "<status> can be either <cancelled> or <completed> only.",
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
        message: `userId: <${userIdParams}> has not created any Order with orderId : <${orderId}> (OR Order Not found in Database).`,
      });
    }

    //- Make sure that only a cancellable order could be canceled. Else send an appropriate error message and response.
    if (findOrder.cancellable === "false" || findOrder.cancellable === false) {
      if (status == "cancelled") {
        return res.status(400).send({
          status: false,
          message: `Can't cancel Order as <cancellable>: 'false'.`,
        });
      }
    }

    // <status> in Document in Database.
    if (findOrder.status == "cancelled") {
      return res.status(400).send({
        status: false,
        message: `Order already cancelled (as <status>: 'cancelled').`,
      });
    }
    if (findOrder.status == "completed") {
      return res.status(400).send({
        status: false,
        message: `Order already completed (as <status>: 'completed').`,
      });
    }

    let updatedOrder;

    if (status == "cancelled") {
      updatedOrder = await orderModel.findByIdAndUpdate(
        orderId,
        { status: "cancelled" },
        { new: true }
      );
    }

    if (status == "completed") {
      updatedOrder = await orderModel.findByIdAndUpdate(
        orderId,
        { status: "completed" },
        { new: true }
      );
    }

    //- **On success** - Return HTTP status 200. Also return the updated order document.
    // message: "Order Updated Successfully.",
    return res.status(200).send({
      status: true,
      message: "Success",
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
