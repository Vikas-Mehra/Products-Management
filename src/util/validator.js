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

const isValidObjectId = function (objectId) {
  return mongoose.Types.ObjectId.isValid(objectId);
};

const isValidName = function (name) {
  return /^[a-zA-Z ]*$/.test(name);
};

const isValidPhone = function (phone) {
  return /^[6-9]\d{9}$/.test(phone);
};

const isValidPassword = function (password) {
  return password.length >= 1 && password.length <= 15;
};

const isValidStreet = function (street) {
  return /^[a-zA-Z0-9\/\-\,\.\(\) ]*$/.test(street); //Change message in controller.!!!!
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
let isValidPrice = function (price) {
  return /^[1-9][0-9]{0,7}(\.[0-9]{2})?$/.test(price);
  // return /^\d{0,8}[.]?\d{1,4}$/.test(price)
  // return /^[+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/.test(price);
  // return /^\d{0,8}(\.\d{1,2})?$/.test(price);
  // return /^\d{0,8}(\.\d{1,4})?$/.test(price);
  // return /^\d{0,8}[.]?\d{1,2}$/.test(price);
};

let isValidInstallment = function (value) {
  return /\b([1-9]|[1-9][0-9])\b/.test(value); // 1-99 Number. /b = boundary.
  // return /^\d*$/.test(value); // Only 2-digit Number.
};

//file should be image only.
const isValidImage = function (data) {
  return /image\/png|image\/jpeg|image\/jpg/.test(data);
};

// <Title> of Product can be anything???????????
let isValidTitle = function (title) {
  return /^[a-zA-Z0-9 ]*[/./,/(/)/&/*/!]*$/.test(title);
};

//-----------------------------------------------------------------------
//-----------------------------------------------------------------------

let titleValidator = function (name) {
  let regx = /^[a-zA-z0-9$!]+([\s][a-zA-Z0-9$!\,]+)*$/;
  return regx.test(name);
};

let numberValidation = function validatePrice(price) {
  var re = /^[0-9]$/;
  return re.test(price);
};

let isValidEnum = (enm) => {
  var uniqueEnums = [...new Set(enm)];
  const enumList = ["S", "XS", "M", "X", "L", "XXL", "XL"];
  return (
    enm.length === uniqueEnums.length && enm.every((e) => enumList.includes(e))
  );
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
  isValidTitle,
  isValidPrice,
  isValidInstallment,
  isValidImage,
};
