const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      lowercase: true, //Mandatory????
      required: true,
      unique: true,
      trim: true,
    },

    description: { type: String, required: true, trim: true },

    price: { type: Number, required: true, trim: true },

    currencyId: { type: String, uppercase: true, default: "INR", trim: true },

    currencyFormat: { type: String, default: "₹", trim: true },

    isFreeShipping: { type: Boolean, default: false },

    productImage: { type: String, trim: true },

    style: { type: String, trim: true },

    availableSizes: [
      {
        type: String,
        required: true,
        trim: true,
        enum: ["S", "XS", "M", "X", "L", "XXL", "XL"],
      },
    ],

    installments: { type: Number, trim: true },

    deletedAt: { type: Date, default: null },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
