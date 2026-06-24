"use client";

import { useState, useEffect } from "react";
import { SearchIcon, XIcon, StoreIcon } from "lucide-react";
import { searchStores } from "@/lib/api/products";
import { useTranslate } from '@/lib/i18n/LocaleContext';

/**
 * Store picker used by the custom-request form. Backed by the dedicated GET /stores/search
 * endpoint (approved sellers, by store name or @username) — so it finds the right seller directly
 * (even one with no listings yet) instead of the old trick of deduping stores out of a product
 * search. Debounced so it doesn't fire a request per keystroke.
 */
const StoreSearch = ({ selectedStore, onSelectStore, className = "" }) => {
  const t = useTranslate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length <= 1) {
      setSuggestions([]);
      setIsOpen(false);
      return undefined;
    }
    let alive = true;
    setIsOpen(true);
    setLoading(true);
    const handle = setTimeout(() => {
      searchStores(query.trim(), 20)
        .then((stores) => { if (alive) setSuggestions(stores); })
        .catch(() => { if (alive) setSuggestions([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 350);
    return () => { alive = false; clearTimeout(handle); };
  }, [query]);

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
        {t('storeSearch.selectStore')}
      </label>
      <div className="relative">
        <div className="flex items-center border border-slate-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#2582eb] transition-all">
          <SearchIcon className="ml-3 text-slate-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('storeSearch.searchPlaceholder')}
            className="w-full p-3 outline-none bg-transparent"
            onFocus={() => query.length > 1 && setIsOpen(true)}
          />
          {selectedStore && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 mr-2 text-slate-400 hover:text-slate-600"
              aria-label={t('storeSearch.clearSelection')}
            >
              <XIcon size={18} />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">{t('storeSearch.loading')}</div>
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
                    {store.username && <p className="text-sm text-slate-500">@{store.username}</p>}
                    {store.description && <p className="text-xs text-slate-400 truncate">{store.description}</p>}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">
                {query.length > 1 ? t('storeSearch.noStoresFound') : t('storeSearch.typeToSearch')}
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
                {selectedStore.username && <p className="text-sm text-blue-600">@{selectedStore.username}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              {t('storeSearch.change')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSearch;
