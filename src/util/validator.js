const mongoose = require("mongoose");

const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  if (typeof value === "number" && value.toString().trim().length === 0)
    return false;
  return true;
};

const isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0;
};

const isValidObjectId = function (data) {
  let stringId = data.toString().toLowerCase();
  if (!mongoose.Types.ObjectId.isValid(stringId)) {
    return false;
  }
  let result = new mongoose.Types.ObjectId(stringId);
  if (result.toString() != stringId) {
    return false;
  }
  return true;
};

const isValidName = function (name) {
  return /^[a-zA-Z ]*$/.test(name);
};

const isValidPhone = function (phone) {
  return /^[6-9]\d{9}$/.test(phone);
};

const isValidPassword = function (password) {
  return password.length >= 8 && password.length <= 15;
};

const isValidStreet = function (street) {
  return /^[a-zA-Z0-9\/\-\,\.\(\) ]*$/.test(street);
};

const isValidCity = function (city) {
  return /^[a-zA-Z\- ]*$/.test(city);
};

const isValidPincode = function (pincode) {
  return /^[1-9]\d{5}$/.test(pincode);
};

const isValidSize = function (size) {
  return ["S", "XS", "M", "X", "L", "XXL", "XL"].indexOf(size) !== -1;
};

const isValidPrice = function (price) {
  return /^[1-9][0-9]{0,7}(\.[0-9]{2})?$/.test(price);
};

const isValidInstallment = function (value) {
  return /^[1-9][0-9]?$/.test(value); // 1-99 Number.
};

// File should be an image only.
const isValidImage = function (data) {
  return /image\/png|image\/jpeg|image\/jpg/.test(data);
};

module.exports = {
  isValid,
  isValidObjectId,
  isValidRequestBody,
  isValidName,
  isValidPhone,
  isValidPassword,
  isValidStreet,
  isValidPincode,
  isValidCity,
  isValidSize,
  isValidPrice,
  isValidInstallment,
  isValidImage,
};
