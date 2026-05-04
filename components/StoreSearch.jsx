"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchIcon, XIcon, StoreIcon } from "lucide-react";
import { dummyStoreData } from "@/assets/assets";

const StoreSearch = ({ selectedStore, onSelectStore, className = "" }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock fetch stores - in real app, this would be an API call
  const fetchStores = useCallback(async (searchQuery) => {
    setLoading(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // In a real app, you would fetch from API: `/api/stores?q=${searchQuery}`
    // For now, use dummy data and filter
    const mockStores = [
      dummyStoreData,
      {
        ...dummyStoreData,
        id: "store_2",
        name: "Tasty Home",
        username: "tastyhome",
        description: "Homemade cookies and pastries",
      },
      {
        ...dummyStoreData,
        id: "store_3",
        name: "Teeba",
        username: "teeba",
        description: "Ceramic dinner sets and home decor",
      },
    ];

    const filtered = mockStores.filter(
      (store) =>
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSuggestions(filtered);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (query.trim().length > 1) {
      fetchStores(query);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query, fetchStores]);

  const handleSelect = (store) => {
    onSelectStore(store);
    setQuery(store.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelectStore(null);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block mb-2 font-medium text-slate-700">
        Select Store (for private requests)
      </label>
      <div className="relative">
        <div className="flex items-center border border-slate-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#2582eb] transition-all">
          <SearchIcon className="ml-3 text-slate-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stores by name or username..."
            className="w-full p-3 outline-none bg-transparent"
            onFocus={() => query.length > 1 && setIsOpen(true)}
          />
          {selectedStore && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 mr-2 text-slate-400 hover:text-slate-600"
              aria-label="Clear selection"
            >
              <XIcon size={18} />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">Loading...</div>
            ) : suggestions.length > 0 ? (
              suggestions.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => handleSelect(store)}
                  className={`w-full text-left p-3 hover:bg-slate-50 flex items-center gap-3 ${selectedStore?.id === store.id ? "bg-blue-50" : ""}`}
                >
                  <StoreIcon size={18} className="text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-800">{store.name}</p>
                    <p className="text-sm text-slate-500">@{store.username}</p>
                    <p className="text-xs text-slate-400 truncate">{store.description}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">
                {query.length > 1 ? "No stores found" : "Type to search stores"}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedStore && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StoreIcon size={20} className="text-blue-500" />
              <div>
                <p className="font-medium text-blue-800">{selectedStore.name}</p>
                <p className="text-sm text-blue-600">@{selectedStore.username}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSearch;