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

    if (!isValid(data.fname)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <fname>.",
      });
    }
    if (!isValidName(data.fname)) {
      return res.status(400).send({
        status: false,
        message: "<fname> should be Alphabets & Whitespace's Only.",
      });
    }

    if (!isValid(data.lname)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <lname>.",
      });
    }
    if (!isValidName(data.lname)) {
      return res.status(400).send({
        status: false,
        message: "<lname> should be Alphabets & Whitespace's Only.",
      });
    }

    if (!isValid(data.email)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <email>.",
      });
    }

    if (!isEmail(data.email)) {
      return res.status(400).send({
        status: false,
        message: "<email> Format Invalid.",
      });
    }

    const emailExist = await userModel.findOne({
      email: data.email,
    });
    if (emailExist) {
      return res.status(400).send({
        status: false,
        message: "<email> already registered.",
      });
    }

    if (!isValid(data.phone)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <phone>.",
      });
    }

    if (!isValidPhone(data.phone)) {
      return res.status(400).send({
        status: false,
        message:
          "<phone> should be an Indian Number ONLY (start with <6,7,8 or 9> and 10-Digits).",
      });
    }

    const phoneExist = await userModel.findOne({
      phone: data.phone,
    });
    if (phoneExist) {
      return res.status(400).send({
        status: false,
        message: "<phone> number already registered.",
      });
    }

    if (!isValid(data.password)) {
      return res.status(400).send({
        status: false,
        message: "Please enter <password>.",
      });
    }
    if (!isValidPassword(data.password)) {
      return res.status(400).send({
        status: false,
        message: "<password> must be between 8 and 15 characters.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);

    // Address Validations. //!!!!!!!!!!!!!!!!!!!!!!!!!!
    if (!data.address) {
      return res.status(400).send({
        status: false,
        message: "Please enter <address> in Object Format.",
      });
    }

    // console.log(data.address);
    // console.log(typeof data.address);

    const address = JSON.parse(data.address); //  For converting <address> in Form-data To JavaScript Object.

    // //ADDRESS Validation(Correct Format(OBJECT) - if Present ).
    // if (typeof address === "string" || address === null || address === false) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "ADDRESS Mandatory: As an <OBJECT> Format.",
    //   });
    // }

    // const address = JSON.parse(data.address); //  For converting <address> in Form-data To JavaScript Object.

    if (address) {
      if (Object.keys(address).length === 0) {
        return res.status(400).json({
          status: false,
          message:
            "<address> Empty. Please enter both <shipping> & <billing> address.",
        });
      }
    }

    if (!isValidRequestBody(address.shipping)) {
      return res.status(400).send({
        status: false,
        message: "<shipping> address required in Object Format.",
      });
    }

    if (!isValidRequestBody(address.billing)) {
      return res.status(400).send({
        status: false,
        message: "<billing> address required in Object Format.",
      });
    }

    if (!isValidStreet(address.shipping.street)) {
      return res.status(400).send({
        status: false,
        message:
          "Shipping <street> required (Alphabets, Hyphen(-), Forward-slash(/), Comma(,), Fullstop(.), Parenthesis(), Numbers & White-space(s) ONLY).",
      });
    }

    if (!isValidCity(address.shipping.city)) {
      return res.status(400).send({
        status: false,
        message:
          "Shipping <city> required (Alphabets, Hyphen(-) & White-space(s) ONLY)",
      });
    }

    if (!isValidPincode(address.shipping.pincode)) {
      return res.status(400).send({
        status: false,
        message:
          "Shipping <pincode> required (Indian Pincode - start with <1> and 6-Digits).",
      });
    }

    if (!isValidStreet(address.billing.street)) {
      return res.status(400).send({
        status: false,
        message:
          "Billing <street> required (Alphabets, Hyphen(-), Forward-slash(/), Comma(,), Fullstop(.), Parenthesis(), Numbers & White-space(s) ONLY).",
      });
    }

    if (!isValidCity(address.billing.city)) {
      return res.status(400).send({
        status: false,
        message:
          "Billing <city> required (Alphabets, Hyphen(-) & White-space(s) ONLY)",
      });
    }

    if (!isValidPincode(address.billing.pincode)) {
      return res.status(400).send({
        status: false,
        message:
          "Billing <pincode> required (Indian Pincode - start with <1> and 6-Digits).",
      });
    }

    data.address = address;

    // Upload Image.
    if (files && files.length > 0) {
      //upload to s3 and get the uploaded link
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
//                2. API - POST /login
//-------------------------------------------------------------------------

const login = async function (req, res) {
  try {
    if (!isValidRequestBody(req.body)) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }

    const { email, password } = req.body;

    if (!isValid(email)) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide <email>." });
    }
    if (!isValid(password)) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide <password>." });
    }

    // Email Format.
    if (!isEmail(email)) {
      return res
        .status(400)
        .send({ status: false, message: "<email> Format Invalid." });
    }
    if (!isValidPassword(password)) {
      return res.status(400).send({
        status: false,
        message: "<password> must be between 8 and 15 characters.",
      });
    }

    let findUser = await userModel.findOne({ email });
    if (!findUser) {
      return res.status(404).send({
        status: false,
        message: `User having email: <${email}> Not Found.`,
      });
    }

    let decryptedPassword = await bcrypt.compare(password, findUser.password); // await with <bcrypt>??
    if (!decryptedPassword)
      return res.status(401).send({
        status: false,
        message: "Invalid Credentials (Incorrect Password).",
      });

    // let token = jwt.sign(
    //   {
    //     userId: findUser._id,
    //     iat: Math.floor(Date.now() / 1000),
    //     exp: Math.floor(Date.now() / 1000) + 60 * 60 * 60,
    //   },
    //   "Secret-Key"
    // );
    let token = jwt.sign(
      { userId: findUser._id },
      "This-is-a-Secret-Key-for-Login(!@#$%^&*(</>)))",
      {
        expiresIn: "24h", // 24 Hours.
      }
    );

    const userData = {
      userId: findUser._id,
      token: token,
    };
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
//                3. API - GET /user/:userId/profile
//-------------------------------------------------------------------------

// ONLY Authentication?????
// - Allow an user to fetch details of their profile.
//- Make sure that userId in url param and in token is same.

const getUserById = async (req, res) => {
  try {
    const userIdParams = req.params.userId.trim();
    if (!isValidObjectId(userIdParams)) {
      return res.status(400).send({
        status: false,
        message: `<userId> in Params: <${userIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    const findUser = await userModel.findById(userIdParams);
    if (!findUser) {
      return res
        .status(404)
        .send({ status: false, message: "User NOT Found." });
    }

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
    let body = req.body;
    const file = req.files;

    if (!isValidRequestBody(body) && !file.length) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }
    const userExist = await userModel.findById(userIdParams);
    // Check if USER present in Database.
    if (!userExist) {
      return res.status(404).send({
        status: false,
        message: `User with ID <${userIdParams}> NOT Found.`,
      });
    }

    const { fname, lname, email, phone, password, address } = body;

    // Validations.
    //<fname> Validation.
    if (fname) {
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
    if (lname) {
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

    // email Validation.
    if (email) {
      if (!isValid(email)) {
        return res.status(400).send({
          status: false,
          message: "Please provide <email>.",
        });
      }
      // Email Format.
      if (!isEmail(email)) {
        return res
          .status(400)
          .send({ status: false, message: "<email> Format Invalid." });
      }
      // Unique - email Validations (DB-Call).
      const emailAlreadyExist = await userModel.findOne({ email });
      if (emailAlreadyExist) {
        return res
          .status(409)
          .send({ status: false, message: "<email> already registered." });
      }
    }

    // <phone> Validation.
    if (phone) {
      if (!isValidPhone(phone)) {
        return res.status(400).send({
          status: false,
          message:
            "<phone> should be an Indian Number ONLY (start with <6,7,8 or 9> and 10-Digits).",
        });
      }
      // Unique - phone Validations (DB-Call).
      const phoneAlreadyExist = await userModel.findOne({ phone });
      if (phoneAlreadyExist) {
        return res
          .status(409)
          .send({ status: false, message: "<phone> already registered." });
      }
    }

    // Password Validation.
    if (password) {
      if (!isValidPassword(password)) {
        return res.status(400).send({
          status: false,
          message: "<password> must be between 8 and 15 characters.",
        });
      }
      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
    }

    // Address Validations.
    if (address) {
      if (!isValidRequestBody(address)) {
        return res.status(400).send({
          status: false,
          message: "<address> Object can not be empty.",
        });
      }

      const { shipping, billing } = address;
      let userDocument = await userModel.findById(userIdParams);

      // Shipping Address Validation.
      if (shipping) {
        if (!isValidRequestBody(shipping)) {
          return res.status(400).send({
            status: false,
            message: "<shipping> Object can not be empty.",
          });
        }

        const { street, city, pincode } = shipping;

        if (street) {
          if (!isValid(street)) {
            return res.status(400).send({
              status: false,
              message: "<street> can not be empty.",
            });
          }
          if (!isValidStreet(street)) {
            return res.status(400).send({
              status: false,
              message:
                "STREET can be Alphabets, Hyphen(-), Forward-slash(/), Comma(,), Fullstop(.), Parenthesis(), Numbers & White-space(s) ONLY.",
            });
          }
          userDocument.address.shipping.street = street;
        }
        if (city) {
          if (!isValid(city)) {
            return res.status(400).send({
              status: false,
              message: "<city> can not be empty.",
            });
          }
          if (!isValidCity(city)) {
            return res.status(400).send({
              status: false,
              message:
                "<city> can be Alphabets, Hyphen(-) & White-space(s) ONLY",
            });
          }
          userDocument.address.shipping.city = city;
        }
        if (pincode) {
          if (!isValidPincode(pincode)) {
            return res.status(400).send({
              status: false,
              message:
                "<pincode> must be an Indian Pincode (start with <1> and 6-Digits).",
            });
          }
          userDocument.address.shipping.pincode = pincode;
        }
      }

      // Billing Address Validation.
      if (billing) {
        if (!isValidRequestBody(billing)) {
          return res.status(400).send({
            status: false,
            message: "<billing> Object can not be empty.",
          });
        }

        const { street, city, pincode } = billing;

        if (street) {
          if (!isValid(street)) {
            return res.status(400).send({
              status: false,
              message: "<street> can not be empty.",
            });
          }
          if (!isValidStreet(street)) {
            return res.status(400).send({
              status: false,
              message:
                "STREET can be Alphabets, Hyphen(-), Forward-slash(/), Comma(,), Fullstop(.), Parenthesis(), Numbers & White-space(s) ONLY.",
            });
          }
          userDocument.address.billing.street = street;
        }
        if (city) {
          if (!isValid(city)) {
            return res.status(400).send({
              status: false,
              message: "<city> can not be empty.",
            });
          }
          if (!isValidCity(city)) {
            return res.status(400).send({
              status: false,
              message:
                "<city> can be Alphabets, Hyphen(-) & White-space(s) ONLY",
            });
          }
          userDocument.address.billing.city = city;
        }
        if (pincode) {
          if (!isValidPincode(pincode)) {
            return res.status(400).send({
              status: false,
              message:
                "<pincode> must be an Indian Pincode (start with <1> and 6-Digits).",
            });
          }
          userDocument.address.billing.pincode = pincode;
        }
      }
      body.address = userDocument.address;
    }

    // profileImage upload (if present).
    // const file = req.files;
    if (file && file.length > 0) {
      const profilePicURL = await uploadFile(file[0]);
      body.profileImage = profilePicURL;
    }

    // Update User.
    const updateUser = await userModel.findByIdAndUpdate(userIdParams, body, {
      new: true,
    });
    // // ERROR: If userId Not in Database.
    // if (!updateUser) {
    //   return res.status(404).send({
    //     status: false,
    //     message: `User with ID <${userIdParams}> NOT Found.`,
    //   });
    // }

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
