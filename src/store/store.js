import { configureStore } from "@reduxjs/toolkit";
import bankomatsSlice from "../entities/bankomatsSlice/bankomatSlice";
import checkoutSlice from "../entities/checkoutSlice/checkoutSlice";

export const store = configureStore({
    reducer:{
        bankomats:bankomatsSlice,
        checkout: checkoutSlice
    }

})