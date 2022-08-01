const express = require("express");
const router = express.Router();

//Middleware Functions.
const { authentication, authorization } = require("../middleware/auth");

// User Functions.
const {
  createUser,
  getUserById,
  updateUserById,
  login,
} = require("../controllers/userController");

//Product Functions.
const {
  createProduct,
  getProducts,
  getProductById,
  updateProductById,
  deleteProductById,
} = require("../controllers/productController");

//Cart Functions.
const {
  addToCart,
  updateCart,
  getUsersCart,
  deleteUsersCart,
} = require("../controllers/cartController");

//Order Functions.
const { createOrder, updateOrder } = require("../controllers/orderController");

//---------------------------- User APIs. ---------------------------------
router.post("/register", createUser);

router.post("/login", login);

router.get("/user/:userId/profile", authentication, authorization, getUserById);

router.put(
  "/user/:userId/profile",
  authentication,
  authorization,
  updateUserById
);

//------------------------- Product APIs. ---------------------------------
router.post("/products", createProduct);
router.get("/products", getProducts);
router.get("/products/:productId", getProductById);
router.put("/products/:productId", updateProductById);
router.delete("/products/:productId", deleteProductById);

//------------------------- Cart APIs. -----------------------------------
router.post("/users/:userId/cart", authentication, authorization, addToCart);

router.put("/users/:userId/cart", authentication, authorization, updateCart);

router.get("/users/:userId/cart", authentication, authorization, getUsersCart);

router.delete(
  "/users/:userId/cart",
  authentication,
  authorization,
  deleteUsersCart
);

//------------------------- Order APIs. -----------------------------------
router.post(
  "/users/:userId/orders",
  authentication,
  authorization,
  createOrder
);

router.put("/users/:userId/orders", authentication, authorization, updateOrder);

//----------------If API is Invalid OR Wrong URL-------------------------
router.all("/**", function (req, res) {
  return res
    .status(404)
    .send({ status: false, message: "Requested API is not available." });
});

module.exports = router;
