const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { isEmail } = require("validator");

const userModel = require("../models/userModel");
const { uploadFile } = require("../util/aws");

const {
  isValid,
  isValidRequestBody,
  isValidName,
  isValidPhone,
  isValidPassword,
  isValidPincode,
  isValidStreet,
  isValidCity,
  isValidObjectId,
  isValidImage,
} = require("../util/validator");

//-------------------------------------------------------------------------
//                1. API - POST /register
//-------------------------------------------------------------------------

const createUser = async function (req, res) {
  try {
    let data = req.body;
    let files = req.files;

    if (!isValidRequestBody(data)) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }

    // Destructuring Request-Body.
    const { fname, lname, email, phone, password } = data;

    //<fname> Validayions.
    if (!isValid(fname)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <fname>.",
      });
    }
    if (!isValidName(fname)) {
      return res.status(400).send({
        status: false,
        message: "<fname> should be Alphabets & Whitespace's Only.",
      });
    }

    //<lname> Validayions.
    if (!isValid(lname)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <lname>.",
      });
    }
    if (!isValidName(lname)) {
      return res.status(400).send({
        status: false,
        message: "<lname> should be Alphabets & Whitespace's Only.",
      });
    }

    //<email> Validayions.
    if (!isValid(email)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <email>.",
      });
    }
    if (!isEmail(email)) {
      return res.status(400).send({
        status: false,
        message: "<email> Format Invalid.",
      });
    }
    const emailExist = await userModel.findOne({
      email: email,
    });
    if (emailExist) {
      return res.status(400).send({
        status: false,
        message: "<email> already registered.",
      });
    }

    //<phone> Validayions.
    if (!isValid(phone)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <phone>.",
      });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).send({
        status: false,
        message:
          "<phone> should be an Indian Number ONLY (start with <6,7,8 or 9> and 10-Digits).",
      });
    }
    const phoneExist = await userModel.findOne({
      phone: phone,
    });
    if (phoneExist) {
      return res.status(400).send({
        status: false,
        message: "<phone> number already registered.",
      });
    }

    //<password> Validayions.
    if (!isValid(password)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <password>.",
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).send({
        status: false,
        message: "<password> must be between 8 and 15 characters.",
      });
    }
    // <password> Encryption.
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(password, salt);

    //------------------------------- Address Validations. --------------------
    if (!isValid(data.address)) {
      return res.status(400).send({
        status: false,
        message: "<address> is required.",
      });
    }
    if (
      data.address[0] != "{" ||
      data.address[data.address.length - 1] != "}"
    ) {
      return res.status(400).send({
        status: false,
        message: "Address must be a valid <object> type only.",
      });
    }

    let address; //  For converting <address> in Form-data To JavaScript Object.
    try {
      address = JSON.parse(data.address); //  For converting <address> in Form-data To JavaScript Object.
    } catch (error) {
      return res.status(400).send({
        status: false,
        message: "Invalid <address> format(Invalid Characters in <address>).",
      });
    }

    if (!isValidRequestBody(address)) {
      return res.status(400).json({
        status: false,
        message:
          "<address> Empty. Please enter both <shipping> & <billing> address.",
      });
    }

    if (!isValid(address.shipping)) {
      return res.status(400).send({
        status: false,
        message: "<shipping> address required.",
      });
    }
    if (typeof address.shipping != "object") {
      return res.status(400).send({
        status: false,
        message: "<shipping> address must be an <object> type.",
      });
    }
    if (!isValidRequestBody(address.shipping)) {
      return res.status(400).send({
        status: false,
        message: "<shipping> address is an Empty Object.",
      });
    }

    if (!isValid(address.billing)) {
      return res.status(400).send({
        status: false,
        message: "<billing> address required.",
      });
    }
    if (typeof address.billing != "object") {
      return res.status(400).send({
        status: false,
        message: "<billing> address must be an <object> type.",
      });
    }
    if (!isValidRequestBody(address.billing)) {
      return res.status(400).send({
        status: false,
        message: "<billing> address is an Empty Object.",
      });
    }

    if (
      !isValid(address.shipping.street) ||
      !isValidStreet(address.shipping.street)
    ) {
      return res.status(400).send({
        status: false,
        message:
          "Shipping <street> required (Alphabets, Hyphen(-), Forward-slash(/), Comma(,), Fullstop(.), Parenthesis(), Numbers & White-space(s) ONLY).",
      });
    }

    if (
      !isValid(address.shipping.city) ||
      !isValidCity(address.shipping.city)
    ) {
      return res.status(400).send({
        status: false,
        message:
          "Shipping <city> required (Alphabets, Hyphen(-) & White-space(s) ONLY)",
      });
    }

    if (
      !isValid(address.shipping.pincode) ||
      !isValidPincode(address.shipping.pincode)
    ) {
      return res.status(400).send({
        status: false,
        message:
          "Shipping <pincode> required (Indian Pincode - start with <1> and 6-Digits).",
      });
    }

    if (
      !isValid(address.billing.street) ||
      !isValidStreet(address.billing.street)
    ) {
      return res.status(400).send({
        status: false,
        message:
          "Billing <street> required (Alphabets, Hyphen(-), Forward-slash(/), Comma(,), Fullstop(.), Parenthesis(), Numbers & White-space(s) ONLY).",
      });
    }

    if (!isValid(address.billing.city) || !isValidCity(address.billing.city)) {
      return res.status(400).send({
        status: false,
        message:
          "Billing <city> required (Alphabets, Hyphen(-) & White-space(s) ONLY)",
      });
    }

    if (
      !isValid(address.billing.pincode) ||
      !isValidPincode(address.billing.pincode)
    ) {
      return res.status(400).send({
        status: false,
        message:
          "Billing <pincode> required (Indian Pincode - start with <1> and 6-Digits).",
      });
    }

    data.address = address;

    // Upload Image.
    if (files && files.length > 0) {
      // Upload to S3 and get the uploaded link.
      let uploadedFileURL = await uploadFile(files[0]);
      data.profileImage = uploadedFileURL;
    } else {
      return res.status(400).send({
        message: "<Profile Image> is required.",
      });
    }

    let savedData = await userModel.create(data);
    return res.status(201).send({
      status: true,
      message: "User Profile created successfully.",
      data: savedData,
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: error.message,
    });
  }
};

