const productModel = require("../models/productModel");
const { uploadFile } = require("../util/aws");

const {
  isValid,
  isValidObjectId,
  isValidRequestBody,
  isValidSize,
  isValidPrice,
  isValidInstallment,
  isValidImage,
} = require("../util/validator");

//-------------------------------------------------------------------------
//                        1. API - POST /products
//              (Create a product document from request body.)
//-------------------------------------------------------------------------

const createProduct = async (req, res) => {
  try {
    console.log("\n Create Product API.");

    let data = req.body;

    if (!isValidRequestBody(data)) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body Empty." });
    }

    // Destructuring Request-Body.
    let {
      title,
      description,
      price,
      availableSizes,
      style,
      installments,
      isFreeShipping,
      currencyId,
      currencyFormat,
    } = data;

    // <Title> of Product can be any Characters but must be Unique.
    if (!isValid(title)) {
      return res
        .status(400)
        .send({ status: false, message: "<title> is required." });
    }

    // <description> Validation.
    if (!isValid(description)) {
      return res
        .status(400)
        .send({ status: false, message: "<description> is required." });
    }

    // <price> Validation.
    if (!isValid(price)) {
      return res
        .status(400)
        .send({ status: false, message: "<price> is required." });
    }
    if (!isValidPrice(price)) {
      return res.status(400).send({
        status: false,
        message:
          "<price> should be Numbers only: max- 8-digits-Integers. NOT Start with <0>. And IF decimal, then 2-digit dicimal only.",
      });
    }

    // <availableSizes> Validation.
    if (!isValid(availableSizes)) {
      return res
        .status(400)
        .send({ status: false, message: "<availableSizes> is required." });
    }
    let invalidSizes = [];
    let sizes = availableSizes.split(",").map((s) => {
      if (!isValidSize(s.trim().toUpperCase())) {
        invalidSizes.push(s);
      }
      return s.trim().toUpperCase();
    });
    if (invalidSizes.length) {
      return res.status(400).send({
        status: false,
        message: `Invalid <availableSizes>: <${invalidSizes}>. Should be among ${[
          "S",
          "XS",
          "M",
          "X",
          "L",
          "XXL",
          "XL",
        ]}.`,
      });
    }
    sizes = [...new Set(sizes)]; // Only Unique <sizes>.
    data["availableSizes"] = sizes;

    // <style> Not Mandatory.
    if (style)
      if (!isValid(style)) {
        return res
          .status(400)
          .send({ status: false, message: "<style> is invalid." });
      }

    // <installments> Not Mandatory.
    if (installments)
      if (!isValidInstallment(installments)) {
        return res.status(400).send({
          status: false,
          message: "<installments> can be a Number between 1-99 only.",
        });
      }

    // <isFreeShipping> default(false) Validation.
    if (isFreeShipping)
      if (isFreeShipping != "true" && isFreeShipping != "false") {
        return res.status(400).send({
          status: false,
          message: "<isFreeShipping> must be either <true> OR <false>.",
        });
      }

    // <currencyId>(Mandatory).
    if (!isValid(currencyId)) {
      return res
        .status(400)
        .send({ status: false, message: "<currencyId> is required." });
    }
    //<currencyFormat>(Mandatory).
    if (!isValid(currencyFormat)) {
      return res
        .status(400)
        .send({ status: false, message: "<currencyFormat> is required." });
    }

    // <currencyFormat> - Validations.
    if (currencyFormat != "₹" && currencyFormat != "$") {
      return res.status(400).send({
        status: false,
        message: "<currencyFormat> must be either <₹> OR <$>.",
      });
    }
    if (currencyFormat == "₹" && currencyId != "INR") {
      return res.status(400).send({
        status: false,
        message:
          "If <currencyFormat> is <₹> then <currencyId> must be <INR> only.",
      });
    }
    if (currencyFormat == "$" && currencyId != "USD") {
      return res.status(400).send({
        status: false,
        message:
          "If <currencyFormat> is <$> then <currencyId> must be <USD> only.",
      });
    }

    // <currencyId> - Validations.
    if (currencyId != "INR" && currencyId != "USD") {
      return res.status(400).send({
        status: false,
        message: "<currencyId> must be either <INR> OR <USD>.",
      });
    }
    if (currencyId == "INR" && currencyFormat != "₹") {
      return res.status(400).send({
        status: false,
        message:
          "If <currencyId> is <INR> then <currencyFormat> must be <₹> only.",
      });
    }
    if (currencyId && currencyId == "USD" && currencyFormat != "$") {
      return res.status(400).send({
        status: false,
        message:
          "If <currencyId> is <USD> then <currencyFormat> must be <$> only.",
      });
    }

    // Check if <title> already present in Database.
    const titleExist = await productModel.findOne({ title });
    if (titleExist) {
      return res.status(400).send({
        status: false,
        message: `<title>: <${title}> already present in Database.`,
      });
    }

    // <file> Upload.
    const files = req.files;
    if (files && files.length > 0) {
      // File should be images (jpeg/jpg/png) only.
      if (!isValidImage(files[0].mimetype)) {
        return res.status(400).send({
          status: false,
          message: "Only images can be uploaded (jpeg/jpg/png).",
        });
      }
      //upload to s3 and get the uploaded link.
      let uploadedFileURL = await uploadFile(files[0]);
      data.productImage = uploadedFileURL;
    }
    // Send error: If <productImage> not given in Request Body(form-data).
    else {
      return res.status(400).send({
        message: "<productImage> File is required.",
      });
    }

    //- **Response format**
    //- **On success** - Return HTTP status 201. Also return the product document.
    //- **On error** - Return a suitable error message with a valid HTTP status code.
    const createProduct = await productModel.create(data);
    return res.status(201).send({
      status: true,
      message: "Success",
      data: createProduct,
    });
    // message: "Product created successfully.",
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//                        2. API - GET /products
//        (Returns all products in the collection that aren't deleted.)
//-------------------------------------------------------------------------

const getProducts = async (req, res) => {
  try {
    console.log("\n getProducts API.");

    const filterQuery = { isDeleted: false };

    let { size, name, priceGreaterThan, priceLessThan, priceSort } = req.query;

    //- **Filters**
    //- Size (The key for this filter will be 'size').
    if (typeof size != "undefined") {
      if (!isValid(size)) {
        return res
          .status(400)
          .send({ status: false, message: "Provide size." });
      }
      let invalidSizes = [];
      const availSizes = size.split(",").map((s) => {
        if (!isValidSize(s.trim().toUpperCase())) {
          invalidSizes.push(s);
        }
        return s.trim().toUpperCase();
      });
      if (invalidSizes.length) {
        return res.status(400).send({
          status: false,
          message: `Invalid <size>: <${invalidSizes}>. Should be among ${[
            "S",
            "XS",
            "M",
            "X",
            "L",
            "XXL",
            "XL",
          ]}.`,
        });
      }
      filterQuery["availableSizes"] = { $all: availSizes };
    }

    //- Product name (The key for this filter will be 'name'). You should return all the products with name containing the <substring> recieved in this filter.
    if (typeof name != "undefined") {
      if (!isValid(name)) {
        return res.status(400).send({
          status: false,
          message: `<name> is required.`,
        });
      }
      filterQuery["title"] = { $regex: ".*" + name + ".*", $options: "$i" };
    }

    //- Price : greater than or less than a specific value. The keys are 'priceGreaterThan' and 'priceLessThan'.

    // **_NOTE:_** For price filter request could contain both or any one of the keys. For example the query in the request could look like { priceGreaterThan: 500, priceLessThan: 2000 } or just { priceLessThan: 1000 } ).
    if (typeof priceGreaterThan != "undefined" && !isValid(priceGreaterThan))
      return res
        .status(400)
        .send({ status: false, message: "Provide <priceGreaterThan>." });

    if (typeof priceLessThan != "undefined" && !isValid(priceLessThan))
      return res
        .status(400)
        .send({ status: false, message: "Provide <priceLessThan>." });

    if (priceGreaterThan && priceLessThan) {
      filterQuery["price"] = { $gte: priceGreaterThan, $lte: priceLessThan };
    } else if (priceGreaterThan) {
      filterQuery["price"] = { $gte: priceGreaterThan };
    } else if (priceLessThan) {
      filterQuery["price"] = { $lte: priceLessThan };
    }

    //- **Sort**
    //-Sorted by product price in ascending or descending. The key value pair will look like {priceSort : 1} or {priceSort : -1}
    // _eg_ /products?size=XL&name=Nit%20grit
    if (typeof priceSort != "undefined") {
      if (priceSort != "1" && priceSort != "-1") {
        return res.status(400).send({
          status: false,
          message:
            "Please provide <priceSort>: <1> for Ascending OR <-1> for Descending Order Sorting of Price.",
        });
      }
      if (priceSort == 1) {
        const documents = await productModel
          .find(filterQuery)
          .sort({ price: 1 });
        if (!documents.length)
          return res
            .status(404)
            .send({ status: false, message: "No products found." });
        // message: "Fetched Products in Ascending Order of Price.",
        return res.status(200).send({
          status: true,
          message: "Success",
          data: documents,
        });
      }

      if (priceSort == -1) {
        const documents = await productModel
          .find(filterQuery)
          .sort({ price: -1 });
        if (!documents.length)
          return res
            .status(404)
            .send({ status: false, message: "No products found." });
        // message: "Fetched Products in Descending Order of Price.",
        return res.status(200).send({
          status: true,
          message: "Success",
          data: documents,
        });
      }
    }

    //- **Response format**
    //- **On success** - Return HTTP status 200. Also return the product documents.
    const documents = await productModel.find(filterQuery);
    //- **On error** - Return a suitable error message with a valid HTTP status code.
    if (!documents.length) {
      return res
        .status(404)
        .send({ status: false, message: "No products found." });
    }
    // message: "Fetched Products Successfully.",
    return res.status(200).send({
      status: true,
      message: "Success",
      data: documents,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//                        3. API - GET /products/:productId
//                     (Returns product details by product id)
//-------------------------------------------------------------------------

const getProductById = async (req, res) => {
  try {
    console.log("\n getProductById API.");

    const productIdParams = req.params.productId;
    if (!isValidObjectId(productIdParams)) {
      return res.status(400).send({
        status: false,
        message: `<productId> in Params: <${productIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    // Specific-message.
    const findProduct = await productModel.findById(productIdParams);
    if (!findProduct) {
      return res.status(404).send({
        status: false,
        message: `No Such PRODUCT with ID: <${productIdParams}> exist in Database.`,
      });
    }
    if (findProduct.isDeleted === true) {
      return res.status(404).send({
        status: false,
        message: `PRODUCT with ID: <${productIdParams}> already deleted.`,
      });
    }

    //- **On success** - Return HTTP status 200. Also return the product documents.
    return res.status(200).send({
      status: true,
      message: "Success",
      data: findProduct,
    });
    // message: "Fetched Product by ID.",
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//                        4. API - PUT /products/:productId
//             (Updates a product by changing at least one or all fields.)
//-------------------------------------------------------------------------

const updateProductById = async (req, res) => {
  try {
    console.log("\n updateProductById API.");

    const productIdParams = req.params.productId;
    if (!isValidObjectId(productIdParams)) {
      return res.status(400).send({
        status: false,
        message: `<productId> in Params: <${productIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    //- Check if the productId exists (must have isDeleted false and is present in collection). If it doesn't, return an HTTP status 404 with a response body.
    const productExist = await productModel.findOne({
      _id: productIdParams,
      isDeleted: false,
    });
    if (!productExist) {
      return res.status(404).send({
        status: false,
        message: `No Such PRODUCT with ID: <${productIdParams}> exist in Database(OR already deleted).`,
      });
    }

    let data = req.body;
    const files = req.files;

    if (!isValidRequestBody(data)) {
      if (!files) {
        return res
          .status(400)
          .send({ status: false, message: "Request Body Empty." });
      }
      if (files && typeof files[0] == "undefined") {
        return res.status(400).send({
          status: false,
          message: "Please provide Image-file to upload.",
        });
      }
    }

    // Destructuring Request-Body.
    let {
      title,
      description,
      price,
      availableSizes,
      style,
      installments,
      isFreeShipping,
      currencyId,
      currencyFormat,
    } = data;

    // <title> Validation.
    if (typeof title != "undefined") {
      if (!isValid(title)) {
        return res
          .status(400)
          .send({ status: false, message: "<title> is required." });
      }
    }

    // <description> Validation.
    if (typeof description != "undefined") {
      if (!isValid(description)) {
        return res
          .status(400)
          .send({ status: false, message: "<description> is required." });
      }
    }

    // <price> Validation.
    if (typeof price != "undefined") {
      if (!isValid(price)) {
        return res
          .status(400)
          .send({ status: false, message: "<price> is required." });
      }
      if (!isValidPrice(price)) {
        return res.status(400).send({
          status: false,
          message:
            "<price> should be Numbers only: max- 8-digits-Integers. NOT Start with <0>. And IF decimal, then 2-digit dicimal only.",
        });
      }
    }

    // <availableSizes> Validation.
    if (typeof availableSizes != "undefined") {
      if (!isValid(availableSizes)) {
        return res
          .status(400)
          .send({ status: false, message: "<availableSizes> is required." });
      }
      let invalidSizes = [];
      let sizes = availableSizes.split(",").map((s) => {
        if (!isValidSize(s.trim().toUpperCase())) {
          invalidSizes.push(s);
        }
        return s.trim().toUpperCase();
      });
      if (invalidSizes.length) {
        return res.status(400).send({
          status: false,
          message: `Invalid <availableSizes>: <${invalidSizes}>. Should be among ${[
            "S",
            "XS",
            "M",
            "X",
            "L",
            "XXL",
            "XL",
          ]}.`,
        });
      }
      sizes = [...new Set(sizes)]; // Only Unique <sizes>.
      data["availableSizes"] = sizes;
    }

    // <style> Validation.
    if (typeof style != "undefined")
      if (!isValid(style)) {
        return res
          .status(400)
          .send({ status: false, message: "<style> is invalid." });
      }

    // <installments> Validation.
    if (typeof installments != "undefined")
      if (!isValidInstallment(installments)) {
        return res.status(400).send({
          status: false,
          message: "<installments> can be a Number between 1-99 only.",
        });
      }

    // <isFreeShipping> Validation.
    if (typeof isFreeShipping != "undefined")
      if (isFreeShipping != "true" && isFreeShipping != "false") {
        return res.status(400).send({
          status: false,
          message: "<isFreeShipping> must be either <true> OR <false>.",
        });
      }

    // <currencyFormat>- Validations.
    if (
      typeof currencyFormat != "undefined" &&
      currencyFormat != "₹" &&
      currencyFormat != "$"
    ) {
      return res.status(400).send({
        status: false,
        message: "<currencyFormat> must be either <₹> OR <$>.",
      });
    }
    if (typeof currencyFormat != "undefined" && currencyFormat == "₹") {
      if (typeof currencyId != "undefined") {
        if (currencyId != "INR") {
          return res.status(400).send({
            status: false,
            message:
              "If <currencyFormat> is <₹> then <currencyId> must be <INR> only.",
          });
        }
      } else {
        data.currencyId = "INR";
      }
    }
    if (typeof currencyFormat != "undefined" && currencyFormat == "$") {
      if (typeof currencyId != "undefined") {
        if (currencyId != "USD") {
          return res.status(400).send({
            status: false,
            message:
              "If <currencyFormat> is <$> then <currencyId> must be <USD> only.",
          });
        }
      } else {
        data.currencyId = "USD";
      }
    }

    // <currencyId> - Validations.
    if (
      typeof currencyId != "undefined" &&
      currencyId != "INR" &&
      currencyId != "USD"
    ) {
      return res.status(400).send({
        status: false,
        message: "<currencyId> must be either <INR> OR <USD>.",
      });
    }
    if (typeof currencyId != "undefined" && currencyId == "INR") {
      if (typeof currencyFormat != "undefined") {
        if (currencyFormat != "₹") {
          return res.status(400).send({
            status: false,
            message:
              "If <currencyId> is <INR> then <currencyFormat> must be <₹> only.",
          });
        }
      } else {
        data.currencyFormat = "₹";
      }
    }
    if (typeof currencyId != "undefined" && currencyId == "USD") {
      if (typeof currencyFormat != "undefined") {
        if (currencyFormat != "$") {
          return res.status(400).send({
            status: false,
            message:
              "If <currencyId> is <USD> then <currencyFormat> must be <$> only.",
          });
        }
      } else {
        data.currencyFormat = "$";
      }
    }

    // Check if <title> is already present in Database.
    if (title) {
      const titleExist = await productModel.findOne({ title });
      if (titleExist) {
        return res.status(400).send({
          status: false,
          message: `<title>: <${title}> already present in Database.`,
        });
      }
    }

    // Image-file Upload if present.
    if (files && files.length > 0) {
      if (!isValidImage(files[0].mimetype)) {
        return res.status(400).send({
          status: false,
          message: "Only images can be uploaded (jpeg/jpg/png).",
        });
      }
      //upload to s3 and get the uploaded link.
      let uploadedFileURL = await uploadFile(files[0]);
      data.productImage = uploadedFileURL;
    }

    // Update the Product-document.
    const updateProduct = await productModel.findOneAndUpdate(
      { _id: productIdParams, isDeleted: false },
      data,
      { new: true }
    );

    //- **Response format**
    //- **On success** - Return HTTP status 200. Also return the updated product document.
    //- **On error** - Return a suitable error message with a valid HTTP status code.
    return res.status(200).send({
      status: true,
      message: "Success",
      data: updateProduct,
    });
    // message: "Product Updated.",
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//                  5. API - DELETE /products/:productId
//        (Deletes a product by product id if it's not already deleted.)
//-------------------------------------------------------------------------

const deleteProductById = async (req, res) => {
  try {
    console.log("\n deleteProductById API.");

    const productIdParams = req.params.productId;
    if (!isValidObjectId(productIdParams)) {
      return res.status(400).send({
        status: false,
        message: `<productId> in Params: <${productIdParams}> NOT a Valid Mongoose Object ID.`,
      });
    }

    // Delete Product.
    const deleteProduct = await productModel.findOneAndDelete({
      _id: productIdParams,
      isDeleted: false,
    });
    if (!deleteProduct) {
      return res.status(404).send({
        status: false,
        message: `No Such PRODUCT with ID: <${productIdParams}> exist in Database(OR already deleted).`,
      });
    }

    //- **On success** - Return HTTP status 200.
    return res.status(200).send({
      status: true,
      message: "Deleted Product by ID.",
      data: deleteProduct,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProductById,
  deleteProductById,
};
