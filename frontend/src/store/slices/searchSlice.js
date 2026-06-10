import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  query: "",
  activeModule: "Mail", 
  isSearchTriggered: false,
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setSearchState: (state, action) => {
      // Expects { query: string, module: string, isTriggered: boolean }
      state.query = action.payload.query;
      state.activeModule = action.payload.module;
      state.isSearchTriggered = action.payload.isTriggered;
    },
    clearSearch: (state) => {
      state.query = "";
      state.isSearchTriggered = false;
    },
  },
});

export const { setSearchState, clearSearch } = searchSlice.actions;
export default searchSlice.reducer;