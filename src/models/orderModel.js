const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const orderSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true, trim: true },

    items: [
      {
        productId: { type: ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        // _id: false,
      },
    ],

    totalPrice: { type: Number, required: true, trim: true }, //Holds total price of all the items in the cart.

    totalItems: { type: Number, required: true, trim: true }, //Holds total no. of items in the cart.

    totalQuantity: { type: Number, required: true, trim: true }, //Holds total no. of quantity in the cart."

    cancellable: { type: Boolean, default: true },

    status: {
      type: String,
      default: "pending",
      trim: true,
      enum: ["pending", "completed", "cancelled"],
    },

    deletedAt: { type: Date },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