//-------------------------------------------------------------------------
//                        2. API - POST /login
//-------------------------------------------------------------------------

const login = async function (req, res) {
  try {
    if (!isValidRequestBody(req.body)) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }

    const { email, password } = req.body;

    // <email> Validations.
    if (!isValid(email)) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide <email>." });
    }
    if (!isEmail(email)) {
      return res
        .status(400)
        .send({ status: false, message: "<email> Format Invalid." });
    }

    // <password> Validations.
    if (!isValid(password)) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide <password>." });
    }
    if (!isValidPassword(password)) {
      return res.status(400).send({
        status: false,
        message: "<password> must be between 8 and 15 characters.",
      });
    }

    // Check if user Exist.
    let findUser = await userModel.findOne({ email });
    if (!findUser) {
      return res.status(404).send({
        status: false,
        message: `User having email: <${email}> Not Found.`,
      });
    }

    // Decrypt Password and match with password in Database.
    let decryptedPassword = await bcrypt.compare(password, findUser.password);
    if (!decryptedPassword)
      return res.status(401).send({
        status: false,
        message: "Invalid Credentials (Incorrect Password).",
      });

    // Create JWT Token.
    let token = jwt.sign(
      { userId: findUser._id },
      "This-is-a-Secret-Key-for-Login(!@#$%^&*(</>)))",
      {
        expiresIn: "24h", // 24 Hours.
      }
    );

    // Data to be sent as response.
    const userData = {
      userId: findUser._id,
      token: token,
    };

    // Send Response.
    return res.status(200).send({
      status: true,
      message: "User logged-in successfully.",
      data: userData,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//                      3. API - GET /user/:userId/profile
//              (Allow an user to fetch details of their profile.)
//-------------------------------------------------------------------------

const getUserById = async (req, res) => {
  try {
    const userIdParams = req.params.userId.trim();
    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `<userId> in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    // Check if user Exist.
    const findUser = await userModel.findById(userIdParams);
    if (!findUser) {
      return res
        .status(404)
        .send({ status: false, message: "User NOT Found." });
    }

    // Send User-Profile in response.
    return res.status(200).send({
      status: true,
      message: "Fetched User profile details.",
      data: findUser,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//                4. API - PUT /user/:userId/profile
//-------------------------------------------------------------------------
const updateUserById = async (req, res) => {
  try {
    const userIdParams = req.params.userId.trim();
    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `<userId> in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }
    // Check if USER present in Database.
    let userExist = await userModel.findById(userIdParams); // <userExist> will be used in updating also.
    if (!userExist) {
      return res.status(404).send({
        status: false,
        message: `User with ID <${userIdParams}> NOT Found.`,
      });
    }

    let body = req.body;
    const file = req.files;

    if (!isValidRequestBody(body)) {
      if (!file) {
        return res
          .status(400)
          .send({ status: false, message: "Request Body Empty." });
      }
      if (file && typeof file[0] == "undefined") {
        return res.status(400).send({
          status: false,
          message: "Please provide Image-file to upload.",
        });
      }
    }

    const { fname, lname, email, phone, password } = body;

    //------------------- Validations. --------------------
    //<fname> Validation.
    if (typeof fname != "undefined") {
      if (!isValid(fname)) {
        return res
          .status(400)
          .send({ status: false, message: "Please provide <fname>." });
      }
      if (!isValidName(fname)) {
        return res.status(400).send({
          status: false,
          message: "<fname> Invalid (Alphabets & Whitespace's Only).",
        });
      }
    }

    //  lname Validation.
    if (typeof lname != "undefined") {
      if (!isValid(lname)) {
        return res
          .status(400)
          .send({ status: false, message: "Please provide <lname>." });
      }
      if (!isValidName(lname)) {
        return res.status(400).send({
          status: false,
          message: "<lname> Invalid (Alphabets & Whitespace's Only).",
        });
      }
    }

    // <email> Validation.
    if (typeof email != "undefined") {
      if (!isValid(email)) {
        return res.status(400).send({
          status: false,
          message: "Please provide <email>.",
        });
      }
      // Check <email> Format.
      if (!isEmail(email)) {
        return res
          .status(400)
          .send({ status: false, message: "<email> Format Invalid." });
      }
      // Unique - <email> Validation (DB-Call).
      const emailAlreadyExist = await userModel.findOne({ email });
      if (emailAlreadyExist) {
        return res
          .status(409)
          .send({ status: false, message: "<email> already registered." });
      }
    }

    // <phone> Validation.
    if (typeof phone != "undefined") {
      if (!isValid(phone)) {
        return res.status(400).send({
          status: false,
          message: "Please provide <phone>.",
        });
      }
      if (!isValidPhone(phone)) {
        return res.status(400).send({
          status: false,
          message:
            "<phone> should be an Indian Number ONLY (start with <6,7,8 or 9> and 10-Digits).",
        });
      }
      // Unique - <phone> Validation (DB-Call).
      const phoneAlreadyExist = await userModel.findOne({ phone });
      if (phoneAlreadyExist) {
        return res
          .status(409)
          .send({ status: false, message: "<phone> already registered." });
      }
    }

    // <password> Validations.
    if (typeof password != "undefined") {
      if (!isValid(password)) {
        return res.status(400).send({
          status: false,
          message: "Please provide <password>.",
        });
      }
      if (!isValidPassword(password)) {
        return res.status(400).send({
          status: false,
          message: "<password> must be between 8 and 15 characters.",
        });
      }
      // Encrypt <password>.
      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
    }

    //------------------------------- Address Validations. --------------------
    if (typeof body.address != "undefined") {
      if (!isValid(body.address)) {
        return res.status(400).send({
          status: false,
          message: "<address> is empty.",
        });
      }
      if (
        body.address[0] != "{" ||
        body.address[body.address.length - 1] != "}"
      ) {
        return res.status(400).send({
          status: false,
          message: "Address must be a valid <object> type only.",
        });
      }

      let address; //  For converting <address> in Form-data To JavaScript Object.
      try {
        address = JSON.parse(body.address); //  For converting <address> in Form-data To JavaScript Object.
      } catch (error) {
        return res.status(400).send({
          status: false,
          message: "Invalid <address> format(Invalid Characters in <address>).",
        });
      }

      if (!isValidRequestBody(address)) {
        return res.status(400).json({
          status: false,
          message: "<address> Empty.",
        });
      }

      const { shipping, billing } = address;

      if (typeof shipping == "undefined" && typeof billing == "undefined") {
        return res.status(400).json({
          status: false,
          message: "Please enter <shipping> &/or <billing> address to Update.",
        });
      }

      // Update <shipping> Address.
      if (typeof shipping != "undefined") {
        const { street, city, pincode } = shipping;

        if (!isValid(shipping)) {
          return res.status(400).send({
            status: false,
            message: "<shipping> address empty.",
          });
        }
        if (typeof shipping != "object") {
          return res.status(400).send({
            status: false,
            message: "<shipping> address must be an <object> type.",
          });
        }
        if (!isValidRequestBody(shipping)) {
          return res.status(400).send({
            status: false,
            message: "<shipping> address is an Empty Object.",
          });
        }

        if (
          typeof street == "undefined" &&
          typeof city == "undefined" &&
          typeof pincode == "undefined"
        ) {
          return res.status(400).json({
            status: false,
            message:
              "Invalid <shipping>: Please enter atleast one of <street>, <city> &/or <pincode> to update.",
          });
        }

        if (typeof street != "undefined") {
          if (!isValid(street) || !isValidStreet(street)) {
            return res.status(400).send({
              status: false,
              message:
                "Shipping <street> required (Alphabets, Hyphen(-), Forward-slash(/), Comma(,), Fullstop(.), Parenthesis(), Numbers & White-space(s) ONLY).",
            });
          }
          userExist.address.shipping.street = street;
        }

        if (typeof city != "undefined") {
          if (!isValid(city) || !isValidCity(city)) {
            return res.status(400).send({
              status: false,
              message:
                "Shipping <city> required (Alphabets, Hyphen(-) & White-space(s) ONLY)",
            });
          }
          userExist.address.shipping.city = city;
        }

        if (typeof pincode != "undefined") {
          if (!isValid(pincode) || !isValidPincode(pincode)) {
            return res.status(400).send({
              status: false,
              message:
                "Shipping <pincode> required (Indian Pincode - start with <1> and 6-Digits).",
            });
          }
          userExist.address.shipping.pincode = pincode;
        }
      }

      // Update <billing> Address.
      if (typeof billing != "undefined") {
        const { street, city, pincode } = billing;

        if (!isValid(billing)) {
          return res.status(400).send({
            status: false,
            message: "<billing> address empty.",
          });
        }
        if (typeof billing != "object") {
          return res.status(400).send({
            status: false,
            message: "<billing> address must be an <object> type.",
          });
        }
        if (!isValidRequestBody(billing)) {
          return res.status(400).send({
            status: false,
            message: "<billing> address is an Empty Object.",
          });
        }

        if (
          typeof street == "undefined" &&
          typeof city == "undefined" &&
          typeof pincode == "undefined"
        ) {
          return res.status(400).json({
            status: false,
            message:
              "Invalid <billing>: Please enter atleast one of <street>, <city> &/or <pincode> to update.",
          });
        }

        if (typeof street != "undefined") {
          if (!isValid(street) || !isValidStreet(street)) {
            return res.status(400).send({
              status: false,
              message:
                "Billing <street> required (Alphabets, Hyphen(-), Forward-slash(/), Comma(,), Fullstop(.), Parenthesis(), Numbers & White-space(s) ONLY).",
            });
          }
          userExist.address.billing.street = street;
        }

        if (typeof city != "undefined") {
          if (!isValid(city) || !isValidCity(city)) {
            return res.status(400).send({
              status: false,
              message:
                "Billing <city> required (Alphabets, Hyphen(-) & White-space(s) ONLY)",
            });
          }
          userExist.address.billing.city = city;
        }

        if (typeof pincode != "undefined") {
          if (!isValid(pincode) || !isValidPincode(pincode)) {
            return res.status(400).send({
              status: false,
              message:
                "Billing <pincode> required (Indian Pincode - start with <1> and 6-Digits).",
            });
          }
          userExist.address.billing.pincode = pincode;
        }
      }
      body.address = userExist.address;
    }

    // Image-file Upload if present.
    if (file && file.length > 0) {
      if (!isValidImage(file[0].mimetype)) {
        return res.status(400).send({
          status: false,
          message: "Only images can be uploaded (jpeg/jpg/png).",
        });
      }
      // Upload to S3 and get the uploaded link.
      let uploadedFileURL = await uploadFile(file[0]);
      body.profileImage = uploadedFileURL;
    }

    // Update User.
    const updateUser = await userModel.findByIdAndUpdate(userIdParams, body, {
      new: true,
    });

    return res.status(200).send({
      status: true,
      message: "User profile updated.",
      data: updateUser,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = {
  login,
  getUserById,
  updateUserById,
  createUser,
};
