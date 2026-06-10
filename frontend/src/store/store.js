import { configureStore } from "@reduxjs/toolkit";
import { statusApi } from "./rtkapi/statusApi";
import statusReducer from "./slices/statusSlice";
import searchReducer from "./slices/searchSlice"; // Add this import

export const store = configureStore({
  reducer: {
    [statusApi.reducerPath]: statusApi.reducer,
    status: statusReducer,
    search: searchReducer, // Register the search slice here
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(statusApi.middleware),
});