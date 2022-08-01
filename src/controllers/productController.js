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
  isValidTitle, // !!!!!!!!!!!!!!!!
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
    // const currencyId = "INR";     // USD also.????
    // const currencyFormat = "₹";   // $ also.????

    // <title> Validation.
    // <Title> of Product can be anything??????????? -- isValidTitle() Regex?
    if (!isValid(title)) {
      return res
        .status(400)
        .send({ status: false, message: "<title> is required." });
    }
    // // Check if <title> already present in Database --> BELOW.
    // const titleExist = await productModel.findOne({ title });
    // if (titleExist) {
    //   return res.status(400).send({
    //     status: false,
    //     message: `<title>: <${title}> already present in Database.`,
    //   });
    // }

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

    // Postman -- ["s","m"] && [m,l] - Error.
    // Form-Data - "M" - error :: M - works !!!!
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
    console.log(sizes);
    data["availableSizes"] = sizes;
    // data["availableSizes"] = { $all: sizes };

    // <style> Validation.
    if (style)
      if (!isValid(style)) {
        // <style> Not Mandatory??
        return res
          .status(400)
          .send({ status: false, message: "<style> is invalid." });
      }

    // <installments> Validation. !!!!!!!!!!!! Max number =[1,99].?? ~~~~~~~~~
    if (installments)
      if (!isValidInstallment(installments)) {
        // <installments> Not Mandatory??
        return res.status(400).send({
          status: false,
          message: "<installments> can be a Number between 1-99 only.",
        });
      }

    // <isFreeShipping> Validation.
    if (isFreeShipping)
      if (isFreeShipping != "true" && isFreeShipping != "false") {
        // if (typeof isFreeShipping != "boolean") {
        console.log(typeof isFreeShipping);

        return res.status(400).send({
          status: false,
          message: "<isFreeShipping> must be either <true> OR <false>.",
        });
      }

    // const currencyFormat = "INR";     // USD also.????
    if (currencyFormat && currencyFormat != "INR" && currencyFormat != "USD") {
      return res.status(400).send({
        status: false,
        message: "<currencyFormat> must be either <INR> OR <USD>.",
      });
    }

    // const currencyFormat = "₹";   // $ also.????
    if (currencyId && currencyId != "$" && currencyId != "₹") {
      return res.status(400).send({
        status: false,
        message: "<currencyId> must be either <₹> OR <$>.",
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
    // Error: If <productImage> not in Request Body (form-data).
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
      message: "Product created successfully.",
      data: createProduct,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------------------------------------------------
//                        2. API - GET /products
//        (Returns all products in the collection that aren't deleted.)
//-------------------------------------------------------------------------

const getProducts = async (req, res) => {
  // ERRORS:
  // 1. All Queries(LHS) - Key-present but empty-value(RHS) => Fetching all products.
  // 2. size.toUpperCase() => flexibility.
  // 3. multiple size in Query.
  try {
    console.log("\n getProducts API.");

    const filterQuery = { isDeleted: false };

    let { size, name, priceGreaterThan, priceLessThan, priceSort } = req.query;

    //- **Filters**
    //- Size (The key for this filter will be 'size').
    if (size) {
      //@@@@@@@@@@@@@@@
      if (!isValid(size)) {
        // Not Working??????????
        return res
          .status(400)
          .send({ status: false, message: "Provide size." });
      }

      // Postman -- ["s","m"] - Error.
      let invalidSizes = [];
      const availSizes = size.split(",").map((s) => {
        // s.trim().toUpperCase();
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
    if (name) {
      // if (!isValidTitle(name)) {
      //   return res.status(400).send({
      //     status: false,
      //     message: `<name>-Params should be Alphabets & Whitespace's Only.`,
      //   });
      // }
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
    if (priceGreaterThan && !isValid(priceGreaterThan))
      return res
        .status(400)
        .send({ status: false, message: "Provide <priceGreaterThan>." });

    if (priceLessThan && !isValid(priceLessThan))
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
    //~~~~~~~~~~~~~~ ? name = Nit %20 grit
    if (priceSort) {
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
        return res.status(200).send({
          status: true,
          message: "Fetched Products in Ascending Order of Price.",
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
        return res.status(200).send({
          status: true,
          message: "Fetched Products in Descending Order of Price.",
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
        .status(404) // Required?????
        .send({ status: false, message: "No products found." });
    }
    return res.status(200).send({
      status: true,
      message: "Fetched Products Successfully.",
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
    //~~~~~~~~~~ Generic-message.
    // const findProduct = await productModel.findOne({
    //   _id: productIdParams,
    //   isDeleted: false,
    // });
    // if (!findProduct) {
    //   return res.status(404).send({
    //     status: false,
    //     message: `PRODUCT with ID: <${productIdParams}> NOT Found in Database( OR already deleted).`,
    //   });
    // }

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
      message: "Fetched Product by ID.",
      data: findProduct,
    });
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

    if (!isValidRequestBody(data) && !files.length) {
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
    // const currencyId = "INR";     // USD also.????
    // const currencyFormat = "₹";   // $ also.????

    // <title> Validation.
    if (title) {
      if (!isValid(title)) {
        return res
          .status(400)
          .send({ status: false, message: "<title> is required." });
      }
    }

    // <description> Validation.
    if (description) {
      if (!isValid(description)) {
        return res
          .status(400)
          .send({ status: false, message: "<description> is required." });
      }
    }

    // <price> Validation.
    if (price) {
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
    if (availableSizes) {
      if (!isValid(availableSizes)) {
        return res
          .status(400)
          .send({ status: false, message: "<availableSizes> is required." });
      }

      // Postman -- ["s","m"] && [m,l] - Error.
      // Form-Data - "M" - error :: M - works !!!!
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
      // data["availableSizes"] = { $all: sizes }; // Check!!!!!!!
    }

    // <style> Validation.
    if (style)
      if (!isValid(style)) {
        // <style> Not Mandatory??
        return res
          .status(400)
          .send({ status: false, message: "<style> is invalid." });
      }

    // <installments> Validation. !!!!!!!!!!!! Max number =[1,99].?? ~~~~~~~~~
    if (installments)
      if (!isValidInstallment(installments)) {
        return res.status(400).send({
          status: false,
          message: "<installments> can be a Number between 1-99 only.",
        });
      }

    // <isFreeShipping> Validation.
    if (isFreeShipping)
      if (isFreeShipping != "true" && isFreeShipping != "false") {
        return res.status(400).send({
          status: false,
          message: "<isFreeShipping> must be either <true> OR <false>.",
        });
      }

    // const currencyFormat = "INR";     // USD also.????
    if (currencyFormat && currencyFormat != "INR" && currencyFormat != "USD") {
      return res.status(400).send({
        status: false,
        message: "<currencyFormat> must be either <INR> OR <USD>.",
      });
    }

    // const currencyFormat = "₹";   // $ also.????
    if (currencyId && currencyId != "$" && currencyId != "₹") {
      return res.status(400).send({
        status: false,
        message: "<currencyId> must be either <₹> OR <$>.",
      });
    }

    // Check if <title> already present in Database.
    if (title) {
      const titleExist = await productModel.findOne({ title });
      if (titleExist) {
        return res.status(400).send({
          status: false,
          message: `<title>: <${title}> already present in Database.`,
        });
      }
    }

    // <file> Upload.
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

    // Update.
    const updateProduct = await productModel.findOneAndUpdate(
      { _id: productIdParams, isDeleted: false },
      data,
      { new: true }
    );
    // if (!updateProduct) {
    //   return res.status(404).send({
    //     status: false,
    //     message: `No Such PRODUCT with ID: <${productIdParams}> exist in Database(OR already deleted).`,
    //   });
    // }

    //- **Response format**
    //- **On success** - Return HTTP status 200. Also return the updated product document.
    //- **On error** - Return a suitable error message with a valid HTTP status code.
    return res.status(200).send({
      status: true,
      message: "Product Updated.",
      data: updateProduct,
    });
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
