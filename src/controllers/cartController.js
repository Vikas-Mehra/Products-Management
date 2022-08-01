const userModel = require("../models/userModel");
const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");

const {
  isValid,
  isValidRequestBody,
  isValidObjectId,
} = require("../util/validator");

//-------------------------------------------------------------------------
//              1. API - POST /users/:userId/cart (Add to cart)
//-------------------------------------------------------------------------

const addToCart = async (req, res) => {
  try {
    console.log("Add To Cart");

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

    if (!isValidRequestBody(req.body)) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }

    //- Get cart id in request body.
    //- Get productId in request body.
    let { cartId, productId } = req.body;

    // Cart ID. -> NOT MAndatory????????????
    let findCart;

    // if (cartId) {
    if (typeof cartId !== "undefined") {
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
      //   findCart = await cartModel.findOne({ _id: cartId, userId: userIdParams });
      findCart = await cartModel.findOne({
        _id: cartId,
        userId: userIdParams,
      }); // Added userId: userIdParams -> Test again.
      if (!findCart) {
        return res.status(404).send({
          status: false,
          message: `CART with ID: <${cartId}> of USER: <${userIdParams}> NOT Found in Database.`,
        });
      }
    }
    // }
    // IF cartId NOT in REquest-Body.   ~~~~~~~~~~~~~~~~~~~!!!!!!!!!!!!!!!!!!!
    else {
      findCart = await cartModel.findOne({ userId: userIdParams });
      if (findCart) {
        cartId = findCart._id;
      }
    }

    // Product ID.
    if (!isValid(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "<productId> is required." });
    }
    if (!isValidObjectId(productId)) {
      // postman- Number -> ERROR!!!!!!!!!
      return res.status(400).send({
        status: false,
        message: `productId: <${productId}> NOT a Valid Mongoose Object ID.`,
      });
    }
    //- Make sure the product(s) are valid and not deleted.!!!!!!!!!!!!!!
    const findProduct = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!findProduct) {
      return res.status(404).send({
        status: false,
        message: `PRODUCT with ID: <${productId}> NOT Found in Database.`,
      });
    }

    //- Add a product(s) for a user in the cart.
    if (findCart) {
      // IF <productId> already in Cart.
      const isProductAlready = findCart.items.filter(
        (x) => x.productId.toString() === productId
      );

      if (isProductAlready.length > 0) {
        // Update Product in Cart.
        const addProduct = await cartModel.findOneAndUpdate(
          {
            userId: userIdParams,
            "items.productId": productId,
          },
          {
            $inc: {
              "items.$.quantity": 1,
              totalPrice: findProduct.price,
            },
          },
          { new: true }
        );
        // totalItems: 1, --> in $inc: !!

        return res.status(200).send({
          status: true,
          message: "Added product (Increased Quantity) in cart successfully.",
          data: addProduct,
        });
      }

      // ELSE. -> Create Product in Cart.
      const createProduct = await cartModel.findOneAndUpdate(
        { _id: cartId },
        {
          $push: { items: { productId: productId, quantity: 1 } },
          $inc: { totalItems: 1, totalPrice: findProduct.price },
        },
        { new: true }
      );

      // 201 ???????????!!!!!!!!!!!!!!!!!!!!!!!!!
      return res.status(200).send({
        status: true,
        message: "Added product (Created) in cart successfully.",
        data: createProduct,
      });
    }

    //- Create a cart for the user if it does not exist. Else add product<(s)> in cart.
    const cart = {
      userId: userIdParams,
      items: [{ productId: productId, quantity: 1 }],
      totalItems: 1,
      totalPrice: findProduct.price,
    };
    const createCart = await cartModel.create(cart);

    //- Get product(s) details in response body. !!!!!!!!!!!
    return res.status(201).send({
      status: true,
      message: "User Cart Created Successfully.",
      data: createCart,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//              2. API - PUT /users/:userId/cart
//    (Remove product / Reduce a product's quantity from the cart)
//-------------------------------------------------------------------------

//- Updates a cart by either decrementing the quantity of a product by 1 or deleting a product from the cart.

const updateCart = async (req, res) => {
  // - Get product(s) details in response body.
  try {
    console.log("Update Cart");

    const userIdParams = req.params.userId.trim();

    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `userId in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    //- Get cart id in request body.
    //- Get productId in request body.
    // - Get key 'removeProduct' in request body.
    let { cartId, productId, removeProduct } = req.body;

    // - Make sure the userId in params and in JWT token match.

    // Cart ID.  ?????????????---  Mandatory ---????????
    if (!isValid(cartId)) {
      return res
        .status(400)
        .send({ status: false, message: "<cartId> is required." });
    }
    if (!isValidObjectId(cartId)) {
      // postman- Number -> ERROR!!!!!!!!!
      return res.status(400).send({
        status: false,
        message: `cartId: <${cartId}> NOT a Valid Mongoose Object ID.`,
      });
    }

    // Product ID.
    if (!isValid(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "<productId> is required." });
    }
    if (!isValidObjectId(productId)) {
      // postman- Number -> ERROR!!!!!!!!!
      return res.status(400).send({
        status: false,
        message: `productId: <${productId}> NOT a Valid Mongoose Object ID.`,
      });
    }

    // removeProduct.
    if (!isValid(removeProduct)) {
      return res
        .status(400)
        .send({ status: false, message: "<removeProduct> is required." });
    }
    if (!/^[0-1]$/.test(removeProduct)) {
      return res.status(400).send({
        status: false,
        message: "<removeProduct> can ONLY be <0> or <1>.",
      });
    }

    // - Make sure the user exist
    const findUser = await userModel.findById(userIdParams);
    if (!findUser) {
      return res.status(404).send({
        status: false,
        message: `USER with ID: <${userIdParams}> NOT Found in Database.`,
      });
    }

    //- Make sure that cart exist.
    findCart = await cartModel.findOne({ _id: cartId, userId: userIdParams });
    if (!findCart) {
      return res.status(404).send({
        status: false,
        message: `CART with ID: <${cartId}> of USER: <${userIdParams}> NOT Found in Database.`,
      });
    }
    if (findCart.items.length === 0) {
      return res.status(404).send({
        status: false,
        message: ` NO Products in CART with ID: <${cartId}>.`,
      });
    }

    //- Make sure the product(s) are valid and not deleted.
    const findProduct = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!findProduct) {
      return res.status(404).send({
        status: false,
        message: `PRODUCT with ID: <${productId}> NOT Found in Database( or Deleted).`,
      });
    }

    // - Check if the productId exists and is not deleted before updating the cart.
    const findProductInCart = await cartModel.findOne({
      userId: userIdParams,
      "items.productId": productId,
    });
    if (!findProductInCart) {
      return res.status(404).send({
        status: false,
        message: `PRODUCT with ID: <${productId}> NOT Found in User's CART.`,
      });
    }

    // Find Quantity of Product in Cart.
    const productInCart = findProductInCart.items.filter(
      (x) => x.productId == productId
    );

    //******** */
    // - Get product(s) details in response body.
    //******** */

    // - Key 'removeProduct' denotes whether a product is to be removed({removeProduct: 0}) or its quantity has to be decremented by 1({removeProduct: 1}).

    //**On success** - Return HTTP status 200. Also return the updated cart document.

    // <0> -> Remove Product.
    if (removeProduct == 0) {
      const removeProductInCart = await cartModel.findOneAndUpdate(
        {
          _id: cartId,
          "items.productId": productId,
        },
        {
          $pull: { items: { productId: productId } },
          $inc: {
            totalItems: -1,
            totalPrice: -findProduct.price * productInCart[0].quantity,
          },
        },
        { new: true }
      );
      // totalItems: -productInCart[0].quantity,

      return res.status(200).send({
        status: true,
        messsage: "item removed successfully.",
        data: removeProductInCart,
      });
    }

    // <1> -> Reduce Quantity of Product.
    else if (removeProduct == 1) {
      // IF Product Quantity === 1 -> Remove Product.
      if (productInCart[0].quantity === 1) {
        // return res.status(400).send({
        //   status: false,
        //   messsage: "Product Qantity is <0> in cart. Can't removeProduct(1).",
        // });

        const removeProductInCart = await cartModel.findOneAndUpdate(
          {
            _id: cartId,
            "items.productId": productId,
          },
          {
            $pull: { items: { productId: productId } },
            $inc: {
              totalItems: -1,
              totalPrice: -findProduct.price * productInCart[0].quantity,
            },
          },
          { new: true }
        );
        // totalItems: -productInCart[0].quantity,

        return res.status(200).send({
          status: true,
          messsage: "item removed successfully.",
          data: removeProductInCart,
        });
      }
      // ELSE-IF Product Quantity > 1 -> Reduce.
      const reduceProductInCart = await cartModel.findOneAndUpdate(
        {
          _id: cartId,
          "items.productId": productId,
        },
        {
          $inc: {
            "items.$.quantity": -1,
            totalPrice: -findProduct.price,
          },
        },
        { new: true }
      );
      // totalItems: -1,

      return res.status(200).send({
        status: true,
        messsage: "item removed (reduce quantity by 1) successfully.",
        data: reduceProductInCart,
      });
    }

    // NOT <1 & 0> -> Show ERROR.  >>>>>>>>>> not required???
    else {
      return res.status(400).send({
        status: false,
        messsage: "ELSE: took neither <0> nor <1>.",
      });
    }

    // return res.status(200).send({
    //   status: true,
    //   message: "Cart Updated.",
    //   data: "updateCart",
    // });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//              3. API - GET /users/:userId/cart
//             (Returns cart summary of the user.)
//-------------------------------------------------------------------------

const getUsersCart = async (req, res) => {
  try {
    console.log("Get Cart");

    const userIdParams = req.params.userId.trim();

    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `userId in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    // - Make sure the user exist.
    const findUser = await userModel.findById(userIdParams); // isDeleted: false -> Check ????

    if (!findUser) {
      return res.status(404).send({
        status: false,
        message: `USER with ID: <${userIdParams}> NOT Found in Database.`,
      });
    }

    // Make sure that cart exist.
    findCart = await cartModel
      .findOne({
        userId: userIdParams,
      })
      .populate("items.productId"); //Populate or Not???

    if (!findCart) {
      return res.status(404).send({
        status: false,
        message: `CART with userID: <${userIdParams}> NOT Found in Database.`,
      });
    }

    // - Get product(s) details in response body.   !!!!!!!!!!
    return res.status(200).send({
      status: true,
      message: "User's Cart details.",
      data: findCart,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//              4. API - DELETE /users/:userId/cart
//-------------------------------------------------------------------------

const deleteUsersCart = async (req, res) => {
  try {
    console.log("Delete Cart");

    const userIdParams = req.params.userId.trim();

    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `userId in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    // - Make sure the user exist.
    const findUser = await userModel.findById(userIdParams);
    if (!findUser) {
      return res.status(404).send({
        status: false,
        message: `USER with ID: <${userIdParams}> NOT Found in Database.`,
      });
    }

    // Make sure that cart exist.
    findCart = await cartModel.findOne({
      userId: userIdParams,
    });
    if (!findCart) {
      return res.status(404).send({
        status: false,
        message: `CART with userID: <${userIdParams}> NOT Found in Database.`,
      });
    }

    //- cart deleting means array of items is empty, totalItems is 0, totalPrice is 0.
    const deleteCart = await cartModel.findOneAndUpdate(
      { userId: userIdParams },
      { items: [], totalItems: 0, totalPrice: 0 },
      { new: true }
    );

    //- **On success** - Return HTTP status 204. Return a suitable message.
    return res.status(204).send({
      status: true,
      message: "Cart Deleted.",
      data: deleteCart, // Send Data ?????????
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = {
  addToCart,
  getUsersCart,
  deleteUsersCart,
  updateCart,
};
