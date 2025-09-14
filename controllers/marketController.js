import MarketPlace from "../models/MarketPlace.js";


// Add Product Controller
export const addProduct = async (req, res) => {
  try {
    const {
      productName,
      productPrice,
      productDesc,
      category,
      condition,
      location,
      quantity,
    } = req.body;

    // ✅ multiple images from multer
 const productImgs = req.files.map(file =>
  `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
);


    const newProduct = new MarketPlace({
      userId: req.user.id,
      productImgs,
      productName,
      productPrice,
      productDesc,
      category,
      condition,
      location,
      quantity,
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("❌ Add product error:", error);
    res.status(500).json({ message: error.message });
  }
};



// All  available  product which  are available in market
export const getAllProduct = async (req, res) => {
  try {
    const products = await MarketPlace.find({ selled: false })
      .populate("userId", "username email")   
      .sort({ createdAt: -1 });               

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching products",
      error: error.message,
    });
  }
};

//All  product  posted  by user
  export const getAllProductUser = async (req, res) => {
    try {
      const userId = req.user.id;
      const products = await MarketPlace.find({ userId })
        .populate("buyerId", "username email") 
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: products.length,
        products,
      });
    } catch (error) {
      console.error("Error fetching user's products:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching user's products",
        error: error.message,
      });
    }
  };

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;      
    const userId = req.user.id;           

    // Find product
    const product = await MarketPlace.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check ownership (only creator can delete)
    // if (product.userId.toString() !== userId.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Not authorized to delete this product",
    //   });
    // }

    await MarketPlace.findByIdAndDelete(productId);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting product",
      error: error.message,
    });
  }
};

// mark  product  as sold
export const markProductAsSold = async (req, res) => {
  try {
    const { productId } = req.params;    // product ID from route
    const { buyerId } = req.body;        // optional buyer ID
    const userId = req.user._id;         // logged-in seller

    // Find the product
    const product = await MarketPlace.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Only product creator can mark as sold
    if (product.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to mark this product as sold",
      });
    }

    // Update product
    product.selled = true;
    product.buyerId = buyerId || null;   

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product marked as sold successfully",
      product,
    });
  } catch (error) {
    console.error("Error marking product as sold:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while marking product as sold",
      error: error.message,
    });
  }
};

// Get all sold products of logged-in user
export const getAllSoldProductsUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const products = await MarketPlace.find({ userId, selled: true })
      .populate("buyerId", "username email") // show buyer details
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error fetching sold products:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching sold products",
      error: error.message,
    });
  }
};

// Detail of product
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params; // product id from route

    const product = await MarketPlace.findById(id)
      .populate("userId", "username email")   // seller details
      .populate("buyerId", "username email"); // buyer details if sold

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error fetching product detail:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching product detail",
      error: error.message,
    });
  }
};
