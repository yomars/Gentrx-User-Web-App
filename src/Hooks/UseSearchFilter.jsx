import { useState } from "react";

function useSearchFilter(initialData) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const filterData = () => {
    if (!searchTerm) {
      return initialData;
    }
    const keyword = searchTerm.toLowerCase();
    return initialData.filter((item) =>
      Object.values(item).some(
        (value) => value && value.toString().toLowerCase().includes(keyword)
      )
    );
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredData: filterData(),
    handleSearchChange,
  };
}

export default useSearchFilter;
