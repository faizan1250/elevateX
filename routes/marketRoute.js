import express from 'express';
import auth from '../middleware/auth.js';
import { addProduct, deleteProduct, getAllProduct, getAllProductUser, getAllSoldProductsUser, getProductById, markProductAsSold } from '../controllers/marketController.js';
import upload from '../config/multer.js';


const marketRouter = express.Router()

marketRouter.post('/addproduct',auth,upload.array("productImgs", 4),addProduct)
marketRouter.get('/allproduct',getAllProduct)
marketRouter.get('/alluserproduct',auth,getAllProductUser)
marketRouter.get('/product/:id',auth,getProductById)
marketRouter.get('/selledproduct',auth,getAllSoldProductsUser)
marketRouter.delete('/delete/:productId',auth,deleteProduct)
marketRouter.patch('/markproductasselled',auth,markProductAsSold)

export default marketRouter  ;